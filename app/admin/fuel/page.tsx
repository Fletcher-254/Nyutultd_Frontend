"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
  Search,
  RefreshCw,
  AlertTriangle,
  Plus,
  Eye,
  TrendingUp,
  TrendingDown,
  File,
  WalletCards,
  ArrowDown,
  ArrowUp,
  ShieldCheck,
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
}

interface FuelPurchase {
  id: number;
  fuel_date: string;
  supplier: string | null;
  litres: string | number;
  cost: string | number;
  receipt_reference: string | null;
  receipt_file: string | null;
  created_at: string;
}

interface FuelIssue {
  id: number;
  vehicle: number;
  vehicle_name: string;
  fuel_date: string;
  litres: string | number;
  odometer_reading: string | number;
  remarks: string | null;
  created_at: string;
}

interface FuelPurchaseForm {
  fuel_date: string;
  supplier: string;
  litres: string;
  cost: string;
  receipt_reference: string;
  receipt_file: File | null;
}

interface FuelIssueForm {
  vehicle: string;
  fuel_date: string;
  litres: string;
  odometer_reading: string;
  remarks: string;
}

const EMPTY_PURCHASE_FORM: FuelPurchaseForm = {
  fuel_date: new Date().toISOString().split("T")[0],
  supplier: "",
  litres: "",
  cost: "",
  receipt_reference: "",
  receipt_file: null,
};

const EMPTY_ISSUE_FORM: FuelIssueForm = {
  vehicle: "",
  fuel_date: new Date().toISOString().split("T")[0],
  litres: "",
  odometer_reading: "",
  remarks: "",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not configured."
  );
}

