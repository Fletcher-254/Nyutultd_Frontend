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
  Loader2,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  RefreshCw,
  Receipt,
  Wallet,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  FileText,
  CreditCard,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  PieChart,
  BarChart3,
  Plus,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Role = "admin" | "manager" | "director";

interface Me {
  id: number;
  email: string;
  role: Role;
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

interface DailyExpenseResponse {
  date: string;
  total: number | string;
  expenses: Expense[];
}

interface MonthlyExpenseResponse {
  month: string;
  total: number | string;
  expenses: Expense[];
}

interface YearlyExpenseResponse {
  year: number;
  total: number | string;
  expenses: Expense[];
}

interface MonthlySummary {
  month: string;
  total: number | string;
}

interface YearlySummary {
  year: string;
  total: number | string;
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

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    utilities: "bg-blue-50 text-blue-700 border-blue-200",
    rent: "bg-purple-50 text-purple-700 border-purple-200",
    salaries: "bg-green-50 text-green-700 border-green-200",
    transport: "bg-orange-50 text-orange-700 border-orange-200",
    office_supplies: "bg-yellow-50 text-yellow-700 border-yellow-200",
    maintenance: "bg-red-50 text-red-700 border-red-200",
    insurance: "bg-indigo-50 text-indigo-700 border-indigo-200",
    marketing: "bg-pink-50 text-pink-700 border-pink-200",
    travel: "bg-cyan-50 text-cyan-700 border-cyan-200",
    food: "bg-amber-50 text-amber-700 border-amber-200",
    other: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return colors[category] || colors.other;
}

function getPaymentMethodBadge(method: string) {
  const methods: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    cash: {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <Wallet className="h-3.5 w-3.5" />,
      label: "Cash",
    },
    bank_transfer: {
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: "Bank Transfer",
    },
    mpesa: {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <CreditCard className="h-3.5 w-3.5" />,
      label: "M-Pesa",
    },
    cheque: {
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <FileText className="h-3.5 w-3.5" />,
      label: "Cheque",
    },
    other: {
      color: "bg-slate-50 text-slate-700 border-slate-200",
      icon: <Wallet className="h-3.5 w-3.5" />,
      label: "Other",
    },
  };

  return methods[method] || methods.other;
}

type Tab = "overview" | "expenses" | "summary";

