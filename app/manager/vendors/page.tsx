"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Filter,
  Fuel,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Truck,
  User,
  Users,
  X,
  XCircle,
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
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
}

interface Vendor {
  id: number;
  vendor_name: string;
  service_type: string;
  contact_person: string | null;
  phone_number: string | null;
  physical_address: string | null;
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
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const modules: Module[] = [
  {
    label: "Employees",
    href: "/manager/employees",
    icon: Users,
  },
  {
    label: "Attendance",
    href: "/manager/attendance",
    icon: CalendarCheck,
  },
  {
    label: "Daily Wages",
    href: "/manager/daily-wages",
    icon: CircleDollarSign,
  },
  {
    label: "Vehicles",
    href: "/manager/vehicles",
    icon: Truck,
  },
  {
    label: "Fuel",
    href: "/manager/fuel",
    icon: Fuel,
  },
  {
    label: "Vendors",
    href: "/manager/vendors",
    icon: Store,
  },
  {
    label: "Expenses",
    href: "/manager/expenses",
    icon: Receipt,
  },
];

const ITEMS_PER_PAGE = 10;

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateFull(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return {
      label: "Active",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      icon: CheckCircle,
    };
  }

  return {
    label: "Inactive",
    className:
      "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    icon: XCircle,
  };
}

function getBalanceStatus(balance: number | string) {
  const amount = Number(balance || 0);

  if (amount > 0) {
    return {
      label: "Outstanding",
      className:
        "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      icon: AlertCircle,
    };
  }

  return {
    label: "Paid",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    icon: CheckCircle,
  };
}

