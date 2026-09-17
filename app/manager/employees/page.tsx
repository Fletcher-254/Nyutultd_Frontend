"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarCheck,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
  Users,
  UserX,
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
  first_name?: string;
  last_name?: string;
  role: Role;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
}

interface Employee {
  id: number;
  employee_id?: string;
  full_name?: string;
  national_id?: string;
  phone_number?: string;
  passport_photo?: string | null;
  employment_type?: string;
  position?: string;
  department?: string;
  salary?: number | string;
  daily_rate?: number | string;
  is_active?: boolean;
  created_at?: string;
}

interface Module {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

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

function formatCurrency(value: number | string | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ManagerEmployeesPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("all");

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
        icon: BriefcaseBusiness,
      },
    ],
    [],
  );

  const isActive = useCallback(
    (href: string) => {
      if (href === "/manager/dashboard") {
        return pathname === href;
      }

      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  const navigate = useCallback(
    (href: string) => {
      setMobileOpen(false);
      router.push(href);
    },
    [router],
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
    [handleUnauthorized],
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meResponse, employeesResponse] = await Promise.all([
        authenticatedFetch(`${API_URL}/me/`),
        authenticatedFetch(`${API_URL}/employees/list/`),
      ]);

      if (!meResponse.ok) {
        throw new Error("Unable to load your account.");
      }

      if (!employeesResponse.ok) {
        throw new Error("Unable to load employees.");
      }

      const meData: Me = await meResponse.json();
      const employeesData = await employeesResponse.json();

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
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return;
      }

      console.error("Employee loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading employees.",
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

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

  const filteredEmployees = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !searchValue ||
        employee.full_name?.toLowerCase().includes(searchValue) ||
        employee.employee_id?.toLowerCase().includes(searchValue) ||
        employee.phone_number?.toLowerCase().includes(searchValue) ||
        employee.national_id?.toLowerCase().includes(searchValue) ||
        employee.position?.toLowerCase().includes(searchValue);

      const employmentType =
        employee.employment_type?.toLowerCase() || "";

      const matchesEmployment =
        employmentFilter === "all" ||
        employmentType === employmentFilter.toLowerCase();

      return Boolean(matchesSearch && matchesEmployment);
    });
  }, [employees, search, employmentFilter]);

  const totalEmployees = employees.length;

  const casualEmployees = employees.filter(
    (employee) =>
      employee.employment_type?.toLowerCase() === "casual",
  ).length;

  const permanentEmployees = employees.filter(
    (employee) =>
      employee.employment_type?.toLowerCase() === "permanent",
  ).length;

  const activeEmployees = employees.filter(
    (employee) => employee.is_active !== false,
  ).length;

  const inactiveEmployees = employees.filter(
    (employee) => employee.is_active === false,
  ).length;

  const firstName =
    me?.first_name?.trim() ||
    me?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() ||
    firstName;

  const initials =
    `${me?.first_name?.[0] || ""}${me?.last_name?.[0] || ""}`.toUpperCase() ||
    firstName.slice(0, 2).toUpperCase();

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const today = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  if (loading && !me) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-sm font-medium text-slate-500">
              Loading employees...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* -------------------------------------------------------
          SIDEBAR
      ------------------------------------------------------- */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <button
            type="button"
            onClick={() => navigate("/manager/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-600/20">
              N
            </div>

            <div className="text-left">
              <div className="text-sm font-bold tracking-wide">
                NYUTU LIMITED
              </div>

              <div className="text-[10px] font-medium tracking-[0.18em] text-slate-400">
                ERP MANAGEMENT
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Management
          </p>

          {modules.map((module) => {
            const Icon = module.icon;
            const active = isActive(module.href);

            return (
              <button
                key={module.href}
                type="button"
                onClick={() => navigate(module.href)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />

                <span className="flex-1 text-left">
                  {module.label}
                </span>

                {active && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile + Sign Out */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {fullName}
              </p>

              <p className="truncate text-xs text-slate-400">
                Manager
              </p>
            </div>
          </div>

          {/* ACTUAL CONNECTED SIGN OUT BUTTON */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />

            <span>
              {loggingOut ? "Signing out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------------
          MAIN
      ------------------------------------------------------- */}

      <main className="min-h-screen lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  {today}
                </p>

                <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                  {greeting}, {firstName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                System Online
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Welcome */}
          <section className="mb-6 overflow-hidden rounded-2xl bg-slate-950 shadow-sm">
            <div className="relative p-6 sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 ring-1 ring-blue-500/20">
                  <Users className="h-3.5 w-3.5" />
                  Employee Management
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Employees
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  View and manage employee information across the
                  organization.
                </p>
              </div>

              <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">
                  Unable to load employees
                </p>

                <p className="mt-1 text-sm">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={loadEmployees}
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
              description="All registered employees"
            />

            <SummaryCard
              icon={UserCheck}
              label="Active Employees"
              value={activeEmployees}
              description="Currently active"
            />

            <SummaryCard
              icon={Clock3}
              label="Casual Employees"
              value={casualEmployees}
              description="Casual workforce"
            />

            <SummaryCard
              icon={BriefcaseBusiness}
              label="Permanent Employees"
              value={permanentEmployees}
              description="Permanent workforce"
            />
          </section>

          {/* Search + Filters */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-bold text-slate-900">
                  Employee Directory
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredEmployees.length} employee
                  {filteredEmployees.length === 1 ? "" : "s"} shown
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search employees..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 sm:w-72"
                  />
                </div>

                <select
                  value={employmentFilter}
                  onChange={(event) =>
                    setEmploymentFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="all">All Employment Types</option>
                  <option value="permanent">Permanent</option>
                  <option value="casual">Casual</option>
                </select>

                <button
                  type="button"
                  onClick={loadEmployees}
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

          {/* Employee table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Employees
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Employee records
                  </p>
                </div>

                <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {filteredEmployees.length} Records
                </div>
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>

                <h4 className="font-semibold text-slate-900">
                  No employees found
                </h4>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  No employee records match your current search or
                  filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Employee
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        ID
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Contact
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Position
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Employment
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((employee) => {
                      const employeeName =
                        employee.full_name?.trim() || "Unnamed Employee";

                      const employmentType =
                        employee.employment_type || "Not specified";

                      const isActive =
                        employee.is_active !== false;

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

                                {employee.department && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {employee.department}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-700">
                              {employee.employee_id || "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="text-sm text-slate-700">
                                {employee.phone_number || "—"}
                              </p>

                              {employee.national_id && (
                                <p className="text-xs text-slate-400">
                                  ID: {employee.national_id}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-700">
                              {employee.position || "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                employmentType.toLowerCase() ===
                                "casual"
                                  ? "bg-amber-50 text-amber-700"
                                  : employmentType.toLowerCase() ===
                                      "permanent"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {employmentType}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                                }`}
                              />

                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Manager account */}
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Manager Account
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {fullName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {me?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <UserX className="h-5 w-5 text-slate-500" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Inactive
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {inactiveEmployees}
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