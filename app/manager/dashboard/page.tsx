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
  Search,
  SlidersHorizontal,
  Store,
  Phone,
  MapPin,
  UserRound,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  AlertCircle,
  Loader2,
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

const modules = [
  {
    label: "Employees",
    path: "/manager/employees",
    icon: Users,
  },
  {
    label: "Attendance",
    path: "/manager/attendance",
    icon: CalendarCheck,
  },
  {
    label: "Daily Wages",
    path: "/manager/daily-wages",
    icon: CircleDollarSign,
  },
  {
    label: "Vehicles",
    path: "/manager/vehicles",
    icon: Truck,
  },
  {
    label: "Fuel",
    path: "/manager/fuel",
    icon: Fuel,
  },
  {
    label: "Vendors",
    path: "/manager/vendors",
    icon: Store,
  },
  {
    label: "Expenses",
    path: "/manager/expenses",
    icon: CircleDollarSign,
  },
];

const ITEMS_PER_PAGE = 10;

function extractArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "results" in payload &&
    Array.isArray((payload as { results: unknown }).results)
  ) {
    return (payload as { results: T[] }).results;
  }

  return [];
}

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) {
    return "KES 0";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateFull(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "V";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ManagerVendorsPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/manager/dashboard") {
        return (
          pathname === "/manager/dashboard" ||
          pathname === "/manager"
        );
      }

      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname]
  );

  const navigate = useCallback(
    (path: string) => {
      setSidebarOpen(false);
      router.push(path);
    },
    [router]
  );

  const handleUnauthorized = useCallback(() => {
    router.replace("/");
  }, [router]);

  const authenticatedFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Your session has expired. Please sign in again.");
      }

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const detail =
          data &&
          typeof data === "object" &&
          "detail" in data &&
          typeof (data as { detail: unknown }).detail === "string"
            ? (data as { detail: string }).detail
            : "Unable to complete the request.";

        throw new Error(detail);
      }

      return data;
    },
    [handleUnauthorized]
  );

  const loadData = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const meData = await authenticatedFetch("/me/");

        const currentUser = meData as UserProfile;

        if (currentUser.role === "admin") {
          router.replace("/admin/dashboard");
          return;
        }

        if (currentUser.role === "director") {
          router.replace("/director/dashboard");
          return;
        }

        if (currentUser.role !== "manager") {
          router.replace("/");
          return;
        }

        setUser(currentUser);

        const vendorsData = await authenticatedFetch("/vendors/");

        setVendors(extractArray<Vendor>(vendorsData));
      } catch (err) {
        console.error("Failed to load vendors:", err);

        if (
          err instanceof Error &&
          !err.message.includes("session has expired")
        ) {
          setError(
            err.message || "Unable to load vendors. Please try again."
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authenticatedFetch, router]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const logout = useCallback(async () => {
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
    } catch (logoutError) {
      console.error("Logout failed:", logoutError);
    } finally {
      router.replace("/");
    }
  }, [loggingOut, router]);

  const filteredVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const matchesSearch =
        !query ||
        vendor.vendor_name?.toLowerCase().includes(query) ||
        vendor.service_type?.toLowerCase().includes(query) ||
        vendor.contact_person?.toLowerCase().includes(query) ||
        vendor.phone_number?.toLowerCase().includes(query);

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

  const totalVendors = vendors.length;

  const activeVendors = vendors.filter(
    (vendor) => vendor.is_active
  ).length;

  const inactiveVendors = vendors.filter(
    (vendor) => !vendor.is_active
  ).length;

  const totalOutstanding = vendors.reduce(
    (sum, vendor) => sum + Number(vendor.total_balance || 0),
    0
  );

  const firstName =
    user?.first_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Manager";

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    firstName;

  const firstItem =
    filteredVendors.length === 0
      ? 0
      : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const lastItem = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredVendors.length
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            Loading your vendors...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Verifying secure access
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Unable to load vendors
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-black text-white shadow-lg shadow-blue-600/20">
              N
            </div>

            <div>
              <p className="text-sm font-bold tracking-wide text-white">
                NYUTU LIMITED
              </p>

              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                ERP MANAGEMENT
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Management
          </p>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => navigate("/manager/dashboard")}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive("/manager/dashboard")
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-[18px] w-[18px]" />
              <span className="flex-1 text-left">Dashboard</span>
              {isActive("/manager/dashboard") && (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {modules.map((module) => {
              const Icon = module.icon;
              const active = isActive(module.path);

              return (
                <button
                  key={module.path}
                  type="button"
                  onClick={() => navigate(module.path)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />

                  <span className="flex-1 text-left">
                    {module.label}
                  </span>

                  {active && <ChevronRight className="h-4 w-4" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          <div className="mb-3 rounded-xl bg-slate-900 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {getInitials(fullName)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {fullName}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Manager
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <LogOut className="h-[18px] w-[18px]" />
            )}

            <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
            className="mr-4 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">
                Vendors
              </p>

              <span className="hidden text-slate-300 sm:block">
                /
              </span>

              <p className="hidden text-sm text-slate-500 sm:block">
                Management
              </p>
            </div>

            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
              Manage your vendor directory and supplier relationships
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">
                System Online
              </span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {getInitials(fullName)}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Page Heading */}
          <section className="mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>Management</span>
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                  <span className="text-blue-600">Vendors</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  Vendors
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  View and manage your organization&apos;s vendors.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadData(true)}
                disabled={refreshing}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          </section>

          {/* Compact Summary */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Vendors
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {totalVendors}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Store className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Active
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {activeVendors}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inactive
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950">
                    {inactiveVendors}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Outstanding
                  </p>

                  <p className="mt-2 truncate text-xl font-bold text-slate-950">
                    {formatCurrency(totalOutstanding)}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>
          </section>

          {/* Vendor Directory */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Toolbar */}
            <div className="border-b border-slate-200 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    Vendor Directory
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Search and review registered suppliers.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search vendors..."
                      className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="relative">
                    <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as
                            | "all"
                            | "active"
                            | "inactive"
                        )
                      }
                      className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 sm:w-40"
                    >
                      <option value="all">All Vendors</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Vendor
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Transactions
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Balance
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                            {getInitials(vendor.vendor_name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {vendor.vendor_name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {vendor.service_type || "General supplier"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {vendor.contact_person && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <UserRound className="h-3.5 w-3.5 text-slate-400" />
                              <span>{vendor.contact_person}</span>
                            </div>
                          )}

                          {vendor.phone_number && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <span>{vendor.phone_number}</span>
                            </div>
                          )}

                          {!vendor.contact_person &&
                            !vendor.phone_number && (
                              <span className="text-xs text-slate-400">
                                No contact details
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-700">
                          {vendor.transaction_count ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p
                            className={`text-sm font-bold ${
                              Number(vendor.total_balance || 0) > 0
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {formatCurrency(vendor.total_balance)}
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-400">
                            of {formatCurrency(vendor.total_amount)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {vendor.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowDetailModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Vendor Cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedVendors.map((vendor) => (
                <div key={vendor.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                      {getInitials(vendor.vendor_name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-900">
                            {vendor.vendor_name}
                          </h3>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {vendor.service_type || "General supplier"}
                          </p>
                        </div>

                        {vendor.is_active ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Transactions
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {vendor.transaction_count ?? 0}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Balance
                          </p>

                          <p
                            className={`mt-1 text-sm font-bold ${
                              Number(vendor.total_balance || 0) > 0
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {formatCurrency(vendor.total_balance)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setShowDetailModal(true);
                        }}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Vendor
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {paginatedVendors.length === 0 && (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Store className="h-6 w-6 text-slate-400" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  No vendors found
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  {searchTerm || statusFilter !== "all"
                    ? "Try changing your search or filter to find a vendor."
                    : "There are currently no vendors registered in the system."}
                </p>

                {(searchTerm || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {filteredVendors.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {firstItem}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-700">
                    {lastItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredVendors.length}
                  </span>{" "}
                  vendors
                </p>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  )
                    .filter((page) => {
                      if (totalPages <= 5) return true;

                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, pages) => {
                      const previousPage = pages[index - 1];

                      const showEllipsis =
                        previousPage && page - previousPage > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-1 text-xs text-slate-400">
                              ...
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                              currentPage === page
                                ? "bg-blue-600 text-white shadow-sm"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Vendor Detail Modal */}
      {showDetailModal && selectedVendor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetailModal(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                  {getInitials(selectedVendor.vendor_name)}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    {selectedVendor.vendor_name}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Vendor details
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close vendor details"
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6 px-5 py-6 sm:px-6">
              {/* Status */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Account Status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedVendor.is_active
                      ? "Vendor is active"
                      : "Vendor is inactive"}
                  </p>
                </div>

                {selectedVendor.is_active ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                    <XCircle className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />

                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Vendor Information
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Service Type
                    </p>

                    <p className="mt-1.5 text-sm font-semibold text-slate-800">
                      {selectedVendor.service_type || "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Contact Person
                    </p>

                    <div className="mt-1.5 flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-400" />

                      <p className="text-sm font-semibold text-slate-800">
                        {selectedVendor.contact_person || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Phone Number
                    </p>

                    <div className="mt-1.5 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />

                      <p className="text-sm font-semibold text-slate-800">
                        {selectedVendor.phone_number || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Physical Address
                    </p>

                    <div className="mt-1.5 flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                      <p className="text-sm font-semibold text-slate-800">
                        {selectedVendor.physical_address ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-blue-600" />

                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Transaction Summary
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Transactions
                    </p>

                    <p className="mt-1.5 text-lg font-bold text-slate-900">
                      {selectedVendor.transaction_count ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Total Amount
                    </p>

                    <p className="mt-1.5 text-sm font-bold text-slate-900">
                      {formatCurrency(selectedVendor.total_amount)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Outstanding
                    </p>

                    <p
                      className={`mt-1.5 text-sm font-bold ${
                        Number(selectedVendor.total_balance || 0) > 0
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(selectedVendor.total_balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t border-slate-200 pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Registered
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatDateFull(selectedVendor.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Last Updated
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatDateFull(selectedVendor.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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