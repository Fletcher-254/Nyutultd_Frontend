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
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  DollarSign,
  CreditCard,
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
  const statusMap: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
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
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

export default function DailyWagesPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
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

  const authenticatedFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
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
          // Keep the default error message.
        }

        throw new Error(message);
      }

      return response.json();
    },
    [router]
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

      // Check role
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
        body: JSON.stringify({ mpesa_reference: mpesaReference.trim() }),
      });

      // Refresh data
      await loadData();
      setShowMpesaModal(null);
      setMpesaReference("");
      setPaySuccess(`Employee paid successfully with reference: ${mpesaReference}`);
      setTimeout(() => setPaySuccess(null), 5000);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to process payment.");
    } finally {
      setIsPaying(null);
    }
  };

  // Filter and paginate
  const filteredPayrolls = payrolls.filter((payroll) => {
    const matchesSearch =
      payroll.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payroll.employee_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payroll.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPayrolls.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPayrolls = filteredPayrolls.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats
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

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
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
          <p className="mt-4 text-sm font-medium text-white">Loading daily wages...</p>
          <p className="mt-1 text-xs text-slate-400">Fetching payroll data</p>
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
          <h1 className="mt-5 text-lg font-semibold text-slate-900">Unable to load data</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button
            onClick={loadData}
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
      {/* Success Toast */}
      {paySuccess && (
        <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg bg-green-50 border border-green-200 p-4 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Payment Successful</p>
              <p className="text-sm text-green-600">{paySuccess}</p>
            </div>
            <button
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
              <h3 className="text-lg font-semibold text-slate-900">Pay Employee</h3>
              <button
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
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
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
                onClick={() => handlePayEmployee(showMpesaModal)}
                disabled={isPaying === showMpesaModal}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isPaying === showMpesaModal ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Confirm Payment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide">NYUTU LIMITED</p>
            <p className="mt-1 text-xs text-slate-400">Management Portal</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-4 py-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Navigation
          </p>

          <nav className="mt-3 space-y-1">
            <button
              onClick={() => router.push("/manager/dashboard")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </button>

            {modules.map((module) => {
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

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="h-5 w-5 text-slate-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">Manager</p>
                <p className="truncate text-xs text-slate-500">{me?.email}</p>
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
              <p className="text-sm font-medium text-slate-900">Daily Wages</p>
              <p className="text-xs text-slate-500">Manage casual employee payroll</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">{me?.email}</p>
                <p className="text-xs text-slate-500">Manager</p>
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{greeting}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Daily Wages
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  View and manage weekly payroll for casual employees.
                </p>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </section>

          {/* Summary Cards */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Employees</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-yellow-50 p-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pending</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.paid}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-2">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Due</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(summary?.total_amount_due || 0)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Payroll Period Info */}
          {summary?.payroll_period && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Current Payroll Period</p>
                    <p className="text-sm text-slate-500">
                      {formatDateFull(summary.payroll_period.start_date)} — {formatDateFull(summary.payroll_period.end_date)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-slate-600">
                    <span className="font-medium">{formatCurrency(summary.total_amount_due || 0)}</span>
                    <span className="text-slate-400">due</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <span className="font-medium">{formatCurrency(summary.total_amount_paid || 0)}</span>
                    <span className="text-green-400">paid</span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <span className="font-medium">{formatCurrency(summary.total_amount_pending || 0)}</span>
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
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
              {filteredPayrolls.length} employee{filteredPayrolls.length !== 1 ? "s" : ""}
            </div>
          </section>

          {/* Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Days Worked</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Daily Wage</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Amount Due</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-slate-300" />
                          <p>No payroll records found</p>
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
                      <tr key={payroll.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                              {payroll.employee_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">
                              {payroll.employee_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">
                          {payroll.employee_id}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {payroll.days_worked} day{payroll.days_worked !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {formatCurrency(payroll.daily_wage)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                          {formatCurrency(payroll.amount_due)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {getStatusBadge(payroll.payment_status)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {payroll.payment_status === "pending" || payroll.payment_status === "processing" ? (
                            <button
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
                            <span className="text-xs text-green-600 font-medium">✓ Paid</span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">Failed</span>
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
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">
                <div className="text-sm text-slate-500">
                  Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredPayrolls.length)} of{" "}
                  {filteredPayrolls.length}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="mt-9 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} NYUTU LIMITED</p>
              <p>Management Portal · Manager Access</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}