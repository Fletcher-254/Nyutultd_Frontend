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
  Search,
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Receipt,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  CreditCard,
  Gauge,
  BarChart3,
  PieChart,
  Activity,
  Droplet,
  Wallet,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Role = "admin" | "manager" | "director";

interface Me {
  id: number;
  email: string;
  role: Role;
}

interface FuelPurchase {
  id: number;
  fuel_date: string;
  supplier: string;
  litres: number | string;
  cost: number | string;
  receipt_reference: string | null;
  receipt_file: string | null;
  created_at: string;
}

interface FuelIssue {
  id: number;
  vehicle: number;
  vehicle_name: string;
  fuel_date: string;
  litres: number | string;
  odometer_reading: number | string;
  remarks: string | null;
  created_at: string;
}

interface FuelSummary {
  date?: string;
  year?: number;
  month?: string;
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
  vehicle: string;
  operator: string | null;
  opening_odometer: number | string;
  closing_odometer: number | string;
  distance_travelled: number | string;
  fuel_used_litres: number | string;
  fuel_efficiency: number | string;
  unit: string;
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

function formatNumber(value: number | string) {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

type Tab = "overview" | "purchases" | "issues" | "efficiency";

export default function FuelPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Data states
  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [issues, setIssues] = useState<FuelIssue[]>([]);
  const [dailySummary, setDailySummary] = useState<FuelSummary | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<FuelSummary | null>(null);
  const [reconciliation, setReconciliation] = useState<FuelReconciliation | null>(null);
  const [efficiency, setEfficiency] = useState<VehicleEfficiency[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<FuelPurchase | FuelIssue | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailType, setDetailType] = useState<"purchase" | "issue">("purchase");

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
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setDailySummary(dailyData || null);
      setMonthlySummary(monthlyData || null);
      setReconciliation(reconciliationData || null);
      setEfficiency(Array.isArray(efficiencyData) ? efficiencyData : []);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load fuel data.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter purchases
  const filteredPurchases = purchases.filter((purchase) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      purchase.supplier.toLowerCase().includes(searchLower) ||
      (purchase.receipt_reference?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      issue.vehicle_name.toLowerCase().includes(searchLower) ||
      (issue.remarks?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const totalPurchasesPages = Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE);
  const totalIssuesPages = Math.ceil(filteredIssues.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPurchases = filteredPurchases.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const paginatedIssues = filteredIssues.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats
  const stats = {
    totalPurchases: purchases.length,
    totalIssues: issues.length,
    totalLitresPurchased: purchases.reduce((sum, p) => sum + Number(p.litres || 0), 0),
    totalLitresIssued: issues.reduce((sum, i) => sum + Number(i.litres || 0), 0),
    totalCost: purchases.reduce((sum, p) => sum + Number(p.cost || 0), 0),
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

  const getEfficiencyColor = (efficiency: number | string) => {
    const value = Number(efficiency);
    if (value === 0) return "text-slate-500";
    if (value >= 10) return "text-green-600";
    if (value >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-4 text-sm font-medium text-white">Loading fuel data...</p>
          <p className="mt-1 text-xs text-slate-400">Fetching fuel records</p>
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
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  {detailType === "purchase" ? (
                    <Receipt className="h-6 w-6 text-slate-700" />
                  ) : (
                    <Droplet className="h-6 w-6 text-slate-700" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {detailType === "purchase" ? "Fuel Purchase" : "Fuel Issue"} Details
                  </h3>
                  <p className="text-sm text-slate-500">
                    {detailType === "purchase" 
                      ? (selectedItem as FuelPurchase).supplier
                      : (selectedItem as FuelIssue).vehicle_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedItem(null);
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
                  {formatDateFull(
                    detailType === "purchase" 
                      ? (selectedItem as FuelPurchase).fuel_date
                      : (selectedItem as FuelIssue).fuel_date
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Fuel className="h-4 w-4" />
                  <span>Litres</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatNumber(
                    detailType === "purchase" 
                      ? (selectedItem as FuelPurchase).litres
                      : (selectedItem as FuelIssue).litres
                  )} L
                </p>
              </div>

              {detailType === "purchase" && (
                <>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Wallet className="h-4 w-4" />
                      <span>Cost</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {formatCurrency((selectedItem as FuelPurchase).cost)}
                    </p>
                  </div>

                  {(selectedItem as FuelPurchase).receipt_reference && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText className="h-4 w-4" />
                        <span>Receipt Reference</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {(selectedItem as FuelPurchase).receipt_reference}
                      </p>
                    </div>
                  )}
                </>
              )}

              {detailType === "issue" && (
                <>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Gauge className="h-4 w-4" />
                      <span>Odometer Reading</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {formatNumber((selectedItem as FuelIssue).odometer_reading)} km
                    </p>
                  </div>

                  {(selectedItem as FuelIssue).remarks && (
                    <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText className="h-4 w-4" />
                        <span>Remarks</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {(selectedItem as FuelIssue).remarks}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedItem(null);
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
              <p className="text-sm font-medium text-slate-900">Fuel Management</p>
              <p className="text-xs text-slate-500">Monitor fuel usage and efficiency</p>
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
                  Fuel Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Monitor fuel purchases, issues, and vehicle efficiency across the fleet.
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
                <div className="rounded-xl bg-blue-50 p-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Purchases</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalPurchases}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-50 p-2">
                  <Droplet className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Issues</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.totalIssues}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-2">
                  <Fuel className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Litres Purchased</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatNumber(stats.totalLitresPurchased)} L
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Cost</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(stats.totalCost)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Daily & Monthly Summary */}
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {dailySummary && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>Today's Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Purchased</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(dailySummary.fuel_purchased_litres)} L
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Issued</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(dailySummary.fuel_issued_litres)} L
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Remaining</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatNumber(dailySummary.fuel_remaining_litres)} L
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Cost</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(dailySummary.fuel_cost)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {monthlySummary && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>{monthlySummary.month} {monthlySummary.year} Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Purchased</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(monthlySummary.fuel_purchased_litres)} L
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Issued</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatNumber(monthlySummary.fuel_issued_litres)} L
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Remaining</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatNumber(monthlySummary.fuel_remaining_litres)} L
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Cost</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(monthlySummary.fuel_cost)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Reconciliation */}
          {reconciliation && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <BarChart3 className="h-4 w-4" />
                <span>Reconciliation Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-400">Total Purchased</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatNumber(reconciliation.total_fuel_purchased)} L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Issued</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatNumber(reconciliation.total_fuel_issued)} L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Expected Balance</p>
                  <p className={`text-lg font-semibold ${
                    Number(reconciliation.expected_fuel_balance) > 0 
                      ? "text-blue-600" 
                      : "text-red-600"
                  }`}>
                    {formatNumber(reconciliation.expected_fuel_balance)} L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Cost</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(reconciliation.total_purchase_cost)}
                  </p>
                </div>
              </div>
            </section>
          )}

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
                onClick={() => setActiveTab("purchases")}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
                  activeTab === "purchases"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Purchases
                </div>
              </button>
              <button
                onClick={() => setActiveTab("issues")}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
                  activeTab === "issues"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Droplet className="h-4 w-4" />
                  Issues
                </div>
              </button>
              <button
                onClick={() => setActiveTab("efficiency")}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 ${
                  activeTab === "efficiency"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Efficiency
                </div>
              </button>
            </div>
          </section>

          {/* Tab Content */}
          <section className="mt-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Recent Purchases */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Recent Purchases</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Supplier</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-600">Litres</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-600">Cost</th>
                          <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purchases.slice(0, 5).map((purchase) => (
                          <tr key={purchase.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600">
                              {formatDate(purchase.fuel_date)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {purchase.supplier}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {formatNumber(purchase.litres)} L
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              {formatCurrency(purchase.cost)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedItem(purchase);
                                  setDetailType("purchase");
                                  setShowDetailModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                        {purchases.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                              No purchases recorded
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Issues */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Recent Issues</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">Vehicle</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-600">Litres</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-600">Odometer</th>
                          <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {issues.slice(0, 5).map((issue) => (
                          <tr key={issue.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600">
                              {formatDate(issue.fuel_date)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {issue.vehicle_name}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {formatNumber(issue.litres)} L
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {formatNumber(issue.odometer_reading)} km
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedItem(issue);
                                  setDetailType("issue");
                                  setShowDetailModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                        {issues.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                              No fuel issues recorded
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Purchases Tab */}
            {activeTab === "purchases" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-slate-900">All Fuel Purchases</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by supplier..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full sm:w-64 rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Supplier</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Litres</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Cost</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">Receipt</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(purchase.fuel_date)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {purchase.supplier}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(purchase.litres)} L
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(purchase.cost)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {purchase.receipt_reference ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                {purchase.receipt_reference}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedItem(purchase);
                                setDetailType("purchase");
                                setShowDetailModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedPurchases.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No purchases found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPurchasesPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">
                    <div className="text-sm text-slate-500">
                      Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredPurchases.length)} of{" "}
                      {filteredPurchases.length}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPurchasesPages }, (_, i) => i + 1).map((page) => (
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPurchasesPages, p + 1))}
                        disabled={currentPage === totalPurchasesPages}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Issues Tab */}
            {activeTab === "issues" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-slate-900">All Fuel Issues</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by vehicle..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full sm:w-64 rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Vehicle</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Litres</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Odometer</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedIssues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(issue.fuel_date)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {issue.vehicle_name}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(issue.litres)} L
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(issue.odometer_reading)} km
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedItem(issue);
                                setDetailType("issue");
                                setShowDetailModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedIssues.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No fuel issues found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalIssuesPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">
                    <div className="text-sm text-slate-500">
                      Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredIssues.length)} of{" "}
                      {filteredIssues.length}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalIssuesPages }, (_, i) => i + 1).map((page) => (
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
                        onClick={() => setCurrentPage((p) => Math.min(totalIssuesPages, p + 1))}
                        disabled={currentPage === totalIssuesPages}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Efficiency Tab */}
            {activeTab === "efficiency" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Vehicle Fuel Efficiency</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ranked by fuel efficiency (km/L)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Vehicle</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Operator</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Distance</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Fuel Used</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {efficiency.map((item, index) => (
                        <tr key={item.vehicle} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                              index === 0 
                                ? "bg-yellow-100 text-yellow-700" 
                                : index === 1 
                                ? "bg-slate-100 text-slate-600" 
                                : index === 2 
                                ? "bg-orange-100 text-orange-700" 
                                : "bg-slate-50 text-slate-500"
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.vehicle}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.operator || "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(item.distance_travelled)} km
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(item.fuel_used_litres)} L
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${getEfficiencyColor(item.fuel_efficiency)}`}>
                              {formatNumber(item.fuel_efficiency)} km/L
                            </span>
                          </td>
                        </tr>
                      ))}
                      {efficiency.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No efficiency data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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