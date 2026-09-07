
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
  Shield,
  UserCheck,
  UserX,
  Clock3,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  FileSearch,
  Briefcase,
  Receipt,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Role = "admin" | "manager" | "director";

interface Me {
  id: number;
  email: string;
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
  name: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarSection {
  title: string;
  modules: Module[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: "Overview",
    modules: [
      {
        name: "Dashboard",
        href: "/director/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Financials",
    modules: [
      {
        name: "Daily Wages",
        href: "/director/daily-wages",
        icon: CircleDollarSign,
      },
      {
        name: "Permanent Payroll",
        href: "/director/permanent-payroll",
        icon: Briefcase,
      },
      {
        name: "Expenses",
        href: "/director/expenses",
        icon: Receipt,
      },
      {
        name: "Vendors",
        href: "/director/vendors",
        icon: Store,
      },
    ],
  },
  {
    title: "Operations",
    modules: [
      {
        name: "Employees",
        href: "/director/employees",
        icon: Users,
      },
      {
        name: "Attendance",
        href: "/director/attendance",
        icon: CalendarCheck,
      },
      {
        name: "Vehicles",
        href: "/director/vehicles",
        icon: Truck,
      },
      {
        name: "Fuel",
        href: "/director/fuel",
        icon: Fuel,
      },
    ],
  },
  {
    title: "Governance",
    modules: [
      {
        name: "Users",
        href: "/director/users",
        icon: Shield,
      },
      {
        name: "Audit",
        href: "/director/audit",
        icon: FileSearch,
      },
    ],
  },
];

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
  if (!dateString) {
    return "—";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(time?: string) {
  if (!time) {
    return "—";
  }

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
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <UserCheck className="h-3.5 w-3.5" />,
      label: "Present",
    },
    absent: {
      color: "bg-red-50 text-red-700 border-red-200",
      icon: <UserX className="h-3.5 w-3.5" />,
      label: "Absent",
    },
    unmarked: {
      color: "bg-slate-50 text-slate-500 border-slate-200",
      icon: <Clock3 className="h-3.5 w-3.5" />,
      label: "Unmarked",
    },
  };

  const config = statusMap[status] || statusMap.unmarked;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export default function DirectorAttendancePage() {
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
  const [error, setError] = useState("");

  const authenticatedFetch = useCallback(
    async (endpoint: string) => {
      const response = await fetch(`${API}${endpoint}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        router.replace("/");
        throw new Error("Your session has expired.");
      }

      if (!response.ok) {
        let message = `Request failed with status ${response.status}.`;

        try {
          const data = await response.json();

          if (typeof data?.detail === "string") {
            message = data.detail;
          } else if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(message);
      }

      return response.json();
    },
    [router]
  );

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meData, employeesData, attendanceData] =
        await Promise.all([
          authenticatedFetch("/me/"),
          authenticatedFetch("/employees/list/"),
          authenticatedFetch("/attendance/today/"),
        ]);

      /*
       * This page is Director-only.
       *
       * A Director must remain on this page.
       * Only non-directors are redirected.
       */
      if (meData.role !== "director") {
        router.replace("/");
        return;
      }

      setMe(meData);
      setEmployees(extractArray<Employee>(employeesData));
      setAttendance(extractArray<AttendanceRecord>(attendanceData));
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load attendance.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

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

      const status = record
        ? record.is_present
          ? "present"
          : "absent"
        : "unmarked";

      return {
        employee,
        record: record ?? null,
        status,
      };
    });
  }, [employees, attendanceByEmployee]);

  const stats = useMemo(() => {
    const present = attendance.filter(
      (record) => record.is_present === true
    ).length;

    const absent = attendance.filter(
      (record) => record.is_present === false
    ).length;

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

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  })();

  const handleNavigation = (href: string) => {
    setMobileOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } catch {
      // Redirect regardless of logout request failure.
    } finally {
      router.replace("/");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />

          <p className="mt-4 text-sm font-medium text-white">
            Loading attendance...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Retrieving today's attendance records
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-900">
            Unable to load attendance
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            onClick={loadAttendance}
            className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide">
              NYUTU LIMITED
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Management Portal
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-7 last:mb-0">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>

              <nav className="mt-3 space-y-1">
                {section.modules.map((module) => {
                  const Icon = module.icon;
                  const isActive = pathname === module.href;

                  return (
                    <button
                      key={module.href}
                      onClick={() => handleNavigation(module.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{module.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Sidebar profile */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <Shield className="h-5 w-5 text-slate-300" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  Director
                </p>

                <p className="truncate text-xs text-slate-500">
                  {me?.email}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className="hidden lg:block">
                <p className="text-sm font-medium text-slate-900">
                  Attendance
                </p>

                <p className="text-xs text-slate-500">
                  Daily attendance overview
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {me?.email}
                </p>

                <p className="text-xs text-slate-500">
                  Director
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {me?.email?.charAt(0).toUpperCase() || "D"}
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-7 sm:px-8 lg:py-9">
          {/* Welcome banner */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  {greeting}
                </p>

                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Attendance Overview
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Review today's attendance across the organization,
                  including attendance status and recorded times.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {attendanceDate && (
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
                    <CalendarCheck className="h-4 w-4" />
                    <span>{formatDate(attendanceDate)}</span>
                  </div>
                )}

                <button
                  onClick={loadAttendance}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </section>

          {/* Attendance overview */}
          <section className="mt-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Attendance Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current attendance position for today's records.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2">
                    <Users className="h-5 w-5 text-slate-700" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Total Employees
                    </p>

                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>

              {/* Present */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-green-50 p-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Present
                    </p>

                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.present}
                    </p>
                  </div>
                </div>
              </div>

              {/* Absent */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-50 p-2">
                    <UserX className="h-5 w-5 text-red-600" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Absent
                    </p>

                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.absent}
                    </p>
                  </div>
                </div>
              </div>

              {/* Unmarked */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-50 p-2">
                    <Clock3 className="h-5 w-5 text-yellow-600" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Unmarked
                    </p>

                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.unmarked}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Search and filters */}
          <section className="mt-7">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Attendance Records
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search and filter today's employee attendance.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search by name or employee ID..."
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />

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
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="all">
                      All Employees
                    </option>
                    <option value="present">
                      Present
                    </option>
                    <option value="absent">
                      Absent
                    </option>
                    <option value="unmarked">
                      Unmarked
                    </option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-slate-500">
                {filteredRows.length} employee
                {filteredRows.length !== 1 ? "s" : ""}
              </div>
            </div>
          </section>

          {/* Attendance table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {filteredRows.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <CalendarCheck className="h-5 w-5 text-slate-500" />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    No attendance records found
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or attendance filter.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-slate-600">
                        Employee
                      </th>

                      <th className="px-5 py-3 text-left font-medium text-slate-600">
                        Employee ID
                      </th>

                      <th className="px-5 py-3 text-left font-medium text-slate-600">
                        Employment Type
                      </th>

                      <th className="px-5 py-3 text-left font-medium text-slate-600">
                        Time
                      </th>

                      <th className="px-5 py-3 text-left font-medium text-slate-600">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map(
                      ({ employee, record, status }) => (
                        <tr
                          key={employee.id}
                          className="transition hover:bg-slate-50/50"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                {employee.full_name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) =>
                                    part.charAt(0)
                                  )
                                  .join("")
                                  .toUpperCase()}
                              </div>

                              <p className="text-sm font-medium text-slate-900">
                                {employee.full_name}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                            {employee.employee_id}
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                                employee.employment_type.toLowerCase() ===
                                "permanent"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-orange-50 text-orange-700"
                              }`}
                            >
                              {employee.employment_type}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-slate-600">
                            {record
                              ? formatTime(record.time)
                              : "—"}
                          </td>

                          <td className="px-5 py-3.5">
                            {getStatusBadge(status)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Information note */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <CalendarCheck className="h-4 w-4 text-slate-600" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-800">
                  Attendance is view-only
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Attendance records are maintained through the
                  authorized attendance process. This Director view
                  does not allow attendance records to be created,
                  edited, or deleted.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-9 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>
                © {new Date().getFullYear()} NYUTU LIMITED
              </p>

              <p>
                Director Portal · Executive Access
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

