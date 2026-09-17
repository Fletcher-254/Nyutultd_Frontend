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
  Receipt,
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

interface Vehicle {
  id: number;
  asset_identifier: string;
  assigned_operator?: string | null;
  opening_odometer_reading?: string | number | null;
  closing_odometer_reading?: string | number | null;
  remarks?: string | null;
  created_at: string;
}

interface FuelSummary {
  date: string;
  fuel_purchased_litres: number | string;
  fuel_issued_litres: number | string;
  fuel_remaining_litres: number | string;
  fuel_cost: number | string;
}

interface PayrollSummary {
  payroll_period?: {
    start_date?: string;
    end_date?: string;
  };
  total_employees: number;
  paid_employees: number;
  pending_employees: number;
  processing_employees: number;
  failed_employees: number;
  total_amount_due: number | string;
  total_amount_paid: number | string;
  total_amount_pending: number | string;
}

interface Vendor {
  id: number;
  vendor_name: string;
  service_type: string;
  contact_person?: string | null;
  phone_number?: string | null;
  physical_address?: string | null;
  is_active: boolean;
  transaction_count: number;
  total_amount: number | string;
  total_paid: number | string;
  total_balance: number | string;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

interface Module {
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const modules: Module[] = [
  {
    name: "Employees",
    description: "View and manage employee records",
    href: "/manager/employees",
    icon: Users,
  },
  {
    name: "Attendance",
    description: "Monitor daily attendance",
    href: "/manager/attendance",
    icon: CalendarCheck,
  },
  {
    name: "Daily Wages",
    description: "View casual employee wages",
    href: "/manager/daily-wages",
    icon: CircleDollarSign,
  },
  {
    name: "Vehicles",
    description: "View company vehicles",
    href: "/manager/vehicles",
    icon: Truck,
  },
  {
    name: "Fuel",
    description: "Monitor fuel usage",
    href: "/manager/fuel",
    icon: Fuel,
  },
  {
    name: "Vendors",
    description: "View vendors and transactions",
    href: "/manager/vendors",
    icon: Store,
  },
  {
    name: "Expenses",
    description: "View and manage expenses",
    href: "/manager/expenses",
    icon: Receipt,
  },
];

function formatCurrency(value: number | string) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number | string) {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

export default function ManagerDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuel, setFuel] = useState<FuelSummary | null>(null);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = (href: string) => {
    setMobileOpen(false);
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === "/manager/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const authenticatedFetch = useCallback(
    async (endpoint: string) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
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
          // Keep the default error message.
        }

