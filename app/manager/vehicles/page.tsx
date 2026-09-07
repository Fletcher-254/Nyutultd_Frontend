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
  Plus,
  Eye,
  Edit,
  Trash2,
  Car,
  Gauge,
  User,
  Calendar,
  MapPin,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Role = "admin" | "manager" | "director";

interface Me {
  id: number;
  email: string;
  role: Role;
}

interface Vehicle {
  id: number;
  asset_identifier: string;
  assigned_operator: string | null;
  opening_odometer_reading: string | number | null;
  closing_odometer_reading: string | number | null;
  remarks: string | null;
  created_at: string;
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

function formatDate(dateString: string) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(value: number | string | null) {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function getStatusInfo(vehicle: Vehicle) {
  const hasOpening = vehicle.opening_odometer_reading !== null && vehicle.opening_odometer_reading !== undefined;
  const hasClosing = vehicle.closing_odometer_reading !== null && vehicle.closing_odometer_reading !== undefined;
  const hasOperator = vehicle.assigned_operator !== null && vehicle.assigned_operator !== "";

  if (!hasOpening && !hasClosing) {
    return {
      label: "New",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    };
  }

  if (hasOpening && !hasClosing) {
    return {
      label: "Active",
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    };
  }

  if (hasOpening && hasClosing) {
    return {
      label: "Completed",
      color: "bg-slate-50 text-slate-700 border-slate-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    };
  }

  return {
    label: "Unknown",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  };
}

export default function VehiclesPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
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
      const [meData, vehiclesData] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/vehicles/"),
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
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load vehicles data.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter vehicles
  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.asset_identifier.toLowerCase().includes(searchLower) ||
      (vehicle.assigned_operator?.toLowerCase().includes(searchLower) ?? false) ||
      (vehicle.remarks?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats
  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => 
      v.opening_odometer_reading !== null && 
      v.opening_odometer_reading !== undefined &&
      (v.closing_odometer_reading === null || v.closing_odometer_reading === undefined)
    ).length,
    completed: vehicles.filter((v) => 
      v.opening_odometer_reading !== null && 
      v.opening_odometer_reading !== undefined &&
      v.closing_odometer_reading !== null && 
      v.closing_odometer_reading !== undefined
    ).length,
    withOperator: vehicles.filter((v) => 
      v.assigned_operator !== null && v.assigned_operator !== ""
    ).length,
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
          <p className="mt-4 text-sm font-medium text-white">Loading vehicles...</p>
          <p className="mt-1 text-xs text-slate-400">Fetching fleet data</p>
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
      {/* Vehicle Detail Modal */}
      {showDetailModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Truck className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedVehicle.asset_identifier}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Vehicle Details
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedVehicle(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <User className="h-4 w-4" />
                  <span>Assigned Operator</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedVehicle.assigned_operator || "Not assigned"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Registered On</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatDate(selectedVehicle.created_at)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Gauge className="h-4 w-4" />
                  <span>Opening Odometer</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedVehicle.opening_odometer_reading !== null && 
                   selectedVehicle.opening_odometer_reading !== undefined
                    ? `${formatNumber(selectedVehicle.opening_odometer_reading)} km`
                    : "Not set"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Gauge className="h-4 w-4" />
                  <span>Closing Odometer</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedVehicle.closing_odometer_reading !== null && 
                   selectedVehicle.closing_odometer_reading !== undefined
                    ? `${formatNumber(selectedVehicle.closing_odometer_reading)} km`
                    : "Not set"}
                </p>
              </div>

              {selectedVehicle.remarks && (
                <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    <span>Remarks</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {selectedVehicle.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedVehicle(null);
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
              <p className="text-sm font-medium text-slate-900">Vehicles</p>
              <p className="text-xs text-slate-500">Manage company fleet</p>
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
                  Fleet Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  View and monitor all company vehicles and machinery.
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
                  <Truck className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Vehicles</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
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
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Completed Trips</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.completed}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">With Operator</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.withOperator}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by asset ID, operator, or remarks..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="text-sm text-slate-500">
              {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""}
            </div>
          </section>

          {/* Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Asset</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Operator</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Opening</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Closing</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Truck className="h-8 w-8 text-slate-300" />
                          <p>No vehicles found</p>
                          <p className="text-xs text-slate-400">
                            {searchTerm ? "Try adjusting your search" : "No vehicles have been registered yet"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedVehicles.map((vehicle) => {
                      const status = getStatusInfo(vehicle);
                      return (
                        <tr key={vehicle.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                <Car className="h-4 w-4 text-slate-600" />
                              </div>
                              <span className="font-medium text-slate-900">
                                {vehicle.asset_identifier}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {vehicle.assigned_operator || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {vehicle.opening_odometer_reading !== null && 
                             vehicle.opening_odometer_reading !== undefined
                              ? `${formatNumber(vehicle.opening_odometer_reading)} km`
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {vehicle.closing_odometer_reading !== null && 
                             vehicle.closing_odometer_reading !== undefined
                              ? `${formatNumber(vehicle.closing_odometer_reading)} km`
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedVehicle(vehicle);
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
                  Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredVehicles.length)} of{" "}
                  {filteredVehicles.length}
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