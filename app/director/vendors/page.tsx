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
  Search,
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Eye,
  Building2,
  Phone,
  MapPin,
  User,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  FileSearch,
  Briefcase,
  Wallet,
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

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: "Active",
    };
  }
  return {
    color: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Inactive",
  };
}

function getBalanceStatus(balance: number | string) {
  const amount = Number(balance || 0);
  if (amount === 0) {
    return {
      color: "text-slate-500",
      icon: <Minus className="h-4 w-4" />,
      label: "Settled",
    };
  }
  if (amount > 0) {
    return {
      color: "text-red-600",
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Due",
    };
  }
  return {
    color: "text-green-600",
    icon: <TrendingDown className="h-4 w-4" />,
    label: "Overpaid",
  };
}

export default function DirectorVendorsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      const [meData, vendorsData] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/vendors/"),
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
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load vendors data.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter vendors
  const filteredVendors = vendors.filter((vendor) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      vendor.vendor_name.toLowerCase().includes(searchLower) ||
      (vendor.contact_person?.toLowerCase().includes(searchLower) ?? false) ||
      vendor.service_type.toLowerCase().includes(searchLower) ||
      (vendor.phone_number?.toLowerCase().includes(searchLower) ?? false);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && vendor.is_active) ||
      (statusFilter === "inactive" && !vendor.is_active);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVendors = filteredVendors.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats
  const stats = {
    total: vendors.length,
    active: vendors.filter((v) => v.is_active).length,
    inactive: vendors.filter((v) => !v.is_active).length,
    totalDue: vendors.reduce((sum, v) => sum + Number(v.total_balance || 0), 0),
    totalAmount: vendors.reduce((sum, v) => sum + Number(v.total_amount || 0), 0),
    totalTransactions: vendors.reduce((sum, v) => sum + v.transaction_count, 0),
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
          <p className="mt-4 text-sm font-medium text-white">Loading vendors...</p>
          <p className="mt-1 text-xs text-slate-400">Fetching vendor data</p>
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
      {/* Vendor Detail Modal */}
      {showDetailModal && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Building2 className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedVendor.vendor_name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Vendor Details
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedVendor(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Store className="h-4 w-4" />
                  <span>Service Type</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedVendor.service_type}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    selectedVendor.is_active
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {selectedVendor.is_active ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {selectedVendor.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {selectedVendor.contact_person && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User className="h-4 w-4" />
                    <span>Contact Person</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {selectedVendor.contact_person}
                  </p>
                </div>
              )}

              {selectedVendor.phone_number && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="h-4 w-4" />
                    <span>Phone Number</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {selectedVendor.phone_number}
                  </p>
                </div>
              )}

              {selectedVendor.physical_address && (
                <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    <span>Physical Address</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {selectedVendor.physical_address}
                  </p>
                </div>
              )}

              <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Financial Summary</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Transactions</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedVendor.transaction_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Amount</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(selectedVendor.total_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Balance Due</p>
                    <p className={`text-lg font-semibold ${
                      Number(selectedVendor.total_balance) > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {formatCurrency(selectedVendor.total_balance)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Registered</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatDateFull(selectedVendor.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedVendor(null);
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide">NYUTU LIMITED</p>
            <p className="mt-1 text-xs text-slate-400">Director Portal</p>
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
                <p className="truncate text-sm font-medium text-white">Director</p>
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
              <p className="text-sm font-medium text-slate-900">Vendors</p>
              <p className="text-xs text-slate-500">Manage vendors and transactions</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">{me?.email}</p>
                <p className="text-xs text-slate-500">Director</p>
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{greeting}, Director</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Vendor Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  View and manage all vendors and their financial transactions.
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
                  <Store className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Vendors</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-400">All vendors</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Active</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.active}</p>
                  <p className="text-xs text-slate-400">Active vendors</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Inactive</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.inactive}</p>
                  <p className="text-xs text-slate-400">Inactive vendors</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-yellow-50 p-2">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Balance Due</p>
                  <p className={`text-2xl font-semibold ${
                    stats.totalDue > 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {formatCurrency(stats.totalDue)}
                  </p>
                  <p className="text-xs text-slate-400">{stats.totalTransactions} transactions</p>
                </div>
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, contact, service..."
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-slate-500">
              {filteredVendors.length} vendor{filteredVendors.length !== 1 ? "s" : ""}
            </div>
          </section>

          {/* Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Vendor</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Contact</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Balance</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedVendors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Store className="h-8 w-8 text-slate-300" />
                          <p>No vendors found</p>
                          <p className="text-xs text-slate-400">
                            {searchTerm || statusFilter !== "all"
                              ? "Try adjusting your filters"
                              : "No vendors have been registered yet"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedVendors.map((vendor) => {
                      const status = getStatusBadge(vendor.is_active);
                      const balanceStatus = getBalanceStatus(vendor.total_balance);
                      return (
                        <tr key={vendor.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                <Building2 className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {vendor.vendor_name}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {vendor.transaction_count} transaction{vendor.transaction_count !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {vendor.service_type}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-slate-600">
                              {vendor.contact_person || "—"}
                            </div>
                            {vendor.phone_number && (
                              <div className="text-xs text-slate-400">
                                {vendor.phone_number}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                            {formatCurrency(vendor.total_amount)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className={`flex items-center justify-end gap-1.5 font-medium ${balanceStatus.color}`}>
                              {balanceStatus.icon}
                              {formatCurrency(vendor.total_balance)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedVendor(vendor);
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">
                <div className="text-sm text-slate-500">
                  Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredVendors.length)} of{" "}
                  {filteredVendors.length}
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
              <p>Director Portal · Executive Access</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}