        throw new Error(message);
      }

      return response.json();
    },
    [router]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        meData,
        employeesData,
        attendanceData,
        vehiclesData,
        fuelData,
        payrollData,
        vendorsData,
      ] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/employees/list/"),
        authenticatedFetch("/attendance/today/"),
        authenticatedFetch("/vehicles/"),
        authenticatedFetch("/fuel/reports/daily/"),
        authenticatedFetch("/payroll/casual/summary/"),
        authenticatedFetch("/vendors/"),
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
      setVehicles(extractArray<Vehicle>(vehiclesData));
      setFuel(fuelData);
      setPayroll(payrollData);
      setVendors(extractArray<Vendor>(vendorsData));
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load your dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const totalEmployees = employees.length;

    const casualEmployees = employees.filter(
      (employee) => employee.employment_type === "casual"
    ).length;

    const permanentEmployees = employees.filter(
      (employee) => employee.employment_type === "permanent"
    ).length;

    const markedToday = attendance.length;

    const presentToday = attendance.filter(
      (record) => record.is_present === true
    ).length;

    const absentToday = attendance.filter(
      (record) => record.is_present === false
    ).length;

    const unmarkedToday = Math.max(
      totalEmployees - markedToday,
      0
    );

    const activeVendors = vendors.filter(
      (vendor) => vendor.is_active
    ).length;

    const inactiveVendors = vendors.length - activeVendors;

    return {
      totalEmployees,
      casualEmployees,
      permanentEmployees,
      markedToday,
      presentToday,
      absentToday,
      unmarkedToday,
      totalVehicles: vehicles.length,
      totalVendors: vendors.length,
      activeVendors,
      inactiveVendors,
    };
  }, [employees, attendance, vehicles, vendors]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  }, []);

  const firstName =
    me?.first_name?.trim() ||
    me?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() ||
    firstName;

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } catch {
      // Even if the logout request fails, leave the dashboard.
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
            Loading your dashboard...
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Verifying secure access
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
            Unable to load dashboard
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            onClick={loadDashboard}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
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
                  key={module.name}
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

                  <span className="flex-1">
                    {module.name}
                  </span>

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
                <Loader2 className="h-4 w-4 animate-spin" />
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
          {/* Welcome section */}
          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />

                  <span className="text-xs font-semibold text-blue-200">
                    Manager Dashboard
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {greeting}, {firstName}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Welcome to your dashboard
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Monitor daily operations, attendance, vehicles,
                  fuel, wages, vendors and expenses from one place.
                </p>
              </div>

              <div className="hidden lg:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <LayoutDashboard className="h-8 w-8 text-blue-300" />
              </div>
            </div>
          </section>

          {/* Overview */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Employees
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.totalEmployees}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {stats.casualEmployees} casual ·{" "}
                    {stats.permanentEmployees} permanent
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
                    Attendance
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.presentToday}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {stats.absentToday} absent ·{" "}
                    {stats.unmarkedToday} unmarked
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <CalendarCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Vehicles
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.totalVehicles}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Registered vehicles
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                  <Truck className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Vendors
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.totalVendors}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {stats.activeVendors} active ·{" "}
                    {stats.inactiveVendors} inactive
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                  <Store className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>
          </section>

          {/* Available Modules */}
          <section>
            <div className="mb-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                    Operations
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                    Available Modules
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Operational information available to you as manager.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* Employees */}
              <button
                type="button"
                onClick={() => navigate("/manager/employees")}
                className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive("/manager/employees")
                    ? "border-blue-300 ring-2 ring-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">
                  Employees
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {stats.totalEmployees}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {stats.casualEmployees} casual ·{" "}
                  {stats.permanentEmployees} permanent
                </p>
              </button>

              {/* Attendance */}
              <button
                type="button"
                onClick={() => navigate("/manager/attendance")}
                className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive("/manager/attendance")
                    ? "border-blue-300 ring-2 ring-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                    <CalendarCheck className="h-5 w-5 text-emerald-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">
                  Attendance
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {stats.presentToday} / {stats.totalEmployees}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {stats.presentToday} present ·{" "}
                  {stats.absentToday} absent ·{" "}
                  {stats.unmarkedToday} unmarked
                </p>
              </button>

              {/* Daily Wages */}
              <button
                type="button"
                onClick={() => navigate("/manager/daily-wages")}
                className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive("/manager/daily-wages")
                    ? "border-blue-300 ring-2 ring-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                    <CircleDollarSign className="h-5 w-5 text-amber-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-600" />
                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">
                  Daily Wages
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {formatCurrency(
                    payroll?.total_amount_due || 0
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(
                    payroll?.total_amount_pending || 0
                  )}{" "}
                  pending
                </p>
              </button>

              {/* Vehicles */}
              <button
                type="button"
                onClick={() => navigate("/manager/vehicles")}
                className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive("/manager/vehicles")
                    ? "border-blue-300 ring-2 ring-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                    <Truck className="h-5 w-5 text-violet-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">
                  Vehicles
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {stats.totalVehicles}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Registered vehicles
                </p>
              </button>

              {/* Fuel */}
              <button
                type="button"
                onClick={() => navigate("/manager/fuel")}
                className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive("/manager/fuel")
                    ? "border-blue-300 ring-2 ring-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                    <Fuel className="h-5 w-5 text-orange-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-orange-600" />
                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">
                  Fuel
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {formatNumber(
                    fuel?.fuel_purchased_litres || 0
                  )}{" "}
                  L
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(
                    fuel?.fuel_remaining_litres || 0
                  )}{" "}
                  L remaining
                </p>
              </button>

              {/* Vendors */}
              <button
                type="button"
                onClick={() => navigate("/manager/vendors")}
                className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive("/manager/vendors")
                    ? "border-blue-300 ring-2 ring-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50">
                    <Store className="h-5 w-5 text-sky-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-600" />
                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">
                  Vendors
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {stats.totalVendors}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {stats.activeVendors} active ·{" "}
                  {stats.inactiveVendors} inactive
                </p>
              </button>

              {/* Expenses */}
              <button
                type="button"
                onClick={() => navigate("/manager/expenses")}
                className={`group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive("/manager/expenses")
                    ? "border-blue-300 ring-2 ring-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50">
                    <Receipt className="h-5 w-5 text-rose-600" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-rose-600" />
                </div>

                <p className="mt-5 text-sm font-bold text-slate-900">
                  Expenses
                </p>

                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  Track expenses
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View and manage expenses
                </p>
              </button>
            </div>
          </section>

          {/* Manager profile */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Account
                  </p>

                  <h2 className="mt-1 text-base font-bold text-slate-900">
                    {fullName}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {me?.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-700">
                  <UserCheck className="h-4 w-4" />
                  {stats.presentToday} present today
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700">
                  <UserX className="h-4 w-4" />
                  {stats.absentToday} absent today
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-700">
                  <Clock3 className="h-4 w-4" />
                  {stats.unmarkedToday} unmarked
                </div>
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