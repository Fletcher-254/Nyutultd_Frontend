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
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  UserCheck,
  UserX,
  Store,
  AlertTriangle,
  Receipt,
  Clock3,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured.");
}

type Role = "admin" | "manager" | "director";

interface UserProfile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  employment_type: string;
  daily_wage: string | number;
  is_active?: boolean;
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
  href: string;
  icon: React.ElementType;
}

const modules: Module[] = [
  {
    name: "Employees",
    href: "/manager/employees",
    icon: Users,
  },
  {
    name: "Attendance",
    href: "/manager/attendance",
    icon: CalendarCheck,
  },
  {
    name: "Daily Wages",
    href: "/manager/daily-wages",
    icon: CircleDollarSign,
  },
  {
    name: "Vehicles",
    href: "/manager/vehicles",
    icon: Truck,
  },
  {
    name: "Fuel",
    href: "/manager/fuel",
    icon: Fuel,
  },
  {
    name: "Vendors",
    href: "/manager/vendors",
    icon: Store,
  },
  {
    name: "Expenses",
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("");

  const [user, setUser] = useState<UserProfile | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuel, setFuel] = useState<FuelSummary | null>(null);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isActive = (path: string) => {
    if (path === "/manager/dashboard") {
      return pathname === "/manager/dashboard" || pathname === "/manager";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navigate = (path: string) => {
    setSidebarOpen(false);
    router.push(path);
  };

  const handleUnauthorized = useCallback(() => {
    router.replace("/");
  }, [router]);

  const authenticatedFetch = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {}
    ): Promise<Response | null> => {
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
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
          return null;
        }

        return response;
      } catch (error) {
        console.error("Authenticated request failed:", error);
        throw error;
      }
    },
    [handleUnauthorized]
  );

  const logout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      router.replace("/");
    }
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      /* --------------------------------------------------
         AUTHENTICATED USER
      -------------------------------------------------- */

      const meResponse = await authenticatedFetch("/me/");

      if (!meResponse) return;

      if (!meResponse.ok) {
        throw new Error("Unable to authenticate user.");
      }

      const meData: UserProfile = await meResponse.json();

      const role = meData.role?.trim().toLowerCase();

      if (role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      if (role === "director") {
        router.replace("/director/dashboard");
        return;
      }

      if (role !== "manager") {
        router.replace("/");
        return;
      }

      setUser(meData);

      /* --------------------------------------------------
         DATE + GREETING
      -------------------------------------------------- */

      const now = new Date();
      const hour = now.getHours();

      if (hour < 12) {
        setGreeting("Good Morning");
      } else if (hour < 17) {
        setGreeting("Good Afternoon");
      } else {
        setGreeting("Good Evening");
      }

      setToday(
        now.toLocaleDateString("en-KE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );

      /* --------------------------------------------------
         DASHBOARD DATA
      -------------------------------------------------- */

      const [
        employeesRes,
        attendanceRes,
        vehiclesRes,
        fuelRes,
        payrollRes,
        vendorsRes,
      ] = await Promise.all([
        authenticatedFetch("/employees/list/"),
        authenticatedFetch("/attendance/today/"),
        authenticatedFetch("/vehicles/"),
        authenticatedFetch("/fuel/reports/daily/"),
        authenticatedFetch("/payroll/casual/summary/"),
        authenticatedFetch("/vendors/"),
      ]);

      /* Employees */

      if (employeesRes?.ok) {
        const data = await employeesRes.json();
        setEmployees(extractArray<Employee>(data));
      }

      /* Attendance */

      if (attendanceRes?.ok) {
        const data = await attendanceRes.json();
        setAttendance(extractArray<AttendanceRecord>(data));
      }

      /* Vehicles */

      if (vehiclesRes?.ok) {
        const data = await vehiclesRes.json();
        setVehicles(extractArray<Vehicle>(data));
      }

      /* Fuel */

      if (fuelRes?.ok) {
        const data = await fuelRes.json();
        setFuel(data);
      }

      /* Payroll */

      if (payrollRes?.ok) {
        const data = await payrollRes.json();
        setPayroll(data);
      }

      /* Vendors */

      if (vendorsRes?.ok) {
        const data = await vendorsRes.json();
        setVendors(extractArray<Vendor>(data));
      }
    } catch (err) {
      console.error("Manager dashboard loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* --------------------------------------------------
     DERIVED STATS
  -------------------------------------------------- */

  const stats = useMemo(() => {
    const totalEmployees = employees.length;

    const activeEmployees = employees.filter(
      (employee) => employee.is_active !== false
    ).length;

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
      activeEmployees - markedToday,
      0
    );

    const activeVendors = vendors.filter(
      (vendor) => vendor.is_active
    ).length;

    return {
      totalEmployees,
      activeEmployees,
      casualEmployees,
      permanentEmployees,
      markedToday,
      presentToday,
      absentToday,
      unmarkedToday,
      totalVehicles: vehicles.length,
      totalVendors: vendors.length,
      activeVendors,
      inactiveVendors: vendors.length - activeVendors,
    };
  }, [employees, attendance, vehicles, vendors]);

  const firstName =
    user?.first_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    firstName;

  /* --------------------------------------------------
     LOADING
  -------------------------------------------------- */

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          </div>

          <p className="mt-5 text-sm font-medium text-slate-600">
            Loading your dashboard...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Verifying secure access
          </p>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------
     ERROR
  -------------------------------------------------- */

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>

          <h1 className="mt-5 text-lg font-bold text-slate-900">
            Unable to load dashboard
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------
     DASHBOARD
  -------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Brand */}

        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <button
            type="button"
            onClick={() => navigate("/manager/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-lg font-black text-white shadow-lg shadow-blue-600/20">
              N
            </div>

            <div className="text-left">
              <p className="text-sm font-bold tracking-wide text-white">
                NYUTU LIMITED
              </p>

              <p className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-slate-500">
                ERP MANAGEMENT
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Management
          </p>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() =>
                navigate("/manager/dashboard")
              }
              className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                isActive("/manager/dashboard")
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <LayoutDashboard
                size={18}
                strokeWidth={
                  isActive("/manager/dashboard") ? 2.4 : 2
                }
              />

              <span className="flex-1 text-left">
                Dashboard
              </span>

              {isActive("/manager/dashboard") && (
                <ChevronRight
                  size={15}
                  className="opacity-70"
                />
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
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.4 : 2}
                  />

                  <span className="flex-1 text-left">
                    {module.name}
                  </span>

                  {active && (
                    <ChevronRight
                      size={15}
                      className="opacity-70"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User / Logout */}

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-400">
              {firstName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {fullName}
              </p>

              <p className="truncate text-[10px] text-slate-500">
                Manager
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} />

            <span>
              {loggingOut
                ? "Signing out..."
                : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* ==================================================
          MAIN
      ================================================== */}

      <div className="min-h-screen lg:pl-72">
        {/* Header */}

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="hidden text-xs font-medium text-slate-400 sm:block">
                  {today}
                </p>

                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                  {greeting}, {firstName}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>

                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  System Online
                </span>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-sm font-bold text-white shadow-md shadow-blue-600/20">
                {firstName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* ==================================================
              WELCOME
          ================================================== */}

          <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 shadow-lg sm:p-5">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1">
                  <ShieldCheck
                    size={11}
                    className="text-blue-400"
                  />

                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300">
                    Manager
                  </span>
                </div>

                <p className="mt-1 text-sm text-white">
                  Welcome back,{" "}
                  <span className="font-semibold">
                    {firstName}
                  </span>
                </p>

                <p className="text-xs text-slate-400">
                  Here's your operational overview for today
                </p>
              </div>

              <div className="hidden md:block">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <LayoutDashboard
                    size={24}
                    className="text-blue-400"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              OPERATIONAL OVERVIEW
          ================================================== */}

          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                  Operations
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Key Statistics
                </h2>
              </div>

              <span className="text-xs text-slate-400">
                Updated{" "}
                {new Date().toLocaleTimeString("en-KE")}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Employees"
                value={stats.totalEmployees}
                subtext={`${stats.activeEmployees} active`}
                icon={Users}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                onClick={() =>
                  navigate("/manager/employees")
                }
              />

              <StatCard
                label="Today's Attendance"
                value={`${stats.presentToday} / ${stats.activeEmployees}`}
                subtext={`${stats.absentToday} absent · ${stats.unmarkedToday} unmarked`}
                icon={UserCheck}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                onClick={() =>
                  navigate("/manager/attendance")
                }
              />

              <StatCard
                label="Daily Wages"
                value={formatCurrency(
                  payroll?.total_amount_due || 0
                )}
                subtext={`${formatCurrency(
                  payroll?.total_amount_pending || 0
                )} pending`}
                icon={CircleDollarSign}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                onClick={() =>
                  navigate("/manager/daily-wages")
                }
              />

              <StatCard
                label="Vehicles"
                value={stats.totalVehicles}
                subtext="Registered vehicles"
                icon={Truck}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                onClick={() =>
                  navigate("/manager/vehicles")
                }
              />

              <StatCard
                label="Fuel Purchased"
                value={`${formatNumber(
                  fuel?.fuel_purchased_litres || 0
                )} L`}
                subtext={`${formatNumber(
                  fuel?.fuel_issued_litres || 0
                )} L issued`}
                icon={Fuel}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
                onClick={() =>
                  navigate("/manager/fuel")
                }
              />

              <StatCard
                label="Fuel Remaining"
                value={`${formatNumber(
                  fuel?.fuel_remaining_litres || 0
                )} L`}
                subtext="Available in stock"
                icon={Fuel}
                iconBg="bg-cyan-50"
                iconColor="text-cyan-600"
                onClick={() =>
                  navigate("/manager/fuel")
                }
              />

              <StatCard
                label="Total Vendors"
                value={stats.totalVendors}
                subtext={`${stats.activeVendors} active`}
                icon={Store}
                iconBg="bg-rose-50"
                iconColor="text-rose-600"
                onClick={() =>
                  navigate("/manager/vendors")
                }
              />

              <StatCard
                label="Expenses"
                value="Manage expenses"
                subtext="View and record operational expenses"
                icon={Receipt}
                iconBg="bg-slate-100"
                iconColor="text-slate-700"
                onClick={() =>
                  navigate("/manager/expenses")
                }
              />
            </div>
          </section>

          {/* ==================================================
              TODAY'S ATTENDANCE
          ================================================== */}

          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                Workforce
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Today's Attendance
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AttendanceSummary
                icon={UserCheck}
                label="Present"
                value={stats.presentToday}
                description="Employees marked present"
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />

              <AttendanceSummary
                icon={UserX}
                label="Absent"
                value={stats.absentToday}
                description="Employees marked absent"
                iconBg="bg-red-50"
                iconColor="text-red-600"
              />

              <AttendanceSummary
                icon={Clock3}
                label="Unmarked"
                value={stats.unmarkedToday}
                description="Awaiting attendance"
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
              />
            </div>
          </section>

          {/* ==================================================
              MANAGER PROFILE
          ================================================== */}

          <section className="mt-10 pb-8">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                Account
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Manager Profile
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ShieldCheck size={23} />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      {fullName}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Manager Account
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                <p className="text-xs leading-relaxed text-slate-500">
                  Your manager account provides access to
                  workforce and operational modules assigned to
                  the manager role. Use the sidebar to navigate
                  between modules.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg,
  iconColor,
  onClick,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon
            size={21}
            className={iconColor}
          />
        </div>

        <ArrowUpRight
          size={17}
          className="text-slate-300 transition group-hover:text-blue-500"
        />
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      {subtext && (
        <p className="mt-1 text-xs text-slate-400">
          {subtext}
        </p>
      )}
    </button>
  );
}

/* ============================================================
   ATTENDANCE SUMMARY
============================================================ */

function AttendanceSummary({
  icon: Icon,
  label,
  value,
  description,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  description: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon
            size={21}
            className={iconColor}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-0.5 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}