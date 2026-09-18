
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
  ChevronLeft,
  RefreshCw,
  Receipt,
  Wallet,
  Calendar,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  CreditCard,
  Building2,
  PieChart,
  BarChart3,
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
  const methods: Record<
    string,
    {
      color: string;
      icon: React.ReactNode;
      label: string;
    }
  > = {
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

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyExpenses, setDailyExpenses] =
    useState<DailyExpenseResponse | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] =
    useState<MonthlyExpenseResponse | null>(null);
  const [yearlyExpenses, setYearlyExpenses] =
    useState<YearlyExpenseResponse | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [yearlySummary, setYearlySummary] = useState<YearlySummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedExpense, setSelectedExpense] =
    useState<Expense | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

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

      setExpenses(
        Array.isArray(expensesData) ? expensesData : []
      );

      setDailyExpenses(dailyData || null);
      setMonthlyExpenses(monthlyData || null);
      setYearlyExpenses(yearlyData || null);

      setMonthlySummary(
        Array.isArray(monthlySummaryData)
          ? monthlySummaryData
          : []
      );

      setYearlySummary(
        Array.isArray(yearlySummaryData)
          ? yearlySummaryData
          : []
      );

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

  const firstName =
    me?.first_name?.trim() ||
    me?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() ||
    firstName;

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M";

  const categories = useMemo(() => {
    const cats = new Set<string>();

    expenses.forEach((expense) => {
      cats.add(expense.category);
    });

    return Array.from(cats);
  }, [expenses]);

  const filteredExpenses = expenses.filter((expense) => {
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      expense.description
        .toLowerCase()
        .includes(searchLower) ||
      expense.category_display
        .toLowerCase()
        .includes(searchLower) ||
      (expense.receipt_number
        ?.toLowerCase()
        .includes(searchLower) ?? false);

    const matchesCategory =
      categoryFilter === "all" ||
      expense.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(
    filteredExpenses.length / ITEMS_PER_PAGE
  );

  const startIndex =
    (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedExpenses = filteredExpenses.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const stats = {
    total: expenses.length,

    totalAmount: expenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    ),

    todayTotal: Number(
      dailyExpenses?.total || 0
    ),

    monthTotal: Number(
      monthlyExpenses?.total || 0
    ),

    yearTotal: Number(
      yearlyExpenses?.total || 0
    ),
  };

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
      // The user should still be taken out of the dashboard.
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
            Loading expenses...
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Fetching expense records
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
            Unable to load expenses
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            onClick={loadData}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* MOBILE SIDEBAR OVERLAY */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* DETAIL MODAL */}

      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Expense Details
                  </h3>

                  <p className="text-sm text-slate-500">
                    {selectedExpense.category_display}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedExpense(null);
                }}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatDateFull(selectedExpense.expense_date)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Wallet className="h-4 w-4" />
                  <span>Amount</span>
                </div>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatCurrency(selectedExpense.amount)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FileText className="h-4 w-4" />
                  <span>Category</span>
                </div>

                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryColor(
                      selectedExpense.category
                    )}`}
                  >
                    {selectedExpense.category_display}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment Method</span>
                </div>

                <div className="mt-2">
                  {(() => {
                    const method = getPaymentMethodBadge(
                      selectedExpense.payment_method
                    );

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${method.color}`}
                      >
                        {method.icon}
                        {method.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FileText className="h-4 w-4" />
                  <span>Description</span>
                </div>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
                  {selectedExpense.description}
                </p>
              </div>

              {selectedExpense.receipt_number && (
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="h-4 w-4" />
                    <span>Receipt Number</span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedExpense.receipt_number}
                  </p>
                </div>
              )}

              {selectedExpense.remarks && (
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="h-4 w-4" />
                    <span>Remarks</span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-900">
                    {selectedExpense.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedExpense(null);
                }}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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

                  {active && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

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

      {/* MAIN */}

      <main className="min-h-screen lg:pl-72">
        {/* HEADER */}

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
          {/* WELCOME */}

          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />

                  <span className="text-xs font-semibold text-blue-200">
                    Manager Expenses
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {greeting}, {firstName}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Expense Management
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Track and monitor all company expenses across
                  categories from one place.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </button>

                <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/10 lg:flex">
                  <Receipt className="h-8 w-8 text-blue-300" />
                </div>
              </div>
            </div>
          </section>

          {/* STATS */}

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <Receipt className="h-5 w-5 text-slate-700" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    Total Expenses
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    Total Amount
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    This Month
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {formatCurrency(stats.monthTotal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    Today
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {formatCurrency(stats.todayTotal)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* OPERATIONS / QUICK SUMMARY */}

          <section className="mb-6">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Operations
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Expense Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review recent expense activity and financial summaries.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {dailyExpenses &&
                dailyExpenses.expenses.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Today&apos;s Expenses
                          </h3>

                          <p className="text-xs text-slate-500">
                            Recent daily activity
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {formatCurrency(dailyExpenses.total)}
                      </span>
                    </div>

                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {dailyExpenses.expenses
                        .slice(0, 5)
                        .map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {expense.description}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {expense.category_display}
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-bold text-slate-900">
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>
                        ))}

                      {dailyExpenses.expenses.length > 5 && (
                        <p className="pt-1 text-center text-xs font-medium text-slate-400">
                          +
                          {dailyExpenses.expenses.length - 5}{" "}
                          more
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                      <p className="text-sm font-medium text-slate-500">
                        Total
                      </p>

                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(dailyExpenses.total)}
                      </p>
                    </div>
                  </div>
                )}

              {monthlyExpenses &&
                monthlyExpenses.expenses.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                          <Calendar className="h-5 w-5 text-emerald-600" />
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {monthlyExpenses.month}
                          </h3>

                          <p className="text-xs text-slate-500">
                            Top monthly expenses
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {formatCurrency(monthlyExpenses.total)}
                      </span>
                    </div>

                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {monthlyExpenses.expenses
                        .slice(0, 5)
                        .map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {expense.description}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {expense.category_display}
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-bold text-slate-900">
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>
                        ))}

                      {monthlyExpenses.expenses.length > 5 && (
                        <p className="pt-1 text-center text-xs font-medium text-slate-400">
                          +
                          {monthlyExpenses.expenses.length - 5}{" "}
                          more
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                      <p className="text-sm font-medium text-slate-500">
                        Total
                      </p>

                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(monthlyExpenses.total)}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* TABS */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex overflow-x-auto border-b border-slate-200 px-2 sm:px-4">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <PieChart className="h-4 w-4" />
                Overview
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("expenses")}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition ${
                  activeTab === "expenses"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Receipt className="h-4 w-4" />
                All Expenses
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition ${
                  activeTab === "summary"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Summary Reports
              </button>
            </div>

            {/* TAB CONTENT */}

            <div className="p-4 sm:p-6">
              {/* OVERVIEW */}

              {activeTab === "overview" && (
                <div className="grid gap-6 md:grid-cols-2">
                  {monthlySummary.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900">
                              Monthly Summary
                            </h3>

                            <p className="text-xs text-slate-500">
                              Recent monthly totals
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Month
                              </th>

                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                Total
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {monthlySummary
                              .slice(0, 6)
                              .map((item) => (
                                <tr
                                  key={String(item.month)}
                                  className="transition hover:bg-slate-50/70"
                                >
                                  <td className="px-4 py-3 text-slate-600">
                                    {formatDate(
                                      String(item.month)
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                                    {formatCurrency(item.total)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {yearlySummary.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900">
                              Yearly Summary
                            </h3>

                            <p className="text-xs text-slate-500">
                              Annual expense totals
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Year
                              </th>

                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                Total
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {yearlySummary.map((item) => (
                              <tr
                                key={String(item.year)}
                                className="transition hover:bg-slate-50/70"
                              >
                                <td className="px-4 py-3 text-slate-600">
                                  {String(item.year)}
                                </td>

                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                  {formatCurrency(item.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {monthlySummary.length === 0 &&
                    yearlySummary.length === 0 && (
                      <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                        <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No summary reports available
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Summary information will appear here when
                          expense records are available.
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* ALL EXPENSES */}

              {activeTab === "expenses" && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                          <Receipt className="h-5 w-5 text-blue-600" />
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900">
                            All Expenses
                          </h3>

                          <p className="text-xs text-slate-500">
                            Browse and review recorded expenses
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
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
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-60"
                        />
                      </div>

                      <select
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="all">
                          All Categories
                        </option>

                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) =>
                                l.toUpperCase()
                              )}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Date
                          </th>

                          <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Description
                          </th>

                          <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Category
                          </th>

                          <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                            Amount
                          </th>

                          <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Payment
                          </th>

                          <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {paginatedExpenses.map((expense) => {
                          const paymentMethod =
                            getPaymentMethodBadge(
                              expense.payment_method
                            );

                          return (
                            <tr
                              key={expense.id}
                              className="transition hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-4 text-slate-600">
                                {formatDate(
                                  expense.expense_date
                                )}
                              </td>

                              <td className="max-w-xs px-4 py-4 font-semibold text-slate-900">
                                <span className="block truncate">
                                  {expense.description}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryColor(
                                    expense.category
                                  )}`}
                                >
                                  {expense.category_display}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-right font-bold text-slate-900">
                                {formatCurrency(expense.amount)}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentMethod.color}`}
                                >
                                  {paymentMethod.icon}
                                  {paymentMethod.label}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setShowDetailModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
                            <td
                              colSpan={6}
                              className="px-4 py-12 text-center"
                            >
                              <div className="flex flex-col items-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                                  <Receipt className="h-6 w-6 text-slate-400" />
                                </div>

                                <p className="mt-3 text-sm font-semibold text-slate-700">
                                  No expenses found
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {searchTerm ||
                                  categoryFilter !== "all"
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
                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-500">
                        Showing {startIndex + 1}–
                        {Math.min(
                          startIndex + ITEMS_PER_PAGE,
                          filteredExpenses.length
                        )}{" "}
                        of {filteredExpenses.length}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((p) =>
                              Math.max(1, p - 1)
                            )
                          }
                          disabled={currentPage === 1}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            type="button"
                            key={page}
                            onClick={() =>
                              setCurrentPage(page)
                            }
                            className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                              page === currentPage
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((p) =>
                              Math.min(
                                totalPages,
                                p + 1
                              )
                            )
                          }
                          disabled={
                            currentPage === totalPages
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUMMARY */}

              {activeTab === "summary" && (
                <div className="grid gap-6 md:grid-cols-2">
                  {yearlyExpenses && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                            <Calendar className="h-5 w-5 text-orange-600" />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900">
                              {yearlyExpenses.year} - Yearly Expenses
                            </h3>

                            <p className="text-xs text-slate-500">
                              Total:{" "}
                              {formatCurrency(
                                yearlyExpenses.total
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                          <thead className="sticky top-0 bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Date
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Description
                              </th>

                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                Amount
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {yearlyExpenses.expenses
                              .slice(0, 20)
                              .map((expense) => (
                                <tr
                                  key={expense.id}
                                  className="transition hover:bg-slate-50/70"
                                >
                                  <td className="px-4 py-3 text-xs text-slate-600">
                                    {formatDate(
                                      expense.expense_date
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                    {expense.description}
                                  </td>

                                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                                    {formatCurrency(
                                      expense.amount
                                    )}
                                  </td>
                                </tr>
                              ))}

                            {yearlyExpenses.expenses.length ===
                              0 && (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-4 py-10 text-center text-sm text-slate-500"
                                >
                                  No expenses for this year
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {monthlySummary.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900">
                              Monthly Expense Trends
                            </h3>

                            <p className="text-xs text-slate-500">
                              Month-over-month comparison
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                Month
                              </th>

                              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                                Total
                              </th>

                              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                                Trend
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {monthlySummary.map(
                              (item, index) => {
                                const currentTotal =
                                  Number(item.total);

                                const prevTotal =
                                  index <
                                  monthlySummary.length - 1
                                    ? Number(
                                        monthlySummary[
                                          index + 1
                                        ].total
                                      )
                                    : currentTotal;

                                const diff =
                                  currentTotal -
                                  prevTotal;

                                const isUp = diff > 0;

                                return (
                                  <tr
                                    key={String(
                                      item.month
                                    )}
                                    className="transition hover:bg-slate-50/70"
                                  >
                                    <td className="px-4 py-3 text-slate-600">
                                      {formatDate(
                                        String(
                                          item.month
                                        )
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                                      {formatCurrency(
                                        item.total
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                      {index <
                                        monthlySummary.length -
                                          1 && (
                                        <span
                                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                                            isUp
                                              ? "bg-red-50 text-red-600"
                                              : "bg-emerald-50 text-emerald-600"
                                          }`}
                                        >
                                          {isUp ? (
                                            <TrendingUp className="h-3.5 w-3.5" />
                                          ) : (
                                            <TrendingDown className="h-3.5 w-3.5" />
                                          )}

                                          {Math.abs(diff) > 0
                                            ? formatCurrency(
                                                Math.abs(
                                                  diff
                                                )
                                              )
                                            : "0"}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!yearlyExpenses &&
                    monthlySummary.length === 0 && (
                      <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                        <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No summary data available
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Expense summary reports will appear here
                          when data is available.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          </section>

          {/* PROFILE */}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-700">
                  {initials}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Account
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {fullName}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {me?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />

                <div>
                  <p className="text-xs font-bold text-emerald-700">
                    Manager Account
                  </p>

                  <p className="text-[11px] text-emerald-600">
                    Authorized access
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER */}

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