export default function ManagerExpensesPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpenseResponse | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpenseResponse | null>(null);
  const [yearlyExpenses, setYearlyExpenses] = useState<YearlyExpenseResponse | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [yearlySummary, setYearlySummary] = useState<YearlySummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const ITEMS_PER_PAGE = 10;

  const authenticatedFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API}${endpoint}`, {
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
      const [
        meData,
        expensesData,
        dailyData,
        monthlyData,
        yearlyData,
        monthlySummaryData,
        yearlySummaryData,
      ] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/expenses/"),
        authenticatedFetch("/expenses/daily/"),
        authenticatedFetch("/expenses/monthly/"),
        authenticatedFetch("/expenses/yearly/"),
        authenticatedFetch("/expenses/monthly-summary/"),
        authenticatedFetch("/expenses/yearly-summary/"),
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
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setDailyExpenses(dailyData || null);
      setMonthlyExpenses(monthlyData || null);
      setYearlyExpenses(yearlyData || null);
      setMonthlySummary(Array.isArray(monthlySummaryData) ? monthlySummaryData : []);
      setYearlySummary(Array.isArray(yearlySummaryData) ? yearlySummaryData : []);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load expenses data.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach((exp) => cats.add(exp.category));
    return Array.from(cats);
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      expense.description.toLowerCase().includes(searchLower) ||
      expense.category_display.toLowerCase().includes(searchLower) ||
      (expense.receipt_number?.toLowerCase().includes(searchLower) ?? false);

    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats
  const stats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    todayTotal: Number(dailyExpenses?.total || 0),
    monthTotal: Number(monthlyExpenses?.total || 0),
    yearTotal: Number(yearlyExpenses?.total || 0),
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const handleLogout = async () => {
    try {
      await fetch(`${API}/logout/`, {
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
          <p className="mt-4 text-sm font-medium text-white">Loading expenses...</p>
          <p className="mt-1 text-xs text-slate-400">Fetching expense records</p>
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
      {/* Detail Modal */}
      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Receipt className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Expense Details
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedExpense.category_display}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedExpense(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatDateFull(selectedExpense.expense_date)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Wallet className="h-4 w-4" />
                  <span>Amount</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatCurrency(selectedExpense.amount)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FileText className="h-4 w-4" />
                  <span>Category</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getCategoryColor(selectedExpense.category)}`}>
                    {selectedExpense.category_display}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment Method</span>
                </div>
                <div className="mt-2">
                  {(() => {
                    const method = getPaymentMethodBadge(selectedExpense.payment_method);
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${method.color}`}>
                        {method.icon}
                        {method.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FileText className="h-4 w-4" />
                  <span>Description</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedExpense.description}
                </p>
              </div>

              {selectedExpense.receipt_number && (
                <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="h-4 w-4" />
                    <span>Receipt Number</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {selectedExpense.receipt_number}
                  </p>
                </div>
              )}

              {selectedExpense.remarks && (
                <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="h-4 w-4" />
                    <span>Remarks</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {selectedExpense.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedExpense(null);
                }}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
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
              <p className="text-sm font-medium text-slate-900">Expenses</p>
              <p className="text-xs text-slate-500">Manage company expenses</p>
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
                  Expense Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Track and monitor all company expenses across categories.
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
                  <Receipt className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Expenses</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Amount</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">This Month</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(stats.monthTotal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-50 p-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Today</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(stats.todayTotal)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Daily & Monthly Summary */}
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {dailyExpenses && dailyExpenses.expenses.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>Today's Expenses</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dailyExpenses.expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{expense.description}</p>
                        <p className="text-xs text-slate-500">{expense.category_display}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  ))}
                  {dailyExpenses.expenses.length > 5 && (
                    <p className="text-xs text-slate-400 text-center">
                      +{dailyExpenses.expenses.length - 5} more
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-slate-600">Total</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(dailyExpenses.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {monthlyExpenses && monthlyExpenses.expenses.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>{monthlyExpenses.month} - Top Expenses</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {monthlyExpenses.expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{expense.description}</p>
                        <p className="text-xs text-slate-500">{expense.category_display}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  ))}
                  {monthlyExpenses.expenses.length > 5 && (
                    <p className="text-xs text-slate-400 text-center">
                      +{monthlyExpenses.expenses.length - 5} more
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-slate-600">Total</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(monthlyExpenses.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Tabs */}
          <section className="mt-6 border-b border-slate-200">
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
                  activeTab === "overview"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab("expenses")}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
                  activeTab === "expenses"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  All Expenses
                </div>
              </button>
              <button
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
                  activeTab === "summary"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Summary Reports
                </div>
              </button>
            </div>
          </section>

          {/* Tab Content */}
          <section className="mt-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Monthly Summary */}
                {monthlySummary.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Monthly Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">Month</th>
                            <th className="px-4 py-2.5 text-right font-medium text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthlySummary.slice(0, 6).map((item) => (
                            <tr key={String(item.month)} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 text-slate-600">
                                {formatDate(String(item.month))}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Yearly Summary */}
                {yearlySummary.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Yearly Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">Year</th>
                            <th className="px-4 py-2.5 text-right font-medium text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {yearlySummary.map((item) => (
                            <tr key={String(item.year)} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 text-slate-600">
                                {String(item.year)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expenses Tab */}
            {activeTab === "expenses" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-slate-900">All Expenses</h3>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full sm:w-56 rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Payment</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedExpenses.map((expense) => {
                        const paymentMethod = getPaymentMethodBadge(expense.payment_method);
                        return (
                          <tr key={expense.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3.5 text-slate-600">
                              {formatDate(expense.expense_date)}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-slate-900">
                              {expense.description}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getCategoryColor(expense.category)}`}>
                                {expense.category_display}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${paymentMethod.color}`}>
                                {paymentMethod.icon}
                                {paymentMethod.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setShowDetailModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedExpenses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                              <Receipt className="h-8 w-8 text-slate-300" />
                              <p>No expenses found</p>
                              <p className="text-xs text-slate-400">
                                {searchTerm || categoryFilter !== "all"
                                  ? "Try adjusting your filters"
                                  : "No expenses have been recorded yet"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">
                    <div className="text-sm text-slate-500">
                      Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredExpenses.length)} of{" "}
                      {filteredExpenses.length}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Yearly Summary */}
                {yearlyExpenses && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">
                        {yearlyExpenses.year} - Yearly Expenses
                      </h3>
                      <p className="text-xs text-slate-500">
                        Total: {formatCurrency(yearlyExpenses.total)}
                      </p>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">Date</th>
                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">Description</th>
                            <th className="px-4 py-2.5 text-right font-medium text-slate-600">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {yearlyExpenses.expenses.slice(0, 20).map((expense) => (
                            <tr key={expense.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 text-slate-600 text-xs">
                                {formatDate(expense.expense_date)}
                              </td>
                              <td className="px-4 py-2 text-slate-900 text-sm">
                                {expense.description}
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900">
                                {formatCurrency(expense.amount)}
                              </td>
                            </tr>
                          ))}
                          {yearlyExpenses.expenses.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                                No expenses for this year
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Monthly Summary */}
                {monthlySummary.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Monthly Expense Trends</h3>
                      <p className="text-xs text-slate-500">Year-over-year comparison</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-slate-600">Month</th>
                            <th className="px-4 py-2.5 text-right font-medium text-slate-600">Total</th>
                            <th className="px-4 py-2.5 text-center font-medium text-slate-600">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthlySummary.map((item, index) => {
                            const currentTotal = Number(item.total);
                            const prevTotal = index < monthlySummary.length - 1 
                              ? Number(monthlySummary[index + 1].total) 
                              : currentTotal;
                            const diff = currentTotal - prevTotal;
                            const isUp = diff > 0;
                            
                            return (
                              <tr key={String(item.month)} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 text-slate-600">
                                  {formatDate(String(item.month))}
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                                  {formatCurrency(item.total)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {index < monthlySummary.length - 1 && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isUp ? "text-red-600" : "text-green-600"}`}>
                                      {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                      {Math.abs(diff) > 0 ? formatCurrency(Math.abs(diff)) : "0"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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