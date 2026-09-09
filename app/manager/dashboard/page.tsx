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
  throw new Error(
    "NEXT_PUBLIC_API_URL is not configured."
  );
}

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

  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuel, setFuel] = useState<FuelSummary | null>(null);
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authenticatedFetch = useCallback(
    async (endpoint: string) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
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

  const handleLogout = async () => {
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />

          <p className="mt-4 text-sm font-medium text-white">
            Loading your dashboard...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Verifying secure access
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-900">
            Unable to load dashboard
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            onClick={loadDashboard}
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
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Navigation
          </p>

          <nav className="mt-3 space-y-1">
            <button
              onClick={() => router.push("/manager/dashboard")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                pathname === "/manager/dashboard"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </button>

            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <button
                  key={module.name}
                  onClick={() => {
                    setMobileOpen(false);
                    router.push(module.href);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-5 w-5" />
                  <span>{module.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="h-5 w-5 text-slate-300" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  Manager
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
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="hidden lg:block">
              <p className="text-sm font-medium text-slate-900">
                Manager Dashboard
              </p>
              <p className="text-xs text-slate-500">
                Operational overview
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {me?.email}
                </p>
                <p className="text-xs text-slate-500">
                  Manager
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {me?.email?.charAt(0).toUpperCase() || "M"}
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-7 sm:px-8 lg:py-9">
          {/* Welcome banner */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-slate-400">
                {greeting}
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome to your dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor daily operations, attendance, vehicles,
                fuel, wages, vendors and expenses from one place.
              </p>
            </div>
          </section>

          {/* Available Modules */}
          <section className="mt-9">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Available Modules
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Operational information available to you as manager.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* Employees */}
              <button
                onClick={() => router.push("/manager/employees")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Users className="h-5 w-5 text-slate-700" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  Employees
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {stats.totalEmployees}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {stats.casualEmployees} casual ·{" "}
                  {stats.permanentEmployees} permanent
                </p>
              </button>

              {/* Attendance */}
              <button
                onClick={() => router.push("/manager/attendance")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <CalendarCheck className="h-5 w-5 text-slate-700" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  Attendance
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
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
                onClick={() => router.push("/manager/daily-wages")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <CircleDollarSign className="h-5 w-5 text-slate-700" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  Daily Wages
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
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
                onClick={() => router.push("/manager/vehicles")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Truck className="h-5 w-5 text-slate-700" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  Vehicles
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {stats.totalVehicles}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Registered vehicles
                </p>
              </button>

              {/* Fuel */}
              <button
                onClick={() => router.push("/manager/fuel")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Fuel className="h-5 w-5 text-slate-700" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  Fuel
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
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
                onClick={() => router.push("/manager/vendors")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Store className="h-5 w-5 text-slate-700" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  Vendors
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  {stats.totalVendors}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {stats.activeVendors} active ·{" "}
                  {stats.inactiveVendors} inactive
                </p>
              </button>

              {/* Expenses */}
              <button
                onClick={() => router.push("/manager/expenses")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Receipt className="h-5 w-5 text-slate-700" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>

                <p className="mt-5 text-sm font-medium text-slate-500">
                  Expenses
                </p>

                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  Track expenses
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View and manage expenses
                </p>
              </button>
            </div>
          </section>

          {/* Manager profile */}
          <section className="mt-9 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <ShieldCheck className="h-6 w-6 text-slate-700" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Manager Profile
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {me?.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                  <UserCheck className="h-4 w-4" />
                  {stats.presentToday} present today
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                  <UserX className="h-4 w-4" />
                  {stats.absentToday} absent today
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                  <Clock3 className="h-4 w-4" />
                  {stats.unmarkedToday} unmarked
                </div>
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
                Management Portal · Manager Access
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}