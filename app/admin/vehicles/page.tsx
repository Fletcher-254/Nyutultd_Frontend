"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Truck,
  Fuel,
  Receipt,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Gauge,
  AlertCircle,
} from "lucide-react";

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
}

interface Vehicle {
  id: number;
  asset_identifier: string;
  assigned_operator: string | null;
  opening_odometer_reading: number;
  closing_odometer_reading: number | null;
  remarks: string | null;
  created_at: string;
}

interface VehicleFormData {
  asset_identifier: string;
  assigned_operator: string;
  opening_odometer_reading: string;
  closing_odometer_reading: string;
  remarks: string;
}

const EMPTY_FORM: VehicleFormData = {
  asset_identifier: "",
  assigned_operator: "",
  opening_odometer_reading: "",
  closing_odometer_reading: "",
  remarks: "",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not configured."
  );
}

export default function VehiclesPage() {
  const router = useRouter();
  const pathname = usePathname();

  // ==================================================
  // SIDEBAR STATE
  // ==================================================

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("");

  // ==================================================
  // MENU - EXACT SAME AS DASHBOARD
  // ==================================================

  const menu = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
      { label: "Employees", icon: Users, path: "/admin/employees" },
      { label: "Attendance", icon: CalendarCheck, path: "/admin/attendance" },
      { label: "Vehicles", icon: Truck, path: "/admin/vehicles" },
      { label: "Fuel", icon: Fuel, path: "/admin/fuel" },
    ],
    []
  );

  const isActive = (path: string) => {
    if (path === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/dashboard";
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navigate = (path: string) => {
    setSidebarOpen(false);
    router.push(path);
  };

  // ==================================================
  // VEHICLE DATA
  // ==================================================

  const [user, setUser] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<VehicleFormData>(EMPTY_FORM);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // ==================================================
  // AUTHENTICATED FETCH
  // ==================================================

  const handleUnauthorized = useCallback(() => {
    router.replace("/");
  }, [router]);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response | null> => {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401) {
          handleUnauthorized();
          return null;
        }
        return response;
      } catch (error) {
        console.error("Authenticated request failed:", error);
        throw error;
      }
    },
    [handleUnauthorized]
  );

  // ==================================================
  // LOAD DATA
  // ==================================================

  const loadVehiclesPage = useCallback(async () => {
    setLoading(true);
    setError("");
    setRefreshing(false);

    try {
      // Load user
      const meResponse = await authenticatedFetch(`${API_URL}/me/`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!meResponse) return;

      if (!meResponse.ok) {
        throw new Error("Unable to authenticate user.");
      }

      const userData: UserProfile = await meResponse.json();
      setUser(userData);

      // Set greeting and date
      const now = new Date();
      const hour = now.getHours();
      if (hour < 12) setGreeting("Good Morning");
      else if (hour < 17) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
      setToday(
        now.toLocaleDateString("en-KE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );

      // Load vehicles
      const vehiclesResponse = await authenticatedFetch(`${API_URL}/vehicles/`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!vehiclesResponse) return;

      if (!vehiclesResponse.ok) {
        throw new Error(`Failed to load vehicles. Server returned ${vehiclesResponse.status}.`);
      }

      const data = await vehiclesResponse.json();
      const vehicleList = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
        ? data.results
        : [];

      setVehicles(vehicleList);
    } catch (err: unknown) {
      console.error("Vehicles page error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong while loading vehicles.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    loadVehiclesPage();
  }, [loadVehiclesPage]);

  // ==================================================
  // REFRESH
  // ==================================================

  async function refreshPage() {
    setRefreshing(true);
    await loadVehiclesPage();
  }

  // ==================================================
  // LOGOUT
  // ==================================================

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      router.replace("/");
    }
  };

  // ==================================================
  // FORM HELPERS
  // ==================================================

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingVehicle(null);
  }

  function openCreateModal() {
    resetForm();
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setForm({
      asset_identifier: vehicle.asset_identifier,
      assigned_operator: vehicle.assigned_operator || "",
      opening_odometer_reading: String(vehicle.opening_odometer_reading),
      closing_odometer_reading: vehicle.closing_odometer_reading !== null
        ? String(vehicle.closing_odometer_reading)
        : "",
      remarks: vehicle.remarks || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) return;
    setShowModal(false);
    resetForm();
  }

  function handleInputChange(field: keyof VehicleFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // ==================================================
  // SAVE VEHICLE
  // ==================================================

  async function saveVehicle() {
    if (!form.asset_identifier.trim()) {
      alert("Asset identifier is required.");
      return;
    }

    if (!form.opening_odometer_reading || Number(form.opening_odometer_reading) < 0) {
      alert("Opening odometer reading must be 0 or greater.");
      return;
    }

    const opening = Number(form.opening_odometer_reading);
    const closing = form.closing_odometer_reading ? Number(form.closing_odometer_reading) : null;

    if (closing !== null && closing < opening) {
      alert("Closing odometer reading cannot be less than opening reading.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const isEditing = editingVehicle !== null;
      const url = isEditing
        ? `${API_URL}/vehicles/${editingVehicle.id}/update/`
        : `${API_URL}/vehicles/create/`;

      const payload = {
        asset_identifier: form.asset_identifier.trim(),
        assigned_operator: form.assigned_operator.trim() || null,
        opening_odometer_reading: opening,
        closing_odometer_reading: closing,
        remarks: form.remarks.trim() || null,
      };

      const response = await authenticatedFetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response) return;

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Failed to save vehicle. Server returned ${response.status}.`;
        try {
          const data = JSON.parse(responseText);
          if (data.detail) message = data.detail;
          else if (data.error) message = data.error;
          else if (typeof data === "object" && data !== null) {
            const firstError = Object.values(data)[0];
            if (Array.isArray(firstError)) message = String(firstError[0]);
            else if (firstError) message = String(firstError);
          }
        } catch {
          // Keep default error message.
        }
        alert(message);
        return;
      }

      const savedVehicle: Vehicle = JSON.parse(responseText);

      if (isEditing) {
        setVehicles((previous) =>
          previous.map((vehicle) => (vehicle.id === savedVehicle.id ? savedVehicle : vehicle))
        );
      } else {
        setVehicles((previous) => [savedVehicle, ...previous]);
      }

      setSuccess(isEditing ? "Vehicle updated successfully." : "Vehicle registered successfully.");
      closeModal();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Vehicle save error:", err);
      alert("Something went wrong while saving the vehicle.");
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // DELETE VEHICLE
  // ==================================================

  async function deleteVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm(
      `Delete vehicle "${vehicle.asset_identifier}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await authenticatedFetch(`${API_URL}/vehicles/${vehicle.id}/delete/`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!response) return;

      if (!response.ok) {
        let message = `Failed to delete vehicle. Server returned ${response.status}.`;
        try {
          const data = await response.json();
          message = data.detail || data.error || message;
        } catch {
          // Keep default error message.
        }
        alert(message);
        return;
      }

      setVehicles((previous) => previous.filter((item) => item.id !== vehicle.id));
      setSuccess("Vehicle deleted successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Vehicle delete error:", err);
      alert("Something went wrong while deleting the vehicle.");
    }
  }

  // ==================================================
  // FILTERING
  // ==================================================

  const filteredVehicles = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return vehicles;

    return vehicles.filter(
      (vehicle) =>
        vehicle.asset_identifier.toLowerCase().includes(searchTerm) ||
        (vehicle.assigned_operator || "").toLowerCase().includes(searchTerm) ||
        (vehicle.remarks || "").toLowerCase().includes(searchTerm)
    );
  }, [vehicles, search]);

  // ==================================================
  // STATISTICS
  // ==================================================

  const totalVehicles = vehicles.length;
  const vehiclesWithClosing = vehicles.filter((v) => v.closing_odometer_reading !== null).length;
  const vehiclesWithoutClosing = vehicles.filter((v) => v.closing_odometer_reading === null).length;

  const averageOpening = useMemo(() => {
    if (vehicles.length === 0) return 0;
    const total = vehicles.reduce((sum, v) => sum + v.opening_odometer_reading, 0);
    return total / vehicles.length;
  }, [vehicles]);

  // ==================================================
  // FORMAT HELPERS
  // ==================================================

  function formatNumber(value: number | null) {
    if (value === null) return "—";
    return value.toLocaleString("en-KE", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ==================================================
  // USER INFO
  // ==================================================

  const firstName =
    user?.first_name?.trim() || user?.email?.split("@")[0] || "Administrator";

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || firstName;

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          </div>
          <p className="mt-5 text-sm font-medium text-slate-600">Loading vehicles...</p>
          <p className="mt-1 text-xs text-slate-400">Retrieving fleet data</p>
        </div>
      </div>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ==================================================
          SIDEBAR - EXACT SAME AS DASHBOARD
      ================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-lg font-black text-white shadow-lg shadow-blue-600/20">
              N
            </div>
            <div className="text-left">
              <p className="text-sm font-bold tracking-wide text-white">NYUTU LIMITED</p>
              <p className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-slate-500">
                ERP MANAGEMENT
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Administration
          </p>
          <nav className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {active && <ChevronRight size={15} className="opacity-70" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-400">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{fullName}</p>
              <p className="truncate text-[10px] text-slate-500">
                {user?.role || "Administrator"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} />
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* ==================================================
          MAIN CONTENT
      ================================================== */}
      <div className="min-h-screen lg:pl-72">
        {/* Header - EXACT SAME AS DASHBOARD */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <div>
                <p className="hidden text-xs font-medium text-slate-400 sm:block">{today}</p>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                  {greeting}, {firstName}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  System Online
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-sm font-bold text-white shadow-md shadow-blue-600/20">
                {firstName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Welcome Section */}
          <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 shadow-xl sm:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5">
                  <ShieldCheck size={13} className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                    Fleet Management
                  </span>
                </div>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                  Manage company vehicles, track odometer readings, and monitor fleet status.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <Truck size={34} className="text-blue-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Success Message */}
          {success && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 text-xs">✓</span>
              </div>
              <p className="text-sm font-medium text-emerald-800">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Unable to load vehicles</p>
                <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Total Vehicles</p>
              <p className="mt-1 text-2xl font-bold">{totalVehicles}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-emerald-50 p-2.5">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">With Closing Reading</p>
              <p className="mt-1 text-2xl font-bold">{vehiclesWithClosing}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-orange-50 p-2.5">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Without Closing Reading</p>
              <p className="mt-1 text-2xl font-bold">{vehiclesWithoutClosing}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-violet-50 p-2.5">
                  <Gauge className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Avg Opening Odometer</p>
              <p className="mt-1 text-2xl font-bold">{formatNumber(averageOpening)}</p>
            </div>
          </div>

          {/* Search + Add Button */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by asset identifier, operator, or remarks..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={refreshPage}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={openCreateModal}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Register Vehicle
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold">Vehicle Register</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Showing {filteredVehicles.length} of {vehicles.length} vehicles
                </p>
              </div>
            </div>

            {filteredVehicles.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <Truck className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="font-semibold">No vehicles found</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  {vehicles.length === 0
                    ? "You have not registered any vehicles yet."
                    : "Try changing your search."}
                </p>
                {vehicles.length === 0 && (
                  <button
                    onClick={openCreateModal}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Register Vehicle
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Asset</th>
                      <th className="px-5 py-4">Operator</th>
                      <th className="px-5 py-4 text-right">Opening</th>
                      <th className="px-5 py-4 text-right">Closing</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {vehicle.asset_identifier}
                            </p>
                            {vehicle.remarks && (
                              <p className="text-xs text-slate-500 mt-0.5">{vehicle.remarks}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {vehicle.assigned_operator || "—"}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {formatNumber(vehicle.opening_odometer_reading)}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {formatNumber(vehicle.closing_odometer_reading)}
                        </td>
                        <td className="px-5 py-4">
                          {vehicle.closing_odometer_reading !== null ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setSelectedVehicle(vehicle)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="View vehicle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(vehicle)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="Edit vehicle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteVehicle(vehicle)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              title="Delete vehicle"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ==================================================
          VEHICLE FORM MODAL
      ================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">
                  {editingVehicle ? "Edit Vehicle" : "Register Vehicle"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingVehicle
                    ? "Update vehicle information"
                    : "Add a new vehicle to the fleet"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Asset Identifier <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.asset_identifier}
                    onChange={(e) => handleInputChange("asset_identifier", e.target.value)}
                    placeholder="e.g. KDJ 123A or Wheel Loader 1"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Assigned Operator</label>
                  <input
                    type="text"
                    value={form.assigned_operator}
                    onChange={(e) => handleInputChange("assigned_operator", e.target.value)}
                    placeholder="Driver or operator name"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Opening Odometer Reading <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.opening_odometer_reading}
                    onChange={(e) => handleInputChange("opening_odometer_reading", e.target.value)}
                    placeholder="0.0"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Closing Odometer Reading</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.closing_odometer_reading}
                    onChange={(e) => handleInputChange("closing_odometer_reading", e.target.value)}
                    placeholder="Leave empty if not closed"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Remarks</label>
                  <input
                    type="text"
                    value={form.remarks}
                    onChange={(e) => handleInputChange("remarks", e.target.value)}
                    placeholder="Optional remarks about the vehicle"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-sm text-blue-700">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Closing odometer reading must be greater than or equal to opening reading.
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveVehicle}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {editingVehicle ? "Save Changes" : "Register Vehicle"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          VEHICLE DETAILS MODAL
      ================================================== */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">Vehicle Details</h2>
                <p className="mt-1 text-sm text-slate-500">Complete vehicle information</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-600">
                  {selectedVehicle.asset_identifier.charAt(0).toUpperCase()}
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold">{selectedVehicle.asset_identifier}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedVehicle.assigned_operator || "No operator assigned"}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      selectedVehicle.closing_odometer_reading !== null
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {selectedVehicle.closing_odometer_reading !== null ? "Complete" : "Active"}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Asset Identifier
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedVehicle.asset_identifier}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Assigned Operator
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedVehicle.assigned_operator || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Opening Odometer
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatNumber(selectedVehicle.opening_odometer_reading)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Closing Odometer
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatNumber(selectedVehicle.closing_odometer_reading)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedVehicle.closing_odometer_reading !== null ? "Complete" : "Active"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Registered At
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(selectedVehicle.created_at)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Remarks
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedVehicle.remarks || "No remarks"}
                  </p>
                </div>

                {selectedVehicle.closing_odometer_reading !== null && (
                  <div className="sm:col-span-2 border-t border-slate-200 pt-4">
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                      <p className="text-sm text-blue-700">
                        <Gauge className="h-4 w-4 inline mr-2" />
                        Total usage:{" "}
                        <strong>
                          {formatNumber(
                            selectedVehicle.closing_odometer_reading -
                              selectedVehicle.opening_odometer_reading
                          )}
                        </strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
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