export default function FuelPage() {
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
  // LOGOUT
  // ==================================================

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      router.replace("/");
    }
  };

  // ==================================================
  // STATE
  // ==================================================

  const [user, setUser] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [purchases, setPurchases] = useState<FuelPurchase[]>([]);
  const [issues, setIssues] = useState<FuelIssue[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"purchases" | "issues">("purchases");

  // ==================================================
  // PURCHASE MODAL
  // ==================================================

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<FuelPurchaseForm>(EMPTY_PURCHASE_FORM);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // ==================================================
  // ISSUE MODAL
  // ==================================================

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueForm, setIssueForm] = useState<FuelIssueForm>(EMPTY_ISSUE_FORM);

  // ==================================================
  // DETAIL MODAL
  // ==================================================

  const [selectedPurchase, setSelectedPurchase] = useState<FuelPurchase | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<FuelIssue | null>(null);

  // ==================================================
  // LOAD DATA
  // ==================================================

  const loadUser = useCallback(async () => {
    const response = await authenticatedFetch(`${API_URL}/me/`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response) return null;
    if (!response.ok) throw new Error("Failed to load user.");
    const data: UserProfile = await response.json();
    setUser(data);

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

    return data;
  }, [authenticatedFetch]);

  const loadVehicles = useCallback(async () => {
    const response = await authenticatedFetch(`${API_URL}/vehicles/`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response) return;
    if (!response.ok) throw new Error(`Failed to load vehicles.`);
    const data = await response.json();
    setVehicles(Array.isArray(data) ? data : []);
  }, [authenticatedFetch]);

  const loadFuelPurchases = useCallback(async () => {
    const response = await authenticatedFetch(`${API_URL}/fuel/purchases/`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response) return;
    if (!response.ok) throw new Error(`Failed to load fuel purchases.`);
    const data = await response.json();
    setPurchases(Array.isArray(data) ? data : []);
  }, [authenticatedFetch]);

  const loadFuelIssues = useCallback(async () => {
    const response = await authenticatedFetch(`${API_URL}/fuel/issues/`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response) return;
    if (!response.ok) throw new Error(`Failed to load fuel issues.`);
    const data = await response.json();
    setIssues(Array.isArray(data) ? data : []);
  }, [authenticatedFetch]);

  const loadFuelPage = useCallback(async () => {
    try {
      setError("");
      const currentUser = await loadUser();
      if (!currentUser) return;
      await Promise.all([loadVehicles(), loadFuelPurchases(), loadFuelIssues()]);
    } catch (err: unknown) {
      console.error("Fuel page error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong while loading fuel data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadUser, loadVehicles, loadFuelPurchases, loadFuelIssues]);

  useEffect(() => {
    loadFuelPage();
  }, [loadFuelPage]);

  const refreshPage = async () => {
    setRefreshing(true);
    await loadFuelPage();
  };

  // ==================================================
  // PERMISSIONS
  // ==================================================

  const isAdmin = user?.role === "admin";

  // ==================================================
  // PURCHASE FORM HELPERS
  // ==================================================

  function resetPurchaseForm() {
    setPurchaseForm({
      ...EMPTY_PURCHASE_FORM,
      fuel_date: new Date().toISOString().split("T")[0],
    });
    setReceiptPreview(null);
  }

  function openCreatePurchaseModal() {
    resetPurchaseForm();
    setError("");
    setSuccess("");
    setShowPurchaseModal(true);
  }

  function closePurchaseModal() {
    if (purchaseSubmitting) return;
    setShowPurchaseModal(false);
    resetPurchaseForm();
  }

  function handlePurchaseInputChange(field: keyof FuelPurchaseForm, value: string) {
    setPurchaseForm((current) => ({ ...current, [field]: value }));
  }

  function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setPurchaseForm((current) => ({ ...current, receipt_file: file }));
    if (file) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  }

  // ==================================================
  // ISSUE FORM HELPERS
  // ==================================================

  function resetIssueForm() {
    setIssueForm({
      ...EMPTY_ISSUE_FORM,
      fuel_date: new Date().toISOString().split("T")[0],
    });
  }

  function openCreateIssueModal() {
    resetIssueForm();
    setError("");
    setSuccess("");
    setShowIssueModal(true);
  }

  function closeIssueModal() {
    if (issueSubmitting) return;
    setShowIssueModal(false);
    resetIssueForm();
  }

  function handleIssueInputChange(field: keyof FuelIssueForm, value: string) {
    setIssueForm((current) => ({ ...current, [field]: value }));
  }

  // ==================================================
  // CREATE FUEL PURCHASE
  // ==================================================

  async function createFuelPurchase() {
    if (!isAdmin) {
      alert("Only admins can record fuel purchases.");
      return;
    }
    if (!purchaseForm.fuel_date) {
      alert("Fuel date is required.");
      return;
    }
    if (!purchaseForm.litres || Number(purchaseForm.litres) <= 0) {
      alert("Litres must be greater than zero.");
      return;
    }
    if (!purchaseForm.cost || Number(purchaseForm.cost) <= 0) {
      alert("Cost must be greater than zero.");
      return;
    }
    if (!purchaseForm.receipt_file) {
      alert("Receipt file is required.");
      return;
    }

    setPurchaseSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("fuel_date", purchaseForm.fuel_date);
      formData.append("supplier", purchaseForm.supplier.trim());
      formData.append("litres", purchaseForm.litres);
      formData.append("cost", purchaseForm.cost);
      formData.append("receipt_reference", purchaseForm.receipt_reference.trim());
      formData.append("receipt_file", purchaseForm.receipt_file);

      const response = await authenticatedFetch(`${API_URL}/fuel/purchases/create/`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      if (!response) return;

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Failed to record purchase.`;
        try {
          const data = JSON.parse(responseText);
          if (data.detail) message = data.detail;
          else if (data.error) message = data.error;
          else if (typeof data === "object") {
            const firstError = Object.values(data)[0];
            if (Array.isArray(firstError)) message = String(firstError[0]);
            else if (firstError) message = String(firstError);
          }
        } catch {
          // Keep default
        }
        alert(message);
        return;
      }

      const savedPurchase = JSON.parse(responseText);
      setPurchases((prev) => [savedPurchase, ...prev]);
      setSuccess("Fuel purchase recorded successfully.");
      closePurchaseModal();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Fuel purchase error:", err);
      alert("Something went wrong while recording the purchase.");
    } finally {
      setPurchaseSubmitting(false);
    }
  }

  // ==================================================
  // CREATE FUEL ISSUE
  // ==================================================

  async function createFuelIssue() {
    if (!isAdmin) {
      alert("Only admins can record fuel issues.");
      return;
    }
    if (!issueForm.vehicle) {
      alert("Please select a vehicle.");
      return;
    }
    if (!issueForm.fuel_date) {
      alert("Fuel date is required.");
      return;
    }
    if (!issueForm.litres || Number(issueForm.litres) <= 0) {
      alert("Litres must be greater than zero.");
      return;
    }
    if (!issueForm.odometer_reading || Number(issueForm.odometer_reading) < 0) {
      alert("Odometer reading cannot be negative.");
      return;
    }

    setIssueSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        vehicle: Number(issueForm.vehicle),
        fuel_date: issueForm.fuel_date,
        litres: Number(issueForm.litres),
        odometer_reading: Number(issueForm.odometer_reading),
        remarks: issueForm.remarks.trim() || null,
      };

      const response = await authenticatedFetch(`${API_URL}/fuel/issues/create/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response) return;

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Failed to record fuel issue.`;
        try {
          const data = JSON.parse(responseText);
          if (data.detail) message = data.detail;
          else if (data.error) message = data.error;
          else if (typeof data === "object") {
            const firstError = Object.values(data)[0];
            if (Array.isArray(firstError)) message = String(firstError[0]);
            else if (firstError) message = String(firstError);
          }
        } catch {
          // Keep default
        }
        alert(message);
        return;
      }

      const savedIssue = JSON.parse(responseText);
      setIssues((prev) => [savedIssue, ...prev]);

      // Update vehicle's closing odometer
      setVehicles((prevVehicles) =>
        prevVehicles.map((v) =>
          v.id === Number(issueForm.vehicle)
            ? { ...v, closing_odometer_reading: Number(issueForm.odometer_reading) }
            : v
        )
      );

      setSuccess("Fuel issue recorded successfully.");
      closeIssueModal();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Fuel issue error:", err);
      alert("Something went wrong while recording the fuel issue.");
    } finally {
      setIssueSubmitting(false);
    }
  }

  // ==================================================
  // SEARCH & FILTER
  // ==================================================

  const filteredPurchases = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return purchases;
    return purchases.filter(
      (purchase) =>
        (purchase.supplier || "").toLowerCase().includes(searchTerm) ||
        (purchase.receipt_reference || "").toLowerCase().includes(searchTerm) ||
        purchase.fuel_date.includes(searchTerm)
    );
  }, [purchases, search]);

  const filteredIssues = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return issues;
    return issues.filter(
      (issue) =>
        issue.vehicle_name.toLowerCase().includes(searchTerm) ||
        (issue.remarks || "").toLowerCase().includes(searchTerm) ||
        issue.fuel_date.includes(searchTerm)
    );
  }, [issues, search]);

  // ==================================================
  // STATISTICS
  // ==================================================

  const totalPurchasedLitres = useMemo(() => {
    return purchases.reduce((sum, p) => sum + Number(p.litres || 0), 0);
  }, [purchases]);

  const totalPurchaseCost = useMemo(() => {
    return purchases.reduce((sum, p) => sum + Number(p.cost || 0), 0);
  }, [purchases]);

  const totalIssuedLitres = useMemo(() => {
    return issues.reduce((sum, i) => sum + Number(i.litres || 0), 0);
  }, [issues]);

  const remainingFuel = totalPurchasedLitres - totalIssuedLitres;

  const averageCostPerLitre = useMemo(() => {
    if (totalPurchasedLitres === 0) return 0;
    return totalPurchaseCost / totalPurchasedLitres;
  }, [totalPurchaseCost, totalPurchasedLitres]);

  // ==================================================
  // FORMAT HELPERS
  // ==================================================

  function formatNumber(value: string | number) {
    return Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
  // INITIAL LOADING
  // ==================================================

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          </div>
          <p className="mt-5 text-sm font-medium text-slate-600">Loading fuel data...</p>
          <p className="mt-1 text-xs text-slate-400">Verifying secure access</p>
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
            onClick={handleLogout}
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
                    Fuel Management
                  </span>
                </div>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                  Track fuel purchases and vehicle fuel usage in one place.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <Fuel size={34} className="text-blue-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Success */}
          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                <span className="text-xs text-emerald-600">✓</span>
              </div>
              <p className="text-sm font-medium text-emerald-800">{success}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Unable to load fuel data</p>
                <p className="mt-1 whitespace-pre-line text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Purchased</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatNumber(totalPurchasedLitres)} L
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ArrowDown className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Issued</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatNumber(totalIssuedLitres)} L
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ArrowUp className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Remaining</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatNumber(remainingFuel)} L
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Fuel className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Cost</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    KES {formatNumber(totalPurchaseCost)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <WalletCards className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Avg Cost/Litre</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    KES {formatNumber(averageCostPerLitre)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Tabs + Search + Buttons */}
            <div className="border-b border-slate-200 px-5 pt-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-6">
                  <button
                    onClick={() => setView("purchases")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                      view === "purchases"
                        ? "text-blue-600 border-blue-600"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    Purchases
                  </button>
                  <button
                    onClick={() => setView("issues")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                      view === "issues"
                        ? "text-blue-600 border-blue-600"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    }`}
                  >
                    Fuel Issues
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={view === "purchases" ? "Search purchases..." : "Search fuel issues..."}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200 md:w-48"
                    />
                  </div>
                  <button
                    onClick={refreshPage}
                    disabled={refreshing}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    Refresh                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={openCreatePurchaseModal}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Purchase
                      </button>
                      <button
                        onClick={openCreateIssueModal}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Fuel Issue
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Purchases Table */}
            {view === "purchases" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50 border-b border-blue-200">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Litres
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Receipt #
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Receipt
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                          {search ? "No purchases match your search." : "No fuel purchases recorded."}
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(purchase.fuel_date)}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-900">
                            {purchase.supplier || "—"}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            {formatNumber(purchase.litres)} L
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            KES {formatNumber(purchase.cost)}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {purchase.receipt_reference || "—"}
                          </td>
                          <td className="px-5 py-4">
                            {purchase.receipt_file ? (
                              <a
                                href={purchase.receipt_file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <File className="h-4 w-4" />
                                View
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedPurchase(purchase)}
                                className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100 transition-colors"
                                title="View purchase"
                              >
                                <Eye className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Issues Table */}
            {view === "issues" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50 border-b border-blue-200">
                    <tr>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Litres
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Odometer
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Remarks
                      </th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIssues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                          {search ? "No fuel issues match your search." : "No fuel issues recorded."}
                        </td>
                      </tr>
                    ) : (
                      filteredIssues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(issue.fuel_date)}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-slate-900">
                            {issue.vehicle_name}
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            {formatNumber(issue.litres)} L
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            {formatNumber(issue.odometer_reading)}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {issue.remarks || "—"}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedIssue(issue)}
                                className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100 transition-colors"
                                title="View fuel issue"
                              >
                                <Eye className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5">
              <div className="flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {view === "purchases"
                    ? `Showing ${filteredPurchases.length} of ${purchases.length} purchases`
                    : `Showing ${filteredIssues.length} of ${issues.length} fuel issues`}
                </span>
                <span className="font-medium text-slate-700">
                  {view === "purchases"
                    ? `Total litres: ${formatNumber(totalPurchasedLitres)} L`
                    : `Total litres: ${formatNumber(totalIssuedLitres)} L`}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ==================================================
          PURCHASE FORM MODAL
      ================================================== */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Record Fuel Purchase</h2>
                <p className="mt-1 text-sm text-slate-500">Add a new fuel purchase record</p>
              </div>
              <button onClick={closePurchaseModal} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fuel Date <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.fuel_date}
                    onChange={(e) => handlePurchaseInputChange("fuel_date", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={purchaseForm.supplier}
                    onChange={(e) => handlePurchaseInputChange("supplier", e.target.value)}
                    placeholder="Supplier name (optional)"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Litres <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.litres}
                    onChange={(e) => handlePurchaseInputChange("litres", e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cost (KES) <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.cost}
                    onChange={(e) => handlePurchaseInputChange("cost", e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Receipt Reference
                  </label>
                  <input
                    type="text"
                    value={purchaseForm.receipt_reference}
                    onChange={(e) => handlePurchaseInputChange("receipt_reference", e.target.value)}
                    placeholder="Receipt or invoice number (optional)"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Receipt File <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptChange}
                    className="w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                    required
                  />
                  {receiptPreview && (
                    <div className="mt-3">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="h-24 w-auto rounded-xl border border-slate-200 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closePurchaseModal}
                  disabled={purchaseSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createFuelPurchase}
                  disabled={purchaseSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {purchaseSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Record Purchase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          ISSUE FORM MODAL
      ================================================== */}
      {showIssueModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Record Fuel Issue</h2>
                <p className="mt-1 text-sm text-slate-500">Record fuel issued to a vehicle</p>
              </div>
              <button onClick={closeIssueModal} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Vehicle <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={issueForm.vehicle}
                    onChange={(e) => handleIssueInputChange("vehicle", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.asset_identifier}
                        {vehicle.assigned_operator && ` (${vehicle.assigned_operator})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fuel Date <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    value={issueForm.fuel_date}
                    onChange={(e) => handleIssueInputChange("fuel_date", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Litres <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={issueForm.litres}
                    onChange={(e) => handleIssueInputChange("litres", e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Odometer Reading <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={issueForm.odometer_reading}
                    onChange={(e) => handleIssueInputChange("odometer_reading", e.target.value)}
                    placeholder="0.0"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={issueForm.remarks}
                    onChange={(e) => handleIssueInputChange("remarks", e.target.value)}
                    placeholder="Optional remarks"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-sm text-blue-700">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Odometer reading must be greater than or equal to the vehicle's opening reading and any previous readings.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeIssueModal}
                  disabled={issueSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createFuelIssue}
                  disabled={issueSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {issueSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Record Fuel Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          PURCHASE DETAILS MODAL
      ================================================== */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Purchase Details</h2>
                <p className="mt-1 text-sm text-slate-500">Complete purchase information</p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Date</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {formatDate(selectedPurchase.fuel_date)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Supplier</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {selectedPurchase.supplier || "—"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Litres</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {formatNumber(selectedPurchase.litres)} L
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Cost</span>
                  <span className="text-sm text-slate-900 font-medium">
                    KES {formatNumber(selectedPurchase.cost)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Receipt Reference</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {selectedPurchase.receipt_reference || "—"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Recorded At</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {formatDate(selectedPurchase.created_at)}
                  </span>
                </div>

                {selectedPurchase.receipt_file && (
                  <div className="border-t border-slate-200 pt-4">
                    <label className="block text-sm font-medium text-slate-500 mb-2">
                      Receipt File
                    </label>
                    <a
                      href={selectedPurchase.receipt_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <File className="h-4 w-4" />
                      View Receipt
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-200">
                <button
                  onClick={() => setSelectedPurchase(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          FUEL ISSUE DETAILS MODAL
      ================================================== */}
      {selectedIssue && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Fuel Issue Details</h2>
                <p className="mt-1 text-sm text-slate-500">Complete fuel issue information</p>
              </div>
              <button onClick={() => setSelectedIssue(null)} className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Date</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {formatDate(selectedIssue.fuel_date)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Vehicle</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {selectedIssue.vehicle_name}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Litres</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {formatNumber(selectedIssue.litres)} L
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Odometer Reading</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {formatNumber(selectedIssue.odometer_reading)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Remarks</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {selectedIssue.remarks || "—"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <span className="text-sm font-medium text-slate-500 sm:w-40">Recorded At</span>
                  <span className="text-sm text-slate-900 font-medium">
                    {formatDate(selectedIssue.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-slate-200">
                <button
                  onClick={() => setSelectedIssue(null)}
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