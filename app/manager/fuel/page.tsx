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
  ChevronLeft,
  Eye,
  Calendar,
  Loader2,
  AlertCircle,
  Search,
  RefreshCw,
  FileText,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Droplet,
  Wallet,
  Gauge,
  ShieldCheck,
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

interface FuelPurchase {
  id: number;
  fuel_date: string;
  supplier: string;
  litres: number | string;
  cost: number | string;
  receipt_reference?: string | null;
  receipt_file?: string | null;
  created_at: string;
}

interface FuelIssue {
  id: number;
  vehicle: number | string;
  vehicle_name?: string | null;
  fuel_date: string;
  litres: number | string;
  odometer_reading?: number | string | null;
  remarks?: string | null;
  created_at: string;
}

interface FuelSummary {
  date?: string;
  year?: number | string;
  month?: number | string;
  fuel_purchased_litres: number | string;
  fuel_issued_litres: number | string;
  fuel_remaining_litres: number | string;
  fuel_cost: number | string;
}

interface FuelReconciliation {
  total_fuel_purchased: number | string;
  total_fuel_issued: number | string;
  expected_fuel_balance: number | string;
  total_purchase_cost: number | string;
}

interface VehicleEfficiency {
  vehicle: number | string;
  operator?: string | null;
  opening_odometer?: number | string | null;
  closing_odometer?: number | string | null;
  distance_travelled?: number | string | null;
  fuel_used_litres?: number | string | null;
  fuel_efficiency?: number | string | null;
  unit?: string | null;
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

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateFull(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

type Tab = "overview" | "purchases" | "issues" | "efficiency";

const ITEMS_PER_PAGE = 10;

export default function ManagerFuelPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [me, setMe] = useState<Me | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [issues, setIssues] = useState<FuelIssue[]>([]);
  const [dailySummary, setDailySummary] = useState<FuelSummary | null>(
    null
  );
  const [monthlySummary, setMonthlySummary] =
    useState<FuelSummary | null>(null);
  const [reconciliation, setReconciliation] =
    useState<FuelReconciliation | null>(null);
  const [efficiency, setEfficiency] = useState<VehicleEfficiency[]>([]);

  const [loading, setLoading] = useState(true);
  const [loggingRefresh, setLoggingRefresh] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedItem, setSelectedItem] = useState<
    FuelPurchase | FuelIssue | null
  >(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailType, setDetailType] = useState<"purchase" | "issue" | null>(
    null
  );

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

