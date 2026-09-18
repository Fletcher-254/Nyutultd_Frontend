"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UserCheck,
  UserX,
  Users,
  X,
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
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
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

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

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

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(time?: string) {
  if (!time) return "—";

  const parts = time.split(":");

  if (parts.length < 2) {
    return time;
  }

  const hours = Number(parts[0]);
  const minutes = parts[1];

  if (Number.isNaN(hours)) {
    return time;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

function getStatusBadge(status: string) {
  const statusMap: Record<
    string,
    {
      color: string;
      icon: React.ReactNode;
      label: string;
    }
  > = {
    present: {
      color: "bg-emerald-50 text-emerald-700",
      icon: <UserCheck className="h-3.5 w-3.5" />,
      label: "Present",
    },

    absent: {
      color: "bg-red-50 text-red-700",
      icon: <UserX className="h-3.5 w-3.5" />,
      label: "Absent",
    },

    unmarked: {
      color: "bg-slate-100 text-slate-600",
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
  const [loggingOut, setLoggingOut] = useState(false);

  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "absent" | "unmarked"
  >("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const modules: Module[] = useMemo(
    () => [
      {
        label: "Dashboard",
        href: "/manager/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Employees",
        href: "/manager/employees",
        icon: Users,
      },
      {
        label: "Attendance",
        href: "/manager/attendance",
        icon: CalendarCheck,
      },
      {
        label: "Daily Wages",
        href: "/manager/daily-wages",
        icon: CircleDollarSign,
      },
      {
        label: "Vehicles",
        href: "/manager/vehicles",
        icon: Truck,
      },
      {
        label: "Fuel",
        href: "/manager/fuel",
        icon: Fuel,
      },
      {
        label: "Vendors",
        href: "/manager/vendors",
        icon: Store,
      },
      {
        label: "Expenses",
        href: "/manager/expenses",
        icon: Receipt,
      },
    ],
    []
  );

  const isActive = useCallback(
    (href: string) => {
      if (href === "/manager/dashboard") {
        return pathname === href;
      }

      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  const navigate = useCallback(
    (href: string) => {
      setMobileOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleUnauthorized = useCallback(() => {
    router.replace("/");
  }, [router]);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const response = await fetch(url, {
        ...options,
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(options.headers || {}),
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Unauthorized");
      }

      return response;
    },
    [handleUnauthorized]
  );

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meResponse, employeesResponse, attendanceResponse] =
        await Promise.all([
          authenticatedFetch(`${API_URL}/me/`),
          authenticatedFetch(`${API_URL}/employees/list/`),
          authenticatedFetch(`${API_URL}/attendance/today/`),
        ]);

      if (!meResponse.ok) {
        throw new Error("Unable to load your account.");
      }

      if (!employeesResponse.ok) {
        throw new Error("Unable to load employees.");
      }

      if (!attendanceResponse.ok) {
        throw new Error("Unable to load attendance records.");
      }

      const meData: Me = await meResponse.json();
      const employeesData = await employeesResponse.json();
      const attendanceData = await attendanceResponse.json();

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
      setAttendance(
        extractArray<AttendanceRecord>(attendanceData)
      );
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return;
      }

      console.error("Attendance loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading attendance."
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/");
    }
  };

  const attendanceByEmployee = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();

    attendance.forEach((record) => {
      map.set(record.employee, record);
    });

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

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return rows.filter(({ employee, status }) => {
      const matchesSearch =
        !searchValue ||
        employee.full_name?.toLowerCase().includes(searchValue) ||
        employee.employee_id?.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return Boolean(matchesSearch && matchesStatus);
    });
  }, [rows, search, statusFilter]);

  const totalEmployees = employees.length;

  const presentEmployees = attendance.filter(
    (record) => record.is_present === true
  ).length;

  const absentEmployees = attendance.filter(
    (record) => record.is_present === false
  ).length;

  const markedEmployees = attendance.length;

  const unmarkedEmployees = Math.max(
    totalEmployees - markedEmployees,
    0
  );

  const attendanceDate = attendance[0]?.date;

  const firstName =
    me?.first_name?.trim() ||
    me?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() ||
    firstName;

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  if (loading && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <RefreshCw className="h-7 w-7 animate-spin text-white" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Loading attendance...
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Verifying secure access
          </p>
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

      {/* SIDEBAR */}
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
              <span className="text-lg font-black text-white">
                N
              </span>
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

                  {active && (
                    <ChevronRight className="h-4 w-4" />
                  )}
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
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Sign Out
              </>
            )}
          </button>
        </div>
      </aside>

      {/* MAIN */}
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
                  {greeting}
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
          {/* Welcome banner */}
          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5">
                  <CalendarCheck className="h-3.5 w-3.5 text-blue-300" />

                  <span className="text-xs font-semibold text-blue-200">
                    Attendance Management
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {greeting}, {firstName}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Attendance
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  View today&apos;s attendance records for all active
                  employees.
                </p>

                {attendanceDate && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {formatDate(attendanceDate)}
                  </div>
                )}
              </div>

              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 lg:flex">
                <CalendarCheck className="h-8 w-8 text-blue-300" />
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">
                  Unable to load attendance
                </p>

                <p className="mt-1 text-sm">{error}</p>
              </div>

              <button
                type="button"
                onClick={loadAttendance}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading ? "animate-spin" : ""
                  }`}
                />

                Retry
              </button>
            </div>
          )}

          {/* Summary cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Users}
              label="Total Employees"
              value={totalEmployees}
              description="Active in system"
            />

            <SummaryCard
              icon={UserCheck}
              label="Present"
              value={presentEmployees}
              description="Marked present today"
            />

            <SummaryCard
              icon={UserX}
              label="Absent"
              value={absentEmployees}
              description="Marked absent today"
            />

            <SummaryCard
              icon={Clock3}
              label="Unmarked"
              value={unmarkedEmployees}
              description="Awaiting attendance"
            />
          </section>

          {/* Search + Filters */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-bold text-slate-900">
                  Daily Attendance
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
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search employees..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 sm:w-72"
                  />
                </div>

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
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="all">All Employees</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="unmarked">Unmarked</option>
                </select>

                <button
                  type="button"
                  onClick={loadAttendance}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loading ? "animate-spin" : ""
                    }`}
                  />

                  Refresh
                </button>
              </div>
            </div>
          </section>

          {/* Attendance table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Attendance Records
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Today&apos;s employee attendance
                  </p>
                </div>

                <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {filteredRows.length} Records
                </div>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <CalendarCheck className="h-7 w-7 text-slate-400" />
                </div>

                <h4 className="font-semibold text-slate-900">
                  No attendance records found
                </h4>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  No attendance records match your current search or
                  status filter.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Employee
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          ID
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Employment
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Time
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map(
                        ({ employee, record, status }) => {
                          const employeeName =
                            employee.full_name?.trim() ||
                            "Unnamed Employee";

                          const employmentType =
                            employee.employment_type ||
                            "Not specified";

                          return (
                            <tr
                              key={employee.id}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                                    {employeeName
                                      .split(" ")
                                      .slice(0, 2)
                                      .map((part) => part[0])
                                      .join("")
                                      .toUpperCase()}
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {employeeName}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <span className="font-medium text-slate-700">
                                  {employee.employee_id || "—"}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    employmentType.toLowerCase() ===
                                    "casual"
                                      ? "bg-amber-50 text-amber-700"
                                      : employmentType
                                            .toLowerCase() ===
                                          "permanent"
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {employmentType}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                <span className="text-sm text-slate-700">
                                  {record
                                    ? formatTime(record.time)
                                    : "—"}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                {getStatusBadge(status)}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-slate-100 lg:hidden">
                  {filteredRows.map(
                    ({ employee, record, status }) => {
                      const employeeName =
                        employee.full_name?.trim() ||
                        "Unnamed Employee";

                      const employmentType =
                        employee.employment_type ||
                        "Not specified";

                      return (
                        <div
                          key={employee.id}
                          className="p-5 transition hover:bg-slate-50 sm:p-6"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                                {employeeName
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <h4 className="truncate text-sm font-bold text-slate-900">
                                  {employeeName}
                                </h4>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  {employee.employee_id || "No ID"}
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
                                {employmentType}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Time
                              </p>

                              <p className="mt-1 text-xs font-semibold text-slate-700">
                                {record
                                  ? formatTime(record.time)
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </>
            )}
          </section>

          {/* Attendance information */}
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  <CalendarCheck className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Attendance Access
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    View-Only Attendance
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Attendance records are maintained through the
                    authorized attendance process. Managers can view
                    today&apos;s records but cannot create, edit, or
                    delete attendance records.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Clock3 className="h-5 w-5 text-slate-500" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Marked Today
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {markedEmployees}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Attendance records
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-xs text-slate-400">
              NYUTU LIMITED ERP MANAGEMENT
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}