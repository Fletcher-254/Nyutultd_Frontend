
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
  Loader2,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Gauge,
  AlertCircle,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface UserProfile {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

interface Vehicle {
  id: number;
  registration_number: string;
  make?: string;
  model?: string;
  vehicle_type?: string;
  year?: number;
  opening_odometer?: number | string | null;
  closing_odometer?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

interface VehicleFormData {
  registration_number: string;
  make: string;
  model: string;
  vehicle_type: string;
  year: string;
  opening_odometer: string;
  closing_odometer: string;
}

const EMPTY_FORM: VehicleFormData = {
  registration_number: "",
  make: "",
  model: "",
  vehicle_type: "",
  year: "",
  opening_odometer: "",
  closing_odometer: "",
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ============================================================
// COMPONENT
// ============================================================

export default function ManagerVehiclesPage() {
  const router = useRouter();
  const pathname = usePathname();

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [user, setUser] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] =
    useState<"create" | "edit">("create");

  const [selectedVehicle, setSelectedVehicle] =
    useState<Vehicle | null>(null);

  const [viewVehicle, setViewVehicle] =
    useState<Vehicle | null>(null);

  const [form, setForm] =
    useState<VehicleFormData>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] =
    useState<number | null>(null);

  const [successMessage, setSuccessMessage] =
    useState("");

  // ----------------------------------------------------------
  // MENU
  // ----------------------------------------------------------

  const menuItems = [
    {
      label: "Dashboard",
      href: "/manager/dashboard",
      icon: LayoutDashboard,
    },
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

  // ----------------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------------

  const navigate = (href: string) => {
    setMobileMenuOpen(false);
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === "/manager/dashboard") {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  // ----------------------------------------------------------
  // FETCH HELPER
  // ----------------------------------------------------------

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        cache: "no-store",
      });

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.push("/login");
        throw new Error("Unauthorized");
      }

      return response;
    },
    [router]
  );

  // ----------------------------------------------------------
  // LOAD USER + VEHICLES
  // ----------------------------------------------------------

  const loadVehiclesPage = useCallback(async () => {
    try {
      setError("");

      const meResponse =
        await authenticatedFetch(`${API_URL}/me/`);

      if (!meResponse.ok) {
        throw new Error(
          "Unable to load your profile."
        );
      }

      const meData = await meResponse.json();

      setUser(meData);

      if (meData.role !== "manager") {
        if (meData.role === "admin") {
          router.push("/admin/dashboard");
        } else if (meData.role === "director") {
          router.push("/director/dashboard");
        } else {
          router.push("/login");
        }

        return;
      }

      const vehiclesResponse =
        await authenticatedFetch(
          `${API_URL}/vehicles/`
        );

      if (!vehiclesResponse.ok) {
        throw new Error(
          "Unable to load vehicles."
        );
      }

      const vehiclesData =
        await vehiclesResponse.json();

      if (Array.isArray(vehiclesData)) {
        setVehicles(vehiclesData);
      } else if (
        Array.isArray(vehiclesData.results)
      ) {
        setVehicles(vehiclesData.results);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "Unauthorized"
      ) {
        return;
      }

      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading vehicles."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadVehiclesPage();
  }, [loadVehiclesPage]);

  // ----------------------------------------------------------
  // REFRESH
  // ----------------------------------------------------------

  const refreshPage = async () => {
    setRefreshing(true);
    await loadVehiclesPage();
  };

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      router.push("/login");
    }
  };

  // ----------------------------------------------------------
  // FORM
  // ----------------------------------------------------------

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedVehicle(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
    setShowModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModalMode("edit");

    setForm({
      registration_number:
        vehicle.registration_number || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      vehicle_type:
        vehicle.vehicle_type || "",
      year: vehicle.year
        ? String(vehicle.year)
        : "",
      opening_odometer:
        vehicle.opening_odometer !== null &&
        vehicle.opening_odometer !== undefined
          ? String(vehicle.opening_odometer)
          : "",
      closing_odometer:
        vehicle.closing_odometer !== null &&
        vehicle.closing_odometer !== undefined
          ? String(vehicle.closing_odometer)
          : "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const updateForm = (
    field: keyof VehicleFormData,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // ----------------------------------------------------------
  // SAVE VEHICLE
  // ----------------------------------------------------------

  const saveVehicle = async () => {
    if (!form.registration_number.trim()) {
      setError(
        "Vehicle registration number is required."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        registration_number:
          form.registration_number.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        vehicle_type:
          form.vehicle_type.trim(),
        year: form.year
          ? Number(form.year)
          : null,
        opening_odometer:
          form.opening_odometer
            ? Number(form.opening_odometer)
            : null,
        closing_odometer:
          form.closing_odometer
            ? Number(form.closing_odometer)
            : null,
      };

      const url =
        modalMode === "edit" &&
        selectedVehicle
          ? `${API_URL}/vehicles/${selectedVehicle.id}/`
          : `${API_URL}/vehicles/`;

      const method =
        modalMode === "edit"
          ? "PUT"
          : "POST";

      const response =
        await authenticatedFetch(url, {
          method,
          body: JSON.stringify(payload),
        });

      if (!response.ok) {
        let message =
          "Unable to save vehicle.";

        try {
          const data =
            await response.json();

          if (typeof data === "object") {
            const firstError =
              Object.values(data)[0];

            if (Array.isArray(firstError)) {
              message = String(firstError[0]);
            } else if (
              typeof firstError === "string"
            ) {
              message = firstError;
            }
          }
        } catch {
          // Keep default error.
        }

        throw new Error(message);
      }

      closeModal();

      setSuccessMessage(
        modalMode === "edit"
          ? "Vehicle updated successfully."
          : "Vehicle registered successfully."
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);

      await loadVehiclesPage();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save vehicle."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE VEHICLE
  // ----------------------------------------------------------

  const deleteVehicle = async (
    vehicle: Vehicle
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${vehicle.registration_number}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(vehicle.id);
      setError("");

      const response =
        await authenticatedFetch(
          `${API_URL}/vehicles/${vehicle.id}/`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        throw new Error(
          "Unable to delete vehicle."
        );
      }

      setSuccessMessage(
        "Vehicle deleted successfully."
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);

      await loadVehiclesPage();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete vehicle."
      );
    } finally {
      setDeleting(null);
    }
  };

  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  const filteredVehicles = useMemo(() => {
    const query =
      searchTerm.trim().toLowerCase();

    if (!query) {
      return vehicles;
    }

    return vehicles.filter((vehicle) => {
      return (
        vehicle.registration_number
          ?.toLowerCase()
          .includes(query) ||
        vehicle.make
          ?.toLowerCase()
          .includes(query) ||
        vehicle.model
          ?.toLowerCase()
          .includes(query) ||
        vehicle.vehicle_type
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [vehicles, searchTerm]);

  // ----------------------------------------------------------
  // STATS
  // ----------------------------------------------------------

  const totalVehicles = vehicles.length;

  const vehiclesWithClosingReading =
    vehicles.filter(
      (vehicle) =>
        vehicle.closing_odometer !== null &&
        vehicle.closing_odometer !== undefined &&
        vehicle.closing_odometer !== ""
    ).length;

  const vehiclesWithoutClosingReading =
    totalVehicles -
    vehiclesWithClosingReading;

  const averageOpeningOdometer =
    totalVehicles > 0
      ? vehicles.reduce(
          (sum, vehicle) => {
            const value = Number(
              vehicle.opening_odometer || 0
            );

            return sum + value;
          },
          0
        ) / totalVehicles
      : 0;

  // ----------------------------------------------------------
  // FORMATTING
  // ----------------------------------------------------------

  const formatNumber = (
    value:
      | number
      | string
      | null
      | undefined
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return new Intl.NumberFormat(
      "en-KE"
    ).format(number);
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-KE",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  })();

  const firstName =
    user?.first_name?.trim() ||
    user?.username ||
    "Manager";

  const fullName =
    [
      user?.first_name,
      user?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    user?.username ||
    "Manager";

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Loading vehicles...
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Verifying secure access
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // FULL PAGE ERROR
  // ============================================================

  if (error && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            Unable to load vehicles
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={loadVehiclesPage}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          MOBILE OVERLAY
      ====================================================== */}

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* BRAND */}

        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <button
            type="button"
            onClick={() =>
              navigate("/manager/dashboard")
            }
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
            onClick={() =>
              setMobileMenuOpen(false)
            }
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION */}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Main Menu
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active =
                isActive(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() =>
                    navigate(item.href)
                  }
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

                  <span className="flex-1">
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ACCOUNT */}

        <div className="shrink-0 border-t border-white/10 bg-slate-950 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {firstName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {fullName}
              </p>

              <p className="truncate text-xs text-slate-400">
                {user?.email || "Manager"}
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="min-h-screen lg:pl-72">

        {/* HEADER */}

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(true)
                }
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
                {firstName
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">

          {/* ==================================================
              WELCOME SECTION
          ================================================== */}

          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5">
                  <Truck className="h-3.5 w-3.5 text-blue-300" />

                  <span className="text-xs font-semibold text-blue-200">
                    Fleet Management
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-400">
                  {greeting}, {firstName}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Manage company vehicles
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  View and manage registered vehicles,
                  monitor odometer readings, and keep
                  fleet records up to date.
                </p>
              </div>

              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 lg:flex">
                <Truck className="h-8 w-8 text-blue-300" />
              </div>
            </div>
          </section>

          {/* ==================================================
              SUCCESS MESSAGE
          ================================================== */}

          {successMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />

              <span className="font-medium">
                {successMessage}
              </span>
            </div>
          )}

          {/* ==================================================
              ERROR MESSAGE
          ================================================== */}

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />

              <span className="font-medium">
                {error}
              </span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="ml-auto text-xs font-bold text-red-700 hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ==================================================
              OVERVIEW STATS
          ================================================== */}

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* TOTAL VEHICLES */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Vehicles
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {formatNumber(
                      totalVehicles
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Registered fleet
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* CLOSING */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Closing Recorded
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {formatNumber(
                      vehiclesWithClosingReading
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Vehicles with closing readings
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* PENDING */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pending Readings
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {formatNumber(
                      vehiclesWithoutClosingReading
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Closing reading required
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>

            {/* AVERAGE */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Avg Opening Odometer
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {formatNumber(
                      Math.round(
                        averageOpeningOdometer
                      )
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Fleet average · km
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                  <Gauge className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              VEHICLE REGISTER
          ================================================== */}

          <section>
            <div className="mb-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                    Fleet
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                    Vehicle Register
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    View and manage company vehicle records.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={refreshPage}
                    disabled={refreshing}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />

                    Register Vehicle
                  </button>
                </div>
              </div>
            </div>

            {/* SEARCH */}

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="relative w-full lg:max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search registration, make, model or vehicle type..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* TABLE */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Registered Vehicles
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredVehicles.length} vehicle
                    {filteredVehicles.length === 1
                      ? ""
                      : "s"} found
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />

                  Manager access
                </div>
              </div>

              {filteredVehicles.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Truck className="h-7 w-7 text-slate-400" />
                  </div>

                  <h4 className="mt-5 text-base font-bold text-slate-900">
                    No vehicles found
                  </h4>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {searchTerm
                      ? "No vehicles match your search. Try a different registration number, make, model, or vehicle type."
                      : "There are currently no vehicles registered in the system."}
                  </p>

                  {!searchTerm && (
                    <button
                      type="button"
                      onClick={
                        openCreateModal
                      }
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />

                      Register Vehicle
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Vehicle
                        </th>

                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Type
                        </th>

                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Opening
                        </th>

                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Closing
                        </th>

                        <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredVehicles.map(
                        (vehicle) => {
                          const hasClosing =
                            vehicle.closing_odometer !==
                              null &&
                            vehicle.closing_odometer !==
                              undefined &&
                            vehicle.closing_odometer !==
                              "";

                          return (
                            <tr
                              key={
                                vehicle.id
                              }
                              className="transition hover:bg-slate-50/70"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                    <Truck className="h-5 w-5 text-blue-600" />
                                  </div>

                                  <div>
                                    <p className="font-bold text-slate-900">
                                      {
                                        vehicle.registration_number
                                      }
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {[
                                        vehicle.make,
                                        vehicle.model,
                                      ]
                                        .filter(
                                          Boolean
                                        )
                                        .join(
                                          " "
                                        ) ||
                                        "Vehicle"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-sm font-medium text-slate-700">
                                  {vehicle.vehicle_type ||
                                    "—"}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {formatNumber(
                                      vehicle.opening_odometer
                                    )}
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    km
                                  </p>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {formatNumber(
                                      vehicle.closing_odometer
                                    )}
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    km
                                  </p>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                {hasClosing ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                    Complete
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />

                                    Pending
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewVehicle(
                                        vehicle
                                      )
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                    title="View vehicle"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(
                                        vehicle
                                      )
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                    title="Edit vehicle"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteVehicle(
                                        vehicle
                                      )
                                    }
                                    disabled={
                                      deleting ===
                                      vehicle.id
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Delete vehicle"
                                  >
                                    {deleting ===
                                    vehicle.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* ==================================================
              FOOTER
          ================================================== */}

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

      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  Fleet Management
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {modalMode === "edit"
                    ? "Edit Vehicle"
                    : "Register Vehicle"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === "edit"
                    ? "Update the vehicle information below."
                    : "Enter the vehicle information below."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-5 sm:grid-cols-2">

                {/* REGISTRATION */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Registration Number
                  </label>

                  <input
                    type="text"
                    value={
                      form.registration_number
                    }
                    onChange={(event) =>
                      updateForm(
                        "registration_number",
                        event.target.value
                      )
                    }
                    placeholder="e.g. KDA 123A"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm uppercase outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* MAKE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Make
                  </label>

                  <input
                    type="text"
                    value={form.make}
                    onChange={(event) =>
                      updateForm(
                        "make",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Toyota"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* MODEL */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Model
                  </label>

                  <input
                    type="text"
                    value={form.model}
                    onChange={(event) =>
                      updateForm(
                        "model",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Hilux"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* VEHICLE TYPE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Vehicle Type
                  </label>

                  <input
                    type="text"
                    value={form.vehicle_type}
                    onChange={(event) =>
                      updateForm(
                        "vehicle_type",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Truck"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* YEAR */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Year
                  </label>

                  <input
                    type="number"
                    value={form.year}
                    onChange={(event) =>
                      updateForm(
                        "year",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 2022"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* OPENING ODOMETER */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Opening Odometer
                  </label>

                  <input
                    type="number"
                    value={
                      form.opening_odometer
                    }
                    onChange={(event) =>
                      updateForm(
                        "opening_odometer",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 125000"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* CLOSING ODOMETER */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Closing Odometer
                  </label>

                  <input
                    type="number"
                    value={
                      form.closing_odometer
                    }
                    onChange={(event) =>
                      updateForm(
                        "closing_odometer",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 125500"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveVehicle}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {saving
                  ? "Saving..."
                  : modalMode === "edit"
                  ? "Update Vehicle"
                  : "Register Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          VIEW VEHICLE MODAL
      ====================================================== */}

      {viewVehicle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  Vehicle Details
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-900">
                  {
                    viewVehicle.registration_number
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewVehicle(null)
                }
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">

              {/* VEHICLE SUMMARY */}

              <div className="mb-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                  <Truck className="h-7 w-7 text-blue-600" />
                </div>

                <div>
                  <p className="font-bold text-slate-900">
                    {[
                      viewVehicle.make,
                      viewVehicle.model,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                      "Vehicle"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {viewVehicle.vehicle_type ||
                      "Vehicle type not specified"}
                  </p>
                </div>
              </div>

              {/* DETAILS */}

              <div className="grid gap-3 sm:grid-cols-2">

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Registration
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {
                      viewVehicle.registration_number
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Year
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {viewVehicle.year ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Opening Odometer
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {formatNumber(
                      viewVehicle.opening_odometer
                    )}{" "}
                    km
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Closing Odometer
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {formatNumber(
                      viewVehicle.closing_odometer
                    )}{" "}
                    km
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </p>

                  <div className="mt-2">
                    {viewVehicle.closing_odometer !==
                      null &&
                    viewVehicle.closing_odometer !==
                      undefined &&
                    viewVehicle.closing_odometer !==
                      "" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />

                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Registered
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {formatDate(
                      viewVehicle.created_at
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setViewVehicle(null)
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewVehicle(null);
                  openEditModal(
                    viewVehicle
                  );
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" />

                Edit Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

