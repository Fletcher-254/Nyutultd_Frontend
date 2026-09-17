"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Truck,
  Fuel,
  CircleDollarSign,
  Store,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock3,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured.");
}

type Role = "admin" | "manager" | "director";

interface Me {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: Role;
}

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  employment_type: string;
  daily_wage: string | number;
}

interface AttendanceRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_id_display: string;
  date: string;
  time?: string;
  is_present: boolean;
}

interface Module {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const modules: Module[] = [
  { label: "Employees", href: "/manager/employees", icon: Users },
  { label: "Attendance", href: "/manager/attendance", icon: CalendarCheck },
  { label: "Daily Wages", href: "/manager/daily-wages", icon: CircleDollarSign },
  { label: "Vehicles", href: "/manager/vehicles", icon: Truck },
  { label: "Fuel", href: "/manager/fuel", icon: Fuel },
  { label: "Vendors", href: "/manager/vendors", icon: Store },
];

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function formatDate(dateString: string) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(time?: string) {
  if (!time) return "—";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const hours = Number(parts[0]);
  const minutes = parts[1];
  if (Number.isNaN(hours)) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getStatusBadge(status: string) {
  const statusMap: Record<
    string,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    present: {
      color: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      icon: <UserCheck className="h-3.5 w-3.5" />,
      label: "Present",
    },
    absent: {
      color: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      icon: <UserX className="h-3.5 w-3.5" />,
      label: "Absent",
    },
    unmarked: {
      color: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
      icon: <Clock3 className="h-3.5 w-3.5" />,
      label: "Unmarked",
    },
  };

  const config = statusMap[status] || statusMap.unmarked;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export default function ManagerAttendancePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "absent" | "unmarked"
  >("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const navigate = (href: string) => {
    setMobileOpen(false);
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === "/manager/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const authenticatedFetch = useCallback(
    async (endpoint: string) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        router.replace("/");
        throw new Error("Your session has expired.");
      }

      if (!response.ok) {
        let message = `Request failed with status ${response.status}.`;
        try {
          const data = await response.json();
          if (typeof data?.detail === "string") message = data.detail;
          else if (typeof data?.error === "string") message = data.error;
        } catch {
          // Keep default message.
        }
        throw new Error(message);
      }

      return response.json();
    },
    [router]
  );

  const loadAttendance = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const [meData, employeesData, attendanceData] = await Promise.all([
          authenticatedFetch("/me/"),
          authenticatedFetch("/employees/list/"),
          authenticatedFetch("/attendance/today/"),
        ]);

        if (meData.role === "admin") {
          router.replace("/admin/dashboard");
          return;
        }
        if (meData.role === "director") {
          router.replace("/director/dashboard");
          return;
        }
        if (meData.role !== "manager") {
          router.replace("/");
          return;
        }

        setMe(meData);
        setEmployees(extractArray<Employee>(employeesData));
        setAttendance(extractArray<AttendanceRecord>(attendanceData));
      } catch (err) {
        if (err instanceof Error && err.message) setError(err.message);
        else setError("Unable to load attendance.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authenticatedFetch, router]
  );

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const attendanceByEmployee = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();
    attendance.forEach((record) => map.set(record.employee, record));
    return map;
  }, [attendance]);

  const rows = useMemo(() => {
    return employees.map((employee) => {
      const record = attendanceByEmployee.get(employee.id);
      return {
        employee,
        record: record ?? null,
        status: record
          ? record.is_present
            ? "present"
            : "absent"
          : "unmarked",
      };
    });
  }, [employees, attendanceByEmployee]);

  const stats = useMemo(() => {
    const present = attendance.filter((r) => r.is_present === true).length;
    const absent = attendance.filter((r) => r.is_present === false).length;
    const marked = attendance.length;
    const unmarked = Math.max(employees.length - marked, 0);

    return {
      total: employees.length,
      marked,
      present,
      absent,
      unmarked,
    };
  }, [employees, attendance]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(({ employee, status }) => {
      const matchesSearch =
        !query ||
        employee.full_name.toLowerCase().includes(query) ||
        employee.employee_id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const attendanceDate = attendance[0]?.date;

  const firstName =
    me?.first_name?.trim() ||
    me?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() || firstName;

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      // Leave the page regardless of logout request failure.
    } finally {
      router.replace("/");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Loading attendance...
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Retrieving today&apos;s attendance records
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Unable to load attendance
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button
            onClick={() => loadAttendance()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <button
            type="button"
            onClick={() => navigate("/manager/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/30">
              <span className="text-lg font-black text-white">N</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold tracking-wide text-white">
                NYUTU LTD
              </p>
              <p className="text-[10px] font-medium tracking-[0.18em] text-slate-400">
                ERP MANAGEMENT
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Main Menu
          </div>

          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => navigate("/manager/dashboard")}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                isActive("/manager/dashboard")
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <LayoutDashboard
                className={`h-5 w-5 ${
                  isActive("/manager/dashboard")
                    ? "text-white"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              <span className="flex-1">Dashboard</span>
              {isActive("/manager/dashboard") && (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {modules.map((module) => {
              const Icon = module.icon;
              const active = isActive(module.href);

              return (
                <button
                  key={module.href}
                  type="button"
                  onClick={() => navigate(module.href)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      active
                        ? "text-white"
                        : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  <span className="flex-1">{module.label}</span>
                  {active && <ChevronRight className="h-4 w-4" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account / Sign Out */}
        <div className="shrink-0 border-t border-white/10 bg-slate-950 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {fullName}
              </p>
              <p className="truncate text-xs text-slate-400">
                {me?.email || "Manager"}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">
                  Manager Account
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  {getGreeting()}
                </p>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                  {firstName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">
                  System Online
                </span>
              </div>

              <div className="hidden h-10 w-px bg-slate-200 sm:block" />

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-4 ring-blue-50/50">
                {firstName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => navigate("/manager/dashboard")}
              className="font-medium text-slate-400 transition hover:text-blue-600"
            >
              Dashboard
            </button>
            <ChevronRight className="h-4 w-4 text-slate-300" />
            <span className="font-semibold text-slate-700">Attendance</span>
          </div>

          {/* Page heading */}
          <section className="mb-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                    <CalendarCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                    Operations
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Attendance
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  View today&apos;s attendance records for all active employees.
                </p>

                {attendanceDate && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {formatDate(attendanceDate)}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => loadAttendance(true)}
                disabled={refreshing}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </section>

          {/* Summary cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Employees
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.total}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Active in system
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Present
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.present}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Marked present today
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Absent
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.absent}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Marked absent today
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                  <UserX className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Unmarked
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.unmarked}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Awaiting attendance
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                  <Clock3 className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>
          </section>

          {/* Attendance table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Table header */}
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Daily Records
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">
                    Today&apos;s Attendance
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {filteredRows.length} employee
                    {filteredRows.length === 1 ? "" : "s"} shown
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name or employee ID..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-64"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as
                            | "all"
                            | "present"
                            | "absent"
                            | "unmarked"
                        )
                      }
                      className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-44"
                    >
                      <option value="all">All Employees</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="unmarked">Unmarked</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {filteredRows.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <CalendarCheck className="h-7 w-7 text-slate-400" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  No attendance records found
                </h4>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  Try changing your search or attendance filter.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Employee
                        </th>
                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Employee ID
                        </th>
                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Employment Type
                        </th>
                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Time
                        </th>
                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map(({ employee, record, status }) => (
                        <tr
                          key={employee.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                                {employee.full_name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) => part.charAt(0))
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <p className="text-sm font-bold text-slate-900">
                                {employee.full_name}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {employee.employee_id}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                employee.employment_type.toLowerCase() ===
                                "permanent"
                                  ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                                  : "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200"
                              }`}
                            >
                              {employee.employment_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {record ? formatTime(record.time) : "—"}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-slate-100 lg:hidden">
                  {filteredRows.map(({ employee, record, status }) => (
                    <div
                      key={employee.id}
                      className="p-5 transition hover:bg-slate-50/70 sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                            {employee.full_name
                              .split(" ")
                              .slice(0, 2)
                              .map((part) => part.charAt(0))
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-bold text-slate-900">
                              {employee.full_name}
                            </h4>
                            <p className="mt-0.5 font-mono text-xs text-slate-500">
                              {employee.employee_id}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(status)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Employment
                          </p>
                          <p className="mt-1 text-xs font-semibold capitalize text-slate-700">
                            {employee.employment_type}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Time
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {record ? formatTime(record.time) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Info note */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <CalendarCheck className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Attendance is view-only
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Attendance records are maintained through the authorized
                  attendance process. This manager view does not allow
                  attendance records to be created, edited, or deleted.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-6 text-center">
            <p className="text-xs text-slate-400">
              Nyutu Ltd Enterprise Management System
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Secure operations management
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}