  const loadData = useCallback(
    async (showRefreshSpinner = false) => {
      if (showRefreshSpinner) {
        setLoggingRefresh(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          meData,
          purchasesData,
          issuesData,
          dailyData,
          monthlyData,
          reconciliationData,
          efficiencyData,
        ] = await Promise.all([
          authenticatedFetch("/me/"),
          authenticatedFetch("/fuel/purchases/"),
          authenticatedFetch("/fuel/issues/"),
          authenticatedFetch("/fuel/reports/daily/"),
          authenticatedFetch("/fuel/reports/monthly/"),
          authenticatedFetch("/fuel/reports/reconciliation/"),
          authenticatedFetch("/fuel/efficiency/fleet/"),
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
        setPurchases(extractArray<FuelPurchase>(purchasesData));
        setIssues(extractArray<FuelIssue>(issuesData));

        setDailySummary(
          Array.isArray(dailyData)
            ? dailyData[0] || null
            : dailyData || null
        );

        setMonthlySummary(
          Array.isArray(monthlyData)
            ? monthlyData[0] || null
            : monthlyData || null
        );

        setReconciliation(reconciliationData);

        setEfficiency(
          extractArray<VehicleEfficiency>(efficiencyData)
        );
      } catch (err) {
        if (err instanceof Error && err.message) {
          setError(err.message);
        } else {
          setError("Unable to load fuel information.");
        }
      } finally {
        setLoading(false);
        setLoggingRefresh(false);
      }
    },
    [authenticatedFetch, router]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

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

  const initials = useMemo(() => {
    const names = fullName
      .split(" ")
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }

    return firstName.charAt(0).toUpperCase();
  }, [fullName, firstName]);

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

  const stats = useMemo(() => {
    const totalPurchases = purchases.length;
    const totalIssues = issues.length;

    const totalLitresPurchased = purchases.reduce(
      (total, purchase) => total + Number(purchase.litres || 0),
      0
    );

    const totalLitresIssued = issues.reduce(
      (total, issue) => total + Number(issue.litres || 0),
      0
    );

    const totalCost = purchases.reduce(
      (total, purchase) => total + Number(purchase.cost || 0),
      0
    );

    return {
      totalPurchases,
      totalIssues,
      totalLitresPurchased,
      totalLitresIssued,
      totalCost,
    };
  }, [purchases, issues]);

  const filteredPurchases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return purchases;
    }

    return purchases.filter((purchase) => {
      return (
        purchase.supplier?.toLowerCase().includes(term) ||
        purchase.receipt_reference?.toLowerCase().includes(term) ||
        purchase.fuel_date?.toLowerCase().includes(term)
      );
    });
  }, [purchases, searchTerm]);

  const filteredIssues = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return issues;
    }

    return issues.filter((issue) => {
      return (
        issue.vehicle_name?.toLowerCase().includes(term) ||
        String(issue.vehicle).toLowerCase().includes(term) ||
        issue.remarks?.toLowerCase().includes(term) ||
        issue.fuel_date?.toLowerCase().includes(term)
      );
    });
  }, [issues, searchTerm]);

  const filteredEfficiency = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return efficiency;
    }

    return efficiency.filter((item) => {
      return (
        String(item.vehicle).toLowerCase().includes(term) ||
        item.operator?.toLowerCase().includes(term) ||
        item.unit?.toLowerCase().includes(term)
      );
    });
  }, [efficiency, searchTerm]);

  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredPurchases.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPurchases, currentPage]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredIssues.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredIssues, currentPage]);

  const paginatedEfficiency = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredEfficiency.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEfficiency, currentPage]);

  const currentTotal = useMemo(() => {
    if (activeTab === "purchases") {
      return filteredPurchases.length;
    }

    if (activeTab === "issues") {
      return filteredIssues.length;
    }

    if (activeTab === "efficiency") {
      return filteredEfficiency.length;
    }

    return 0;
  }, [
    activeTab,
    filteredPurchases.length,
    filteredIssues.length,
    filteredEfficiency.length,
  ]);

  const totalPages = Math.max(
    Math.ceil(currentTotal / ITEMS_PER_PAGE),
    1
  );

  const openPurchase = (purchase: FuelPurchase) => {
    setSelectedItem(purchase);
    setDetailType("purchase");
    setShowDetailModal(true);
  };

  const openIssue = (issue: FuelIssue) => {
    setSelectedItem(issue);
    setDetailType("issue");
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setDetailType(null);
    setShowDetailModal(false);
  };

  const getEfficiencyColor = (value: number | string | null | undefined) => {
    const number = Number(value || 0);

    if (number >= 10) {
      return "text-emerald-600 bg-emerald-50";
    }

    if (number >= 5) {
      return "text-amber-600 bg-amber-50";
    }

    if (number > 0) {
      return "text-red-600 bg-red-50";
    }

    return "text-slate-500 bg-slate-50";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Loading fuel management...
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
            Unable to load fuel information
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => loadData()}
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
              {initials}
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
                {initials}
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
                  <Fuel className="h-3.5 w-3.5 text-blue-300" />

                  <span className="text-xs font-semibold text-blue-200">
                    Fuel Management
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {greeting}, {firstName}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Fuel Operations
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Monitor fuel purchases, issues, balances, costs and vehicle
                  efficiency across the fleet.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  disabled={loggingRefresh}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loggingRefresh ? "animate-spin" : ""
                    }`}
                  />
                  {loggingRefresh ? "Refreshing..." : "Refresh"}
                </button>

                <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/10 lg:flex">
                  <Fuel className="h-8 w-8 text-blue-300" />
                </div>
              </div>
            </div>
          </section>

          {/* Summary cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Purchases
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.totalPurchases}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(stats.totalLitresPurchased)} L purchased
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Droplet className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Issues
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {stats.totalIssues}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(stats.totalLitresIssued)} L issued
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                  <Fuel className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Fuel Balance
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {formatNumber(
                      reconciliation?.expected_fuel_balance ??
                        dailySummary?.fuel_remaining_litres ??
                        0
                    )}{" "}
                    L
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Expected remaining
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Purchase Cost
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {formatCurrency(stats.totalCost)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Recorded purchases
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                  <Wallet className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </div>
          </section>

          {/* Daily and monthly summaries */}
          <section className="mb-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Fuel Overview
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                Fuel Summary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current fuel movement and cost information.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Daily */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                      Daily
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      Daily Fuel Summary
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {dailySummary?.date
                        ? formatDateFull(dailySummary.date)
                        : "Current reporting period"}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Purchased
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatNumber(
                        dailySummary?.fuel_purchased_litres || 0
                      )}{" "}
                      L
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Issued
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatNumber(
                        dailySummary?.fuel_issued_litres || 0
                      )}{" "}
                      L
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Remaining
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatNumber(
                        dailySummary?.fuel_remaining_litres || 0
                      )}{" "}
                      L
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Cost
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatCurrency(dailySummary?.fuel_cost || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Monthly */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                      Monthly
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      Monthly Fuel Summary
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Current monthly reporting period
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                    <BarChart3 className="h-5 w-5 text-violet-600" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Purchased
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatNumber(
                        monthlySummary?.fuel_purchased_litres || 0
                      )}{" "}
                      L
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Issued
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatNumber(
                        monthlySummary?.fuel_issued_litres || 0
                      )}{" "}
                      L
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Remaining
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatNumber(
                        monthlySummary?.fuel_remaining_litres || 0
                      )}{" "}
                      L
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Cost
                    </p>

                    <p className="mt-2 text-lg font-black text-slate-950">
                      {formatCurrency(monthlySummary?.fuel_cost || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Reconciliation */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
                    Control
                  </p>

                  <h2 className="mt-1 text-base font-bold text-slate-900">
                    Fuel Reconciliation
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Compare purchases, issues and expected fuel balance.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-blue-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Purchased
                  </p>

                  <p className="mt-1 text-sm font-black text-blue-950">
                    {formatNumber(
                      reconciliation?.total_fuel_purchased || 0
                    )}{" "}
                    L
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                    Issued
                  </p>

                  <p className="mt-1 text-sm font-black text-orange-950">
                    {formatNumber(
                      reconciliation?.total_fuel_issued || 0
                    )}{" "}
                    L
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Balance
                  </p>

                  <p className="mt-1 text-sm font-black text-emerald-950">
                    {formatNumber(
                      reconciliation?.expected_fuel_balance || 0
                    )}{" "}
                    L
                  </p>
                </div>

                <div className="rounded-xl bg-violet-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                    Cost
                  </p>

                  <p className="mt-1 text-sm font-black text-violet-950">
                    {formatCurrency(
                      reconciliation?.total_purchase_cost || 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <section className="mb-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === "overview"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Overview
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("purchases")}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === "purchases"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Droplet className="h-4 w-4" />
                  Purchases
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("issues")}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === "issues"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Fuel className="h-4 w-4" />
                  Issues
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("efficiency")}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === "efficiency"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Gauge className="h-4 w-4" />
                  Efficiency
                </button>
              </div>
            </div>
          </section>

          {/* Overview */}
          {activeTab === "overview" && (
            <section className="space-y-6">
              {/* Recent purchases */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                      Purchases
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      Recent Fuel Purchases
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Latest recorded fuel purchases.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("purchases")}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Litres
                        </th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {purchases.slice(0, 5).map((purchase) => (
                        <tr
                          key={purchase.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            {formatDate(purchase.fuel_date)}
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {purchase.supplier || "—"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {purchase.receipt_reference || "No receipt reference"}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                            {formatNumber(purchase.litres)} L
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                            {formatCurrency(purchase.cost)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openPurchase(purchase)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}

                      {purchases.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-12 text-center"
                          >
                            <Droplet className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-700">
                              No fuel purchases recorded
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Purchase records will appear here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent issues */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                      Issues
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      Recent Fuel Issues
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Latest fuel issued to vehicles.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("issues")}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Vehicle
                        </th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Litres
                        </th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Odometer
                        </th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {issues.slice(0, 5).map((issue) => (
                        <tr
                          key={issue.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            {formatDate(issue.fuel_date)}
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {issue.vehicle_name ||
                                `Vehicle ${issue.vehicle}`}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              Vehicle ID: {issue.vehicle}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                            {formatNumber(issue.litres)} L
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">
                            {formatNumber(issue.odometer_reading)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openIssue(issue)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}

                      {issues.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-12 text-center"
                          >
                            <Fuel className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-700">
                              No fuel issues recorded
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Fuel issue records will appear here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Purchases */}
          {activeTab === "purchases" && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                      Records
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      Fuel Purchases
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      View recorded fuel purchases and receipt references.
                    </p>
                  </div>

                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search purchases..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Date
                      </th>

                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Supplier
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Litres
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Cost
                      </th>

                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Receipt
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedPurchases.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {formatDate(purchase.fuel_date)}
                        </td>

                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {purchase.supplier || "—"}
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                          {formatNumber(purchase.litres)} L
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                          {formatCurrency(purchase.cost)}
                        </td>

                        <td className="px-6 py-4">
                          {purchase.receipt_reference ? (
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <FileText className="h-4 w-4 text-slate-400" />
                              {purchase.receipt_reference}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No reference
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openPurchase(purchase)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {paginatedPurchases.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-14 text-center"
                        >
                          <Search className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No purchases found
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Try changing your search.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredPurchases.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        filteredPurchases.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredPurchases.length}
                    </span>{" "}
                    purchases
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(page - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(page + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Issues */}
          {activeTab === "issues" && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                      Records
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      Fuel Issues
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      View fuel issued to vehicles across the fleet.
                    </p>
                  </div>

                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search issues..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Date
                      </th>

                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Vehicle
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Litres
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Odometer
                      </th>

                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Remarks
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedIssues.map((issue) => (
                      <tr
                        key={issue.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {formatDate(issue.fuel_date)}
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {issue.vehicle_name ||
                              `Vehicle ${issue.vehicle}`}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            ID: {issue.vehicle}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                          {formatNumber(issue.litres)} L
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">
                          {formatNumber(issue.odometer_reading)}
                        </td>

                        <td className="max-w-xs px-6 py-4 text-sm text-slate-500">
                          <span className="block truncate">
                            {issue.remarks || "No remarks"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openIssue(issue)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {paginatedIssues.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-14 text-center"
                        >
                          <Search className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No issues found
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Try changing your search.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredIssues.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        filteredIssues.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredIssues.length}
                    </span>{" "}
                    issues
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(page - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(page + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Efficiency */}
          {activeTab === "efficiency" && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                      Fleet Analysis
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                      Vehicle Fuel Efficiency
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Review distance travelled and fuel consumption by
                      vehicle.
                    </p>
                  </div>

                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search vehicles..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Vehicle
                      </th>

                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Operator
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Opening
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Closing
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Distance
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Fuel Used
                      </th>

                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Efficiency
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedEfficiency.map((item, index) => {
                      const efficiencyValue = Number(
                        item.fuel_efficiency || 0
                      );

                      return (
                        <tr
                          key={`${item.vehicle}-${index}`}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                                <Truck className="h-4 w-4 text-violet-600" />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {item.vehicle}
                                </p>

                                {item.unit && (
                                  <p className="text-xs text-slate-400">
                                    {item.unit}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {item.operator || "Unassigned"}
                          </td>

                          <td className="px-6 py-4 text-right text-sm text-slate-600">
                            {formatNumber(item.opening_odometer)}
                          </td>

                          <td className="px-6 py-4 text-right text-sm text-slate-600">
                            {formatNumber(item.closing_odometer)}
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">
                            {formatNumber(item.distance_travelled)}
                          </td>

                          <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">
                            {formatNumber(item.fuel_used_litres)} L
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span
                              className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${getEfficiencyColor(
                                item.fuel_efficiency
                              )}`}
                            >
                              {efficiencyValue > 0
                                ? `${formatNumber(
                                    efficiencyValue
                                  )} ${
                                    item.unit || "km/L"
                                  }`
                                : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {paginatedEfficiency.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-14 text-center"
                        >
                          <Gauge className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No efficiency records found
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Efficiency information will appear here when
                            available.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredEfficiency.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        filteredEfficiency.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredEfficiency.length}
                    </span>{" "}
                    vehicles
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(page - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="min-w-16 text-center text-xs font-semibold text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(page + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Account summary */}
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
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700">
                  <Droplet className="h-4 w-4" />
                  {formatNumber(stats.totalLitresPurchased)} L purchased
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 font-medium text-orange-700">
                  <Fuel className="h-4 w-4" />
                  {formatNumber(stats.totalLitresIssued)} L issued
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                  {formatNumber(
                    reconciliation?.expected_fuel_balance || 0
                  )}{" "}
                  L balance
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

      {/* Detail modal */}
      {showDetailModal && selectedItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    detailType === "purchase"
                      ? "bg-blue-50"
                      : "bg-orange-50"
                  }`}
                >
                  {detailType === "purchase" ? (
                    <Droplet className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Fuel className="h-5 w-5 text-orange-600" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Fuel Record
                  </p>

                  <h2 className="text-lg font-black text-slate-950">
                    {detailType === "purchase"
                      ? "Purchase Details"
                      : "Issue Details"}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {detailType === "purchase" &&
                "supplier" in selectedItem && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Supplier
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {selectedItem.supplier || "—"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Fuel Date
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDateFull(selectedItem.fuel_date)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Litres
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {formatNumber(selectedItem.litres)} L
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Cost
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {formatCurrency(selectedItem.cost)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Receipt Reference
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {selectedItem.receipt_reference || "—"}
                        </p>
                      </div>
                    </div>

                    {selectedItem.receipt_file && (
                      <a
                        href={selectedItem.receipt_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <FileText className="h-4 w-4" />
                        View Receipt
                      </a>
                    )}

                    <div className="rounded-xl border border-slate-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Recorded
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {formatDateFull(selectedItem.created_at)}
                      </p>
                    </div>
                  </div>
                )}

              {detailType === "issue" && "vehicle" in selectedItem && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Vehicle
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedItem.vehicle_name ||
                        `Vehicle ${selectedItem.vehicle}`}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Vehicle ID: {selectedItem.vehicle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Fuel Date
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatDateFull(selectedItem.fuel_date)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Litres
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatNumber(selectedItem.litres)} L
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Odometer Reading
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatNumber(selectedItem.odometer_reading)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Remarks
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {selectedItem.remarks || "No remarks recorded."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Recorded
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateFull(selectedItem.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}