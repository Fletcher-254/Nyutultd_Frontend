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
  ArrowUpRight,
  UserCheck,
  UserX,
  Store,
  AlertTriangle,
  Receipt,
  WalletCards,
} from "lucide-react";

interface UserProfile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface DashboardStats {
  total_employees: number;
  active_employees: number;
  present_today: number;
  absent_today: number;
  total_vehicles: number;
  available_vehicles: number;
  total_vendors: number;
  active_vendors: number;
  total_expenses_today: number;
  total_expenses_month: number;
  total_fuel_purchased: number;
  total_fuel_issued: number;
  fuel_remaining: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not configured."
  );
}
  

export default function AdminDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [today, setToday] = useState("");
  const [greeting, setGreeting] = useState("");

  const menu = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
      { label: "Employees", icon: Users, path: "/admin/employees" },
      { label: "Attendance", icon: CalendarCheck, path: "/admin/attendance" },
      { label: "Vehicles", icon: Truck, path: "/admin/vehicles" },
      { label: "Fuel", icon: Fuel, path: "/admin/fuel" },
      { label: "Vendors", icon: Store, path: "/admin/vendors" },
    ],
    []
  );

  const isActive = (path: string) => {
    if (path === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navigate = (path: string) => {
    setSidebarOpen(false);
    router.push(path);
  };

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

  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");
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

      const me: UserProfile = await meResponse.json();

const role = me.role?.trim().toLowerCase();       // Verify role
if (role === "admin") {
  // Admin stays - proceed with loading
  setUser(me);
  // ... rest of dashboard loading code
} else if (role === "director") {
  router.replace("/director/dashboard");
  return;
} else if (role === "manager") {
  router.replace("/manager/dashboard");
  return;
} else {
  // Unknown role or no role
  router.replace("/");
  return;
}

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

      // Fetch all data in parallel from the correct endpoints
      const [
        employeesRes,
        attendanceRes,
        vehiclesRes,
        vendorsRes,
        dailyExpensesRes,
        monthlyExpensesRes,
        fuelDailyRes,
      
      ] = await Promise.all([
        authenticatedFetch(`${API_URL}/employees/list/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(`${API_URL}/attendance/today/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(`${API_URL}/vehicles/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(`${API_URL}/vendors/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(`${API_URL}/expenses/daily/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(`${API_URL}/expenses/monthly/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(`${API_URL}/fuel/daily-summary/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        }),
      ]);

      // Process employees - /api/employees/list/
      let employeeList: any[] = [];
      if (employeesRes && employeesRes.ok) {
        const data = await employeesRes.json();
        employeeList = Array.isArray(data) ? data : [];
      }

      // Process attendance - /api/attendance/today/
      let attendanceList: any[] = [];
      if (attendanceRes && attendanceRes.ok) {
        const data = await attendanceRes.json();
        attendanceList = Array.isArray(data) ? data : [];
      }

      // Process vehicles - /api/vehicles/
      let vehicleList: any[] = [];
      if (vehiclesRes && vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        vehicleList = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : [];
      }

      // Process vendors - /api/vendors/
      let vendorList: any[] = [];
      if (vendorsRes && vendorsRes.ok) {
        const data = await vendorsRes.json();
        vendorList = Array.isArray(data) ? data : [];
      }

      // Process daily expenses - /api/expenses/daily/
      let dailyTotal = 0;
      if (dailyExpensesRes && dailyExpensesRes.ok) {
        const data = await dailyExpensesRes.json();
        dailyTotal = data.total || 0;
      }

      // Process monthly expenses - /api/expenses/monthly/
      let monthlyTotal = 0;
      if (monthlyExpensesRes && monthlyExpensesRes.ok) {
        const data = await monthlyExpensesRes.json();
        monthlyTotal = data.total || 0;
      }

      // Process fuel daily summary - /api/fuel/daily-summary/
      let fuelPurchased = 0;
      let fuelIssued = 0;
      let fuelRemaining = 0;
      if (fuelDailyRes && fuelDailyRes.ok) {
        const data = await fuelDailyRes.json();
        fuelPurchased = data.fuel_purchased_litres || 0;
        fuelIssued = data.fuel_issued_litres || 0;
        fuelRemaining = data.fuel_remaining_litres || 0;
      }


      // Calculate stats from fetched data
      const totalEmployees = employeeList.length;
      const activeEmployees = employeeList.filter((e: any) => e.is_active !== false).length;
      const presentToday = attendanceList.filter((a: any) => a.is_present === true).length;
      const absentToday = attendanceList.filter((a: any) => a.is_present === false).length;
      const totalVehicles = vehicleList.length;
      const availableVehicles = vehicleList.filter((v: any) => v.closing_odometer_reading === null).length;
      const totalVendors = vendorList.length;
      const activeVendors = vendorList.filter((v: any) => v.is_active !== false).length;

      setStats({
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        present_today: presentToday,
        absent_today: absentToday,
        total_vehicles: totalVehicles,
        available_vehicles: availableVehicles,
        total_vendors: totalVendors,
        active_vendors: activeVendors,
        total_expenses_today: dailyTotal,
        total_expenses_month: monthlyTotal,
        total_fuel_purchased: fuelPurchased,
        total_fuel_issued: fuelIssued,
        fuel_remaining: fuelRemaining,
      });
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const firstName =
    user?.first_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Admin";

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || firstName;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          </div>
          <p className="mt-5 text-sm font-medium text-slate-600">Loading your dashboard...</p>
          <p className="mt-1 text-xs text-slate-400">Verifying secure access</p>
        </div>
      </div>
    );
  }

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

      {/* Sidebar */}
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
            Management
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
              <p className="truncate text-[10px] text-slate-500">Admin</p>
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

      {/* Main Content */}
      <div className="min-h-screen lg:pl-72">
        {/* Header */}
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
          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Unable to load dashboard data</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Welcome Section */}
          <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 shadow-lg sm:p-5">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1">
                  <ShieldCheck size={11} className="text-blue-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300">
                    Admin
                  </span>
                </div>
                <p className="mt-1 text-sm text-white">
                  Welcome back, <span className="font-semibold">{firstName}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Here's a summary of your key metrics
                </p>
              </div>
              <div className="hidden md:block">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <LayoutDashboard size={24} className="text-blue-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Stats - REAL DATA from correct endpoints */}
          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Overview</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Key Statistics</h2>
              </div>
              <span className="text-xs text-slate-400">
                Last updated: {new Date().toLocaleTimeString("en-KE")}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Employees - /api/employees/list/ */}
              <StatCard
                label="Total Employees"
                value={stats?.total_employees ?? 0}
                subtext={`${stats?.active_employees ?? 0} active`}
                icon={Users}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                onClick={() => navigate("/admin/employees")}
              />

              {/* Attendance - /api/attendance/today/ */}
              <StatCard
                label="Today's Attendance"
                value={stats?.present_today ?? 0}
                subtext={`${stats?.absent_today ?? 0} absent`}
                icon={UserCheck}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                onClick={() => navigate("/admin/attendance")}
              />

              {/* Vehicles - /api/vehicles/ */}
              <StatCard
                label="Total Vehicles"
                value={stats?.total_vehicles ?? 0}
                subtext={`${stats?.available_vehicles ?? 0} available`}
                icon={Truck}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                onClick={() => navigate("/admin/vehicles")}
              />

              {/* Vendors - /api/vendors/ */}
              <StatCard
                label="Total Vendors"
                value={stats?.total_vendors ?? 0}
                subtext={`${stats?.active_vendors ?? 0} active`}
                icon={Store}
                iconBg="bg-rose-50"
                iconColor="text-rose-600"
                onClick={() => navigate("/admin/vendors")}
              />

              {/* Daily Expenses - /api/expenses/daily/ */}
              <StatCard
                label="Today's Expenses"
                value={`KES ${(stats?.total_expenses_today ?? 0).toLocaleString()}`}
                subtext={`Month: KES ${(stats?.total_expenses_month ?? 0).toLocaleString()}`}
                icon={Receipt}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                onClick={() => navigate("/admin/expenses")}
              />

              {/* Fuel - /api/fuel/daily-summary/ */}
              <StatCard
                label="Fuel Today"
                value={`${(stats?.total_fuel_purchased ?? 0).toFixed(2)} L`}
                subtext={`Issued: ${(stats?.total_fuel_issued ?? 0).toFixed(2)} L`}
                icon={Fuel}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
                onClick={() => navigate("/admin/fuel")}
              />


              {/* Fuel Remaining */}
              <StatCard
                label="Fuel Remaining"
                value={`${(stats?.fuel_remaining ?? 0).toFixed(2)} L`}
                subtext="Available in stock"
                icon={Fuel}
                iconBg="bg-cyan-50"
                iconColor="text-cyan-600"
                onClick={() => navigate("/admin/fuel")}
              />
            </div>
          </section>

          {/* Profile */}
          <section className="mt-10 pb-8">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Account</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Admin Profile</h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ShieldCheck size={23} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{fullName}</h3>
                    <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Admin Account
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                <p className="text-xs leading-relaxed text-slate-500">
                  Your account provides access to the operational modules assigned to the admin role.
                  Use the sidebar to navigate between modules.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// ==================================================
// STAT CARD
// ==================================================

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg,
  iconColor,
  onClick,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={21} className={iconColor} />
        </div>
        <ArrowUpRight size={17} className="text-slate-300 transition group-hover:text-blue-500" />
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {subtext && (
        <p className="mt-1 text-xs text-slate-400">{subtext}</p>
      )}
    </button>
  );
}