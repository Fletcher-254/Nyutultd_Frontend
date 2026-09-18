"use client";

import { useCallback, useEffect, useState } from "react";
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
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Calendar,
  DollarSign,
  CreditCard,
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

interface CasualPayroll {
  id: number;
  employee: number;
  employee_id: string;
  employee_name: string;
  payroll_period: number;
  days_worked: number;
  daily_wage: number | string;
  amount_due: number | string;
  payment_status: "pending" | "processing" | "paid" | "failed";
  mpesa_reference?: string | null;
  paid_at?: string | null;
  created_at: string;
}

interface PayrollSummary {
  payroll_period?: {
    id: number;
    start_date: string;
    end_date: string;
    status: string;
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

function formatDate(dateString: string) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(dateString: string) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
    pending: {
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Pending",
    },
    processing: {
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Processing",
    },
    paid: {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: "Paid",
    },
    failed: {
      color: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Failed",
    },
  };

  const config = statusMap[status] || statusMap.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export default function DailyWagesPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [me, setMe] = useState<Me | null>(null);
  const [payrolls, setPayrolls] = useState<CasualPayroll[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isPaying, setIsPaying] = useState<number | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const [showMpesaModal, setShowMpesaModal] = useState<number | null>(null);
  const [mpesaReference, setMpesaReference] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;

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
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(options.headers || {}),
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
    [router],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meData, payrollsData, summaryData] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/payroll/casual/"),
        authenticatedFetch("/payroll/casual/summary/"),
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
      setPayrolls(Array.isArray(payrollsData) ? payrollsData : []);
      setSummary(summaryData || null);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load daily wages data.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePayEmployee = async (payrollId: number) => {
    if (!mpesaReference.trim()) {
      setPayError("Please enter an M-Pesa reference number.");
      return;
    }

    setIsPaying(payrollId);
    setPayError(null);

    try {
      await authenticatedFetch(`/payroll/casual/${payrollId}/pay/`, {
        method: "PATCH",
        body: JSON.stringify({
          mpesa_reference: mpesaReference.trim(),
        }),
      });

      await loadData();

      setShowMpesaModal(null);
      setMpesaReference("");

      setPaySuccess(
        `Employee paid successfully with reference: ${mpesaReference}`,
      );

      setTimeout(() => setPaySuccess(null), 5000);
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Failed to process payment.",
      );
    } finally {
      setIsPaying(null);
    }
  };

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

  const filteredPayrolls = payrolls.filter((payroll) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      payroll.employee_name.toLowerCase().includes(search) ||
      payroll.employee_id.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "all" || payroll.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPayrolls.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedPayrolls = filteredPayrolls.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const stats = {
    total: payrolls.length,
    paid: payrolls.filter((p) => p.payment_status === "paid").length,
    pending: payrolls.filter((p) => p.payment_status === "pending").length,
    processing: payrolls.filter((p) => p.payment_status === "processing").length,
    failed: payrolls.filter((p) => p.payment_status === "failed").length,
  };

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";

    return "Good evening";
  })();

  const firstName =
    me?.first_name?.trim() || me?.email?.split("@")[0] || "Manager";

  const fullName =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() || firstName;

  const initials =
    `${me?.first_name?.[0] || ""}${me?.last_name?.[0] || ""}`.toUpperCase() ||
    firstName.slice(0, 2).toUpperCase();

  const today = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Loading daily wages...
          </h2>

          <p className="mt-1 text-sm text-slate-500">Fetching payroll data</p>
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
            Unable to load data
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>

          <button
            type="button"
            onClick={loadData}
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
      {/* Success Toast */}
      {paySuccess && (
        <div className="fixed right-4 top-4 z-50 max-w-md animate-in slide-in-from-top-2 rounded-lg border border-green-200 bg-green-50 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />

            <div>
              <p className="text-sm font-medium text-green-800">
                Payment Successful
              </p>

              <p className="text-sm text-green-600">{paySuccess}</p>
            </div>

            <button
              type="button"
              onClick={() => setPaySuccess(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* M-Pesa Modal */}
      {showMpesaModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Pay Employee
              </h3>

              <button
                type="button"
                onClick={() => {
                  setShowMpesaModal(null);
                  setMpesaReference("");
                  setPayError(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Enter the M-Pesa reference number for this payment.
            </p>

            {payError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {payError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                M-Pesa Reference
              </label>

              <input
                type="text"
                value={mpesaReference}
                onChange={(e) => setMpesaReference(e.target.value)}
                placeholder="e.g., QWERTY123"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMpesaModal(null);
                  setMpesaReference("");
                  setPayError(null);
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handlePayEmployee(showMpesaModal)}
                disabled={isPaying === showMpesaModal}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isPaying === showMpesaModal ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Confirm Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

                  <span className="flex-1">{module.name}</span>

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
          {/* Welcome banner */}
          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5">
                  <CircleDollarSign className="h-3.5 w-3.5 text-blue-300" />

                  <span className="text-xs font-semibold text-blue-200">
                    Daily Wages
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {greeting}, {firstName}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Casual Employee Payroll
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  View and manage weekly payroll for casual employees.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 lg:flex">
                  <CircleDollarSign className="h-8 w-8 text-blue-300" />
                </div>
              </div>
            </div>
          </section>

          {/* Summary Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Users}
              label="Total Employees"
              value={stats.total}
              iconClass="bg-slate-100 text-slate-700"
            />

            <SummaryCard
              icon={Clock}
              label="Pending"
              value={stats.pending}
              iconClass="bg-yellow-50 text-yellow-600"
            />

            <SummaryCard
              icon={CheckCircle}
              label="Paid"
              value={stats.paid}
              iconClass="bg-green-50 text-green-600"
            />

            <SummaryCard
              icon={DollarSign}
              label="Total Due"
              value={formatCurrency(summary?.total_amount_due || 0)}
              iconClass="bg-blue-50 text-blue-600"
            />
          </section>

          {/* Payroll Period */}
          {summary?.payroll_period && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Calendar className="h-5 w-5 text-slate-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Current Payroll Period
                    </p>

                    <p className="text-sm text-slate-500">
                      {formatDateFull(summary.payroll_period.start_date)} —{" "}
                      {formatDateFull(summary.payroll_period.end_date)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(summary.total_amount_due || 0)}
                    </span>

                    <span className="text-slate-400">due</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-green-600">
                      {formatCurrency(summary.total_amount_paid || 0)}
                    </span>

                    <span className="text-green-400">paid</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-yellow-600">
                      {formatCurrency(summary.total_amount_pending || 0)}
                    </span>

                    <span className="text-yellow-400">pending</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Filters */}
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-slate-500">
              {filteredPayrolls.length} employee
              {filteredPayrolls.length !== 1 ? "s" : ""}
            </div>
          </section>

          {/* Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Casual Employee Payroll
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Payroll records and payment status
                  </p>
                </div>

                <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {filteredPayrolls.length} Records
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Employee
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      ID
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Days Worked
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Daily Wage
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount Due
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-slate-300" />

                          <p className="font-medium text-slate-600">
                            No payroll records found
                          </p>

                          <p className="text-xs text-slate-400">
                            {searchTerm || statusFilter !== "all"
                              ? "Try adjusting your filters"
                              : "No casual employees have been processed yet"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayrolls.map((payroll) => (
                      <tr
                        key={payroll.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                              {payroll.employee_name.charAt(0).toUpperCase()}
                            </div>

                            <span className="font-semibold text-slate-900">
                              {payroll.employee_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-600">
                          {payroll.employee_id}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {payroll.days_worked} day
                          {payroll.days_worked !== 1 ? "s" : ""}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatCurrency(payroll.daily_wage)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(payroll.amount_due)}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {getStatusBadge(payroll.payment_status)}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {payroll.payment_status === "pending" ||
                          payroll.payment_status === "processing" ? (
                            <button
                              type="button"
                              onClick={() => setShowMpesaModal(payroll.id)}
                              disabled={isPaying === payroll.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                              {isPaying === payroll.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="h-3.5 w-3.5" />
                              )}

                              Pay
                            </button>
                          ) : payroll.payment_status === "paid" ? (
                            <span className="text-xs font-medium text-green-600">
                              ✓ Paid
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-red-600">
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing {startIndex + 1}–
                  {Math.min(
                    startIndex + ITEMS_PER_PAGE,
                    filteredPayrolls.length,
                  )}{" "}
                  of {filteredPayrolls.length}
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      type="button"
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition ${
                        page === currentPage
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} NYUTU LIMITED</p>

              <p>Management Portal · Manager Access</p>
            </div>
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
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}