export default function VendorsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [me, setMe] = useState<Me | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const navigate = useCallback(
    (href: string) => {
      setMobileOpen(false);
      router.push(href);
    },
    [router]
  );

  const isActive = useCallback(
    (href: string) => {
      if (href === "/manager/dashboard") {
        return pathname === href;
      }

      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

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
        throw new Error("Your session has expired. Please log in again.");
      }

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "detail" in data &&
          typeof data.detail === "string"
            ? data.detail
            : typeof data === "object" &&
                data !== null &&
                "error" in data &&
                typeof data.error === "string"
              ? data.error
              : `Request failed with status ${response.status}.`;

        throw new Error(message);
      }

      return data;
    },
    [router]
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [profileData, vendorsData] = await Promise.all([
          authenticatedFetch("/me/"),
          authenticatedFetch("/vendors/"),
        ]);

        const profile = profileData as Me;

        if (profile.role === "admin") {
          router.replace("/admin/dashboard");
          return;
        }

        if (profile.role === "director") {
          router.replace("/director/dashboard");
          return;
        }

        if (profile.role !== "manager") {
          router.replace("/");
          return;
        }

        setMe(profile);

        const vendorList = Array.isArray(vendorsData)
          ? vendorsData
          : Array.isArray(
                (vendorsData as { results?: Vendor[] })?.results
              )
            ? (vendorsData as { results: Vendor[] }).results
            : [];

        setVendors(vendorList);
        setCurrentPage(1);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load vendors.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authenticatedFetch, router]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      });
    } catch {
      // Still redirect even if logout request fails.
    } finally {
      router.replace("/");
    }
  };

  const firstName =
    me?.first_name?.trim() ||
    me?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${me?.first_name || ""} ${me?.last_name || ""}`.trim() ||
    firstName;

  const filteredVendors = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const matchesSearch =
        !search ||
        vendor.vendor_name.toLowerCase().includes(search) ||
        (vendor.contact_person || "").toLowerCase().includes(search) ||
        vendor.service_type.toLowerCase().includes(search) ||
        (vendor.phone_number || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && vendor.is_active) ||
        (statusFilter === "inactive" && !vendor.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [vendors, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVendors.length / ITEMS_PER_PAGE)
  );

  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredVendors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVendors, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const stats = useMemo(() => {
    const total = vendors.length;

    const active = vendors.filter((vendor) => vendor.is_active).length;

    const inactive = vendors.filter((vendor) => !vendor.is_active).length;

    const outstanding = vendors.reduce(
      (sum, vendor) => sum + Number(vendor.total_balance || 0),
      0
    );

    const totalValue = vendors.reduce(
      (sum, vendor) => sum + Number(vendor.total_amount || 0),
      0
    );

    const totalPaid = vendors.reduce(
      (sum, vendor) => sum + Number(vendor.total_paid || 0),
      0
    );

    return {
      total,
      active,
      inactive,
      outstanding,
      totalValue,
      totalPaid,
    };
  }, [vendors]);

  const openVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowDetailModal(true);
  };

  if (loading && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Loading vendors...
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Verifying secure access
          </p>
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
            {/* Dashboard */}
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
                  key={module.href}
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

                  <span className="flex-1">{module.label}</span>

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
                  {getGreeting()}
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
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => navigate("/manager/dashboard")}
              className="font-medium text-slate-400 transition hover:text-blue-600"
            >
              Dashboard
            </button>

            <ChevronRight className="h-4 w-4 text-slate-300" />

            <span className="font-semibold text-slate-700">
              Vendors
            </span>
          </div>

          {/* Welcome banner */}
          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5">
                  <Store className="h-3.5 w-3.5 text-blue-300" />

                  <span className="text-xs font-semibold text-blue-200">
                    Vendor Management
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {getGreeting()}, {firstName}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Vendors
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Review vendor relationships, services, transactions,
                  payments, and outstanding balances.
                </p>
              </div>

              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 lg:flex">
                <Store className="h-8 w-8 text-blue-300" />
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div className="flex-1">
                <p className="font-semibold text-red-800">
                  Unable to load vendors
                </p>

                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => loadData()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 transition hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}

          {/* Summary cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Store}
              label="Total Vendors"
              value={stats.total}
              description="Registered vendors"
            />

            <SummaryCard
              icon={CheckCircle}
              label="Active Vendors"
              value={stats.active}
              description="Currently active"
              iconBackground="bg-emerald-50"
              iconColor="text-emerald-600"
            />

            <SummaryCard
              icon={XCircle}
              label="Inactive Vendors"
              value={stats.inactive}
              description="Currently inactive"
              iconBackground="bg-slate-100"
              iconColor="text-slate-500"
            />

            <SummaryCard
              icon={AlertCircle}
              label="Outstanding"
              value={formatCurrency(stats.outstanding)}
              description="Vendor balances due"
              iconBackground="bg-amber-50"
              iconColor="text-amber-600"
            />
          </section>

          {/* Financial overview */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                Financial Overview
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-950">
                Vendor transactions
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Summary of vendor transaction values and payments.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FinancialCard
                icon={Receipt}
                label="Total Transaction Value"
                value={formatCurrency(stats.totalValue)}
                iconColor="text-blue-600"
              />

              <FinancialCard
                icon={CreditCard}
                label="Total Paid"
                value={formatCurrency(stats.totalPaid)}
                iconColor="text-emerald-600"
              />

              <FinancialCard
                icon={DollarSign}
                label="Balance Due"
                value={formatCurrency(stats.outstanding)}
                iconColor="text-amber-600"
                background="bg-amber-50/60"
              />
            </div>
          </section>

          {/* Vendor directory */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Vendor Directory
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-950">
                    All Vendors
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredVendors.length} vendor
                    {filteredVendors.length === 1 ? "" : "s"} shown
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search vendors..."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 sm:w-64"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(
                          event.target.value as
                            | "all"
                            | "active"
                            | "inactive"
                        );
                        setCurrentPage(1);
                      }}
                      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 sm:w-40"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadData(true)}
                    disabled={refreshing}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />

                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {paginatedVendors.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Store className="h-7 w-7 text-slate-400" />
                </div>

                <h4 className="text-base font-bold text-slate-900">
                  No vendors found
                </h4>

                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search or filter to find the vendor you are looking for."
                    : "There are currently no vendors available."}
                </p>

                {(searchTerm || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1050px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Vendor
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Service
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Contact
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Transactions
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Balance
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>

                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedVendors.map((vendor) => {
                        const status = getStatusBadge(vendor.is_active);
                        const balanceStatus = getBalanceStatus(
                          vendor.total_balance
                        );

                        const StatusIcon = status.icon;
                        const BalanceIcon = balanceStatus.icon;

                        return (
                          <tr
                            key={vendor.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                  <Building2 className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {vendor.vendor_name}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Added {formatDate(vendor.created_at)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-slate-700">
                                {vendor.service_type || "—"}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {vendor.contact_person || "—"}
                                </p>

                                {vendor.phone_number && (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                    <Phone className="h-3 w-3" />
                                    {vendor.phone_number}
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-800">
                                {vendor.transaction_count}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {formatCurrency(vendor.total_balance)}
                                </p>

                                <span
                                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${balanceStatus.className}`}
                                >
                                  <BalanceIcon className="h-3 w-3" />
                                  {balanceStatus.label}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${status.className}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {status.label}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => openVendor(vendor)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-slate-100 lg:hidden">
                  {paginatedVendors.map((vendor) => {
                    const status = getStatusBadge(vendor.is_active);
                    const balanceStatus = getBalanceStatus(
                      vendor.total_balance
                    );

                    const StatusIcon = status.icon;
                    const BalanceIcon = balanceStatus.icon;

                    return (
                      <div
                        key={vendor.id}
                        className="p-5 transition hover:bg-slate-50 sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                              <Building2 className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-bold text-slate-900">
                                {vendor.vendor_name}
                              </h4>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {vendor.service_type || "No service type"}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${status.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Contact
                            </p>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                              {vendor.contact_person || "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Transactions
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              {vendor.transaction_count}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Balance
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-900">
                              {formatCurrency(vendor.total_balance)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Added
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              {formatDate(vendor.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${balanceStatus.className}`}
                          >
                            <BalanceIcon className="h-3 w-3" />
                            {balanceStatus.label}
                          </span>

                          <button
                            type="button"
                            onClick={() => openVendor(vendor)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination */}
            {filteredVendors.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      filteredVendors.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredVendors.length}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="min-w-20 text-center text-xs font-semibold text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Manager account */}
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Manager Account
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {fullName}
                  </h3>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {me?.email || "—"}
                  </p>
                </div>

                <div className="hidden items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 sm:flex">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />

                  <span className="text-xs font-bold text-emerald-700">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Store className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Vendor Records
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.total}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Total registered vendors
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-xs text-slate-400">
              NYUTU LIMITED ERP MANAGEMENT
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Secure operations management
            </p>
          </footer>
        </div>
      </main>

      {/* Vendor detail modal */}
      {showDetailModal && selectedVendor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetailModal(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-950">
                    {selectedVendor.vendor_name}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Vendor #{selectedVendor.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                aria-label="Close vendor details"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {/* Status */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {(() => {
                  const status = getStatusBadge(
                    selectedVendor.is_active
                  );

                  const StatusIcon = status.icon;

                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  );
                })()}

                {(() => {
                  const balanceStatus = getBalanceStatus(
                    selectedVendor.total_balance
                  );

                  const BalanceIcon = balanceStatus.icon;

                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${balanceStatus.className}`}
                    >
                      <BalanceIcon className="h-3.5 w-3.5" />
                      {balanceStatus.label}
                    </span>
                  );
                })()}
              </div>

              {/* Vendor details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailCard
                  icon={FileText}
                  label="Service Type"
                  value={selectedVendor.service_type || "—"}
                />

                <DetailCard
                  icon={User}
                  label="Contact Person"
                  value={selectedVendor.contact_person || "—"}
                />

                <DetailCard
                  icon={Phone}
                  label="Phone Number"
                  value={selectedVendor.phone_number || "—"}
                />

                <DetailCard
                  icon={MapPin}
                  label="Physical Address"
                  value={selectedVendor.physical_address || "—"}
                />
              </div>

              {/* Financial summary */}
              <div className="mt-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                  Financial Summary
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-400">
                      Transactions
                    </p>

                    <p className="mt-1 text-lg font-black text-slate-950">
                      {selectedVendor.transaction_count}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-400">
                      Total Amount
                    </p>

                    <p className="mt-1 text-lg font-black text-slate-950">
                      {formatCurrency(selectedVendor.total_amount)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Balance Due
                    </p>

                    <p className="mt-1 text-lg font-black text-slate-950">
                      {formatCurrency(selectedVendor.total_balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDateFull(selectedVendor.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Last Updated
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDateFull(selectedVendor.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close */}
              <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  iconBackground = "bg-blue-50",
  iconColor = "text-blue-600",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  description: string;
  iconBackground?: string;
  iconColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBackground}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function FinancialCard({
  icon: Icon,
  label,
  value,
  iconColor,
  background = "bg-slate-50/70",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  iconColor: string;
  background?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-100 ${background} p-4`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />

        <span className="text-xs font-semibold text-slate-500">
          {label}
        </span>
      </div>

      <p className="text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />

        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>

      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}