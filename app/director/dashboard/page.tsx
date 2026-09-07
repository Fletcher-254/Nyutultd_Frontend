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
  FileSearch,
  Briefcase,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
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

interface Expense {
  id: number;
  expense_date: string;
  category: string;
  category_display: string;
  description: string;
  amount: number | string;
  payment_method: string;
  payment_method_display: string;
  receipt_number: string | null;
  receipt_image: string | null;
  remarks: string | null;
  created_at: string;
}

interface SidebarSection {
  title: string;
  items: Module[];
}

interface Module {
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const sidebarSections: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        description: "Executive overview",
        href: "/director/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Financials",
    items: [
      {
        name: "Daily Wages",
        description: "View casual employee wages",
        href: "/director/daily-wages",
        icon: CircleDollarSign,
      },
      {
        name: "Permanent Payroll",
        description: "Manage permanent staff payroll",
        href: "/director/permanent-payroll",
        icon: Briefcase,
      },
      {
        name: "Expenses",
        description: "View and manage expenses",
        href: "/director/expenses",
        icon: Receipt,
      },
      {
        name: "Vendors",
        description: "View vendors and transactions",
        href: "/director/vendors",
        icon: Store,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Employees",
        description: "View and manage employee records",
        href: "/director/employees",
        icon: Users,
      },
      {
        name: "Attendance",
        description: "Monitor daily attendance",
        href: "/director/attendance",
        icon: CalendarCheck,
      },
      {
        name: "Vehicles",
        description: "View company vehicles",
        href: "/director/vehicles",
        icon: Truck,
      },
      {
        name: "Fuel",
        description: "Monitor fuel usage",
        href: "/director/fuel",
        icon: Fuel,
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        name: "Users",
        description: "Manage system users",
        href: "/director/users",
        icon: Shield,
      },
      {
        name: "Audit",
        description: "View audit logs and reports",
        href: "/director/audit",
        icon: FileSearch,
      },
    ],
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

export default function DirectorDashboardPage() {
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
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authenticatedFetch = useCallback(
    async (endpoint: string) => {
      try {
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
            // Keep the default error message.
          }

          throw new Error(message);
        }

        return response.json();
      } catch (err) {
        // If it's a network error, re-throw with a user-friendly message
        if (err instanceof TypeError && err.message === "Failed to fetch") {
          throw new Error("Network error. Please check your connection.");
        }
        throw err;
      }
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
        expensesData,
      ] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/employees/list/"),
        authenticatedFetch("/attendance/today/"),
        authenticatedFetch("/vehicles/"),
        authenticatedFetch("/fuel/reports/daily/"),
        authenticatedFetch("/payroll/casual/summary/"),
        authenticatedFetch("/vendors/"),
        authenticatedFetch("/expenses/"),
      ]);

      if (meData.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      if (meData.role === "manager") {
        router.replace("/manager/dashboard");
        return;
      }

      if (meData.role !== "director") {
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
      setExpenses(extractArray<Expense>(expensesData));
    } catch (err) {
      console.error("Dashboard load error:", err);
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

    const totalExpenses = expenses.length;
    const totalExpenseAmount = expenses.reduce(
      (sum, exp) => sum + Number(exp.amount || 0),
      0
    );

    const totalVendorBalance = vendors.reduce(
      (sum, v) => sum + Number(v.total_balance || 0),
      0
    );

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
      totalExpenses,
      totalExpenseAmount,
      totalVendorBalance,
    };
  }, [employees, attendance, vehicles, vendors, expenses]);

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
      await fetch(`${API}/logout/`, {
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
              Director Portal
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>

              <nav className="mt-3 space-y-1">
                {section.items.map((module) => {
                  const Icon = module.icon;
                  const isActive = pathname === module.href;

                  return (
                    <button
                      key={module.name}
                      onClick={() => {
                        setMobileOpen(false);
                        router.push(module.href);
                      }}
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

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="h-5 w-5 text-slate-300" />
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
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="hidden lg:block">
              <p className="text-sm font-medium text-slate-900">
                Director Dashboard
              </p>
              <p className="text-xs text-slate-500">
                Executive overview
              </p>
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
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-slate-400">
                {greeting}, Director
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Executive Dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor all operations, payroll, expenses, and access
                comprehensive audit logs from one place.
              </p>
            </div>
          </section>

          {/* Financial Overview - Primary */}
          <section className="mt-9">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Financial Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current financial position and commitments.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() => router.push("/director/daily-wages")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2">
                    <CircleDollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Weekly Payroll Due</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {formatCurrency(payroll?.total_amount_due || 0)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(payroll?.total_amount_pending || 0)} pending
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push("/director/expenses")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-50 p-2">
                    <Receipt className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Expenses</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {formatCurrency(stats.totalExpenseAmount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {stats.totalExpenses} transactions
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push("/director/fuel")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-2">
                    <Fuel className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Fuel Cost (Today)</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {formatCurrency(fuel?.fuel_cost || 0)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatNumber(fuel?.fuel_purchased_litres || 0)} L purchased
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => router.push("/director/vendors")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-50 p-2">
                    <Store className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Vendor Balance Due</p>
                    <p className={`text-2xl font-semibold ${
                      stats.totalVendorBalance > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {formatCurrency(stats.totalVendorBalance)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {stats.totalVendors} vendors
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* Operations Overview */}
          <section className="mt-9">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Operations Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Workforce and asset utilization metrics.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-100 p-2">
                    <Users className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Employees</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.totalEmployees}
                    </p>
                    <p className="text-xs text-slate-400">
                      {stats.permanentEmployees} permanent · {stats.casualEmployees} casual
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-green-50 p-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Today's Attendance</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.presentToday} / {stats.totalEmployees}
                    </p>
                    <p className="text-xs text-slate-400">
                      {stats.absentToday} absent · {stats.unmarkedToday} unmarked
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-50 p-2">
                    <Truck className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Fleet Vehicles</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.totalVehicles}
                    </p>
                    <p className="text-xs text-slate-400">
                      Registered assets
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Permanent Staff</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {stats.permanentEmployees}
                    </p>
                    <p className="text-xs text-slate-400">
                      Monthly payroll eligible
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Access */}
          <section className="mt-9">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Quick Access
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Direct links to key management areas.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <button
                onClick={() => router.push("/director/permanent-payroll")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Briefcase className="h-5 w-5 text-slate-700" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">Permanent Payroll</p>
                <p className="mt-1 text-xs text-slate-500">Manage monthly payroll for {stats.permanentEmployees} staff</p>
              </button>

              <button
                onClick={() => router.push("/director/expenses")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Receipt className="h-5 w-5 text-slate-700" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">Expenses</p>
                <p className="mt-1 text-xs text-slate-500">{stats.totalExpenses} transactions · {formatCurrency(stats.totalExpenseAmount)}</p>
              </button>

              <button
                onClick={() => router.push("/director/users")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Shield className="h-5 w-5 text-slate-700" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">User Management</p>
                <p className="mt-1 text-xs text-slate-500">Manage system users and permissions</p>
              </button>

              <button
                onClick={() => router.push("/director/vendors")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Store className="h-5 w-5 text-slate-700" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">Vendors</p>
                <p className="mt-1 text-xs text-slate-500">{stats.totalVendors} vendors · {formatCurrency(stats.totalVendorBalance)} balance due</p>
              </button>

              <button
                onClick={() => router.push("/director/fuel")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Fuel className="h-5 w-5 text-slate-700" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">Fuel Management</p>
                <p className="mt-1 text-xs text-slate-500">{formatNumber(fuel?.fuel_remaining_litres || 0)} L remaining</p>
              </button>

              <button
                onClick={() => router.push("/director/audit")}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <FileSearch className="h-5 w-5 text-slate-700" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">Audit Log</p>
                <p className="mt-1 text-xs text-slate-500">View system audit trail and reports</p>
              </button>
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