
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
  ShieldCheck,
  Loader2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Eye,
  Car,
  Gauge,
  User,
  Calendar,
  MapPin,
  CheckCircle,
  AlertTriangle,
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
  const hasOpening =
    vehicle.opening_odometer_reading !== null &&
    vehicle.opening_odometer_reading !== undefined;

  const hasClosing =
    vehicle.closing_odometer_reading !== null &&
    vehicle.closing_odometer_reading !== undefined;

  const hasOperator =
    vehicle.assigned_operator !== null &&
    vehicle.assigned_operator !== "";

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
    label: hasOperator ? "Assigned" : "Unknown",
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
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
          // Keep default error message.
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

  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchLower = searchTerm.toLowerCase();

    return (
      vehicle.asset_identifier.toLowerCase().includes(searchLower) ||
      (vehicle.assigned_operator
        ?.toLowerCase()
        .includes(searchLower) ??
        false) ||
      (vehicle.remarks?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedVehicles = filteredVehicles.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const stats = {
    total: vehicles.length,

    active: vehicles.filter(
      (v) =>
        v.opening_odometer_reading !== null &&
        v.opening_odometer_reading !== undefined &&
        (v.closing_odometer_reading === null ||
          v.closing_odometer_reading === undefined)
    ).length,

    completed: vehicles.filter(
      (v) =>
        v.opening_odometer_reading !== null &&
        v.opening_odometer_reading !== undefined &&
        v.closing_odometer_reading !== null &&
        v.closing_odometer_reading !== undefined
    ).length,

    withOperator: vehicles.filter(
      (v) =>
        v.assigned_operator !== null &&
        v.assigned_operator !== ""
    ).length,
  };

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";

    return "Good evening";
  })();

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
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M";

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />

          <p className="mt-4 text-sm font-medium text-white">
            Loading vehicles...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Fetching fleet data
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-slate-900">
            Unable to load data
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
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
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <User className="h-4 w-4" />
                    Assigned Operator
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedVehicle.assigned_operator || "Not assigned"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Calendar className="h-4 w-4" />
                    Registered On
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(selectedVehicle.created_at)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Gauge className="h-4 w-4" />
                    Opening Odometer
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedVehicle.opening_odometer_reading !== null &&
                    selectedVehicle.opening_odometer_reading !== undefined
                      ? `${formatNumber(
                          selectedVehicle.opening_odometer_reading
                        )} km`
                      : "Not set"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Gauge className="h-4 w-4" />
                    Closing Odometer
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedVehicle.closing_odometer_reading !== null &&
                    selectedVehicle.closing_odometer_reading !== undefined
                      ? `${formatNumber(
                          selectedVehicle.closing_odometer_reading
                        )} km`
                      : "Not set"}
                  </p>
                </div>

                {selectedVehicle.remarks && (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <MapPin className="h-4 w-4" />
                      Remarks
                    </div>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
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
        </div>
      )}

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide">
              NYUTU LIMITED
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Management Portal
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Navigation
          </p>

          <nav className="mt-3 space-y-1">
            <button
              onClick={() => {
                setMobileOpen(false);
                router.push("/manager/dashboard");
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                pathname === "/manager/dashboard"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
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

        {/* Profile */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="h-5 w-5 text-slate-300" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {fullName}
                </p>

                <p className="truncate text-xs text-slate-500">
                  Manager
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}

            <span>
              {loggingOut ? "Signing out..." : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>

              <div>
                <p className="text-sm font-medium text-slate-900">
                  Vehicles
                </p>

                <p className="text-xs text-slate-500">
                  Fleet management and monitoring
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {fullName}
                </p>

                <p className="text-xs text-slate-500">
                  Manager
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-7 sm:px-8 lg:py-9">
          {/* Page Introduction */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                    <Truck className="h-5 w-5 text-slate-700" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Fleet Management
                    </p>

                    <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                      Company Vehicles
                    </h1>
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
                  View and monitor all company vehicles and machinery,
                  including operators and odometer readings.
                </p>
              </div>

              <button
                onClick={loadData}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Truck className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Total Vehicles
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-2.5">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Active
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {stats.active}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Completed Trips
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {stats.completed}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2.5">
                  <User className="h-5 w-5 text-purple-600" />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    With Operator
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {stats.withOperator}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Search */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="text-sm text-slate-500">
                {filteredVehicles.length} vehicle
                {filteredVehicles.length !== 1 ? "s" : ""}
              </div>
            </div>
          </section>

          {/* Vehicles Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Vehicle Records
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Company fleet and trip information
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Asset
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Operator
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Opening
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Closing
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedVehicles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-slate-100 p-3">
                            <Truck className="h-6 w-6 text-slate-400" />
                          </div>

                          <p className="mt-2 text-sm font-medium text-slate-700">
                            No vehicles found
                          </p>

                          <p className="text-xs text-slate-400">
                            {searchTerm
                              ? "Try adjusting your search"
                              : "No vehicles have been registered yet"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedVehicles.map((vehicle) => {
                      const status = getStatusInfo(vehicle);

                      return (
                        <tr
                          key={vehicle.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                                <Car className="h-4 w-4 text-slate-600" />
                              </div>

                              <div>
                                <p className="font-medium text-slate-900">
                                  {vehicle.asset_identifier}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  Vehicle
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {vehicle.assigned_operator || "—"}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {vehicle.opening_odometer_reading !== null &&
                            vehicle.opening_odometer_reading !== undefined
                              ? `${formatNumber(
                                  vehicle.opening_odometer_reading
                                )} km`
                              : "—"}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {vehicle.closing_odometer_reading !== null &&
                            vehicle.closing_odometer_reading !== undefined
                              ? `${formatNumber(
                                  vehicle.closing_odometer_reading
                                )} km`
                              : "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.color}`}
                            >
                              {status.icon}
                              {status.label}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedVehicle(vehicle);
                                setShowDetailModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
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
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-700">
                    {startIndex + 1}
                  </span>
                  –
                  <span className="font-medium text-slate-700">
                    {" "}
                    {Math.min(
                      startIndex + ITEMS_PER_PAGE,
                      filteredVehicles.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-700">
                    {filteredVehicles.length}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        page === currentPage
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

              <p>
                Management Portal · Manager Access
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

