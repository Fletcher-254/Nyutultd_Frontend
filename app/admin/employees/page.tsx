"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserPlus,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================================================
// TYPES
// ==================================================

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  national_id: string;
  phone_number: string;
  passport_photo: string | null;
  employment_type: "casual" | "permanent";
  job_role: string;
  date_employed: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  sha_number: string;
  nssf_number: string;
  monthly_salary: string | number | null;
  daily_wage: string | number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface EmployeeForm {
  employee_id: string;
  full_name: string;
  national_id: string;
  phone_number: string;
  passport_photo: File | null;
  employment_type: "casual" | "permanent";
  job_role: string;
  date_employed: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  sha_number: string;
  nssf_number: string;
  monthly_salary: string;
  daily_wage: string;
  is_active: boolean;
}

// ==================================================
// CONSTANTS
// ==================================================

const emptyForm: EmployeeForm = {
  employee_id: "",
  full_name: "",
  national_id: "",
  phone_number: "",
  passport_photo: null,
  employment_type: "permanent",
  job_role: "",
  date_employed: "",
  next_of_kin_name: "",
  next_of_kin_phone: "",
  sha_number: "",
  nssf_number: "",
  monthly_salary: "",
  daily_wage: "",
  is_active: true,
};

// ==================================================
// PAGE
// ==================================================

export default function EmployeesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      { label: "Vehicles", icon: Truck, path: "/vehicles" },
      { label: "Fuel", icon: Fuel, path: "/fuel" },
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
  // EMPLOYEE DATA
  // ==================================================

  const [user, setUser] = useState<UserProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState<"all" | "casual" | "permanent">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  // ==================================================
  // AUTHENTICATED FETCH
  // ==================================================

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response | null> => {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401) {
          router.replace("/");
          return null;
        }
        return response;
      } catch (err) {
        console.error("Network error:", err);
        throw err;
      }
    },
    [router]
  );

  // ==================================================
  // LOAD DATA
  // ==================================================

  const fetchEmployees = useCallback(async () => {
    const response = await authenticatedFetch(`${API}/employees/list/`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response) return;
    if (!response.ok) throw new Error("Failed to load employees.");
    const data = await response.json();
    setEmployees(Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []);
  }, [authenticatedFetch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const meResponse = await authenticatedFetch(`${API}/me/`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!meResponse) return;
      if (!meResponse.ok) throw new Error("Unable to verify your account.");
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

      await fetchEmployees();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, fetchEmployees]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================================================
  // ACTION=ADD FROM URL
  // ==================================================

  useEffect(() => {
    const action = searchParams?.get("action");
    if (action === "add") {
      resetForm();
      setShowAddModal(true);
    }
  }, [searchParams]);

  // ==================================================
  // FORM HELPERS
  // ==================================================

  function resetForm() {
    setForm(emptyForm);
    setPreviewImage(null);
  }

  function populateForm(employee: Employee) {
    setForm({
      employee_id: employee.employee_id || "",
      full_name: employee.full_name || "",
      national_id: employee.national_id || "",
      phone_number: employee.phone_number || "",
      passport_photo: null,
      employment_type: employee.employment_type || "permanent",
      job_role: employee.job_role || "",
      date_employed: employee.date_employed || "",
      next_of_kin_name: employee.next_of_kin_name || "",
      next_of_kin_phone: employee.next_of_kin_phone || "",
      sha_number: employee.sha_number || "",
      nssf_number: employee.nssf_number || "",
      monthly_salary:
        employee.monthly_salary !== null && employee.monthly_salary !== undefined
          ? String(employee.monthly_salary)
          : "",
      daily_wage:
        employee.daily_wage !== null && employee.daily_wage !== undefined
          ? String(employee.daily_wage)
          : "",
      is_active: employee.is_active,
    });
    setPreviewImage(employee.passport_photo || null);
  }

  function handleInputChange(field: keyof EmployeeForm, value: string | boolean | File | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(file: File | null) {
    setForm((prev) => ({ ...prev, passport_photo: file }));
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);
    }
  }

  // ==================================================
  // CREATE / UPDATE EMPLOYEE
  // ==================================================

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("employee_id", form.employee_id.trim());
      formData.append("full_name", form.full_name.trim());
      formData.append("national_id", form.national_id.trim());
      formData.append("phone_number", form.phone_number.trim());
      formData.append("employment_type", form.employment_type);
      formData.append("job_role", form.job_role.trim());
      formData.append("date_employed", form.date_employed);
      formData.append("next_of_kin_name", form.next_of_kin_name.trim());
      formData.append("next_of_kin_phone", form.next_of_kin_phone.trim());
      formData.append("sha_number", form.sha_number.trim());
      formData.append("nssf_number", form.nssf_number.trim());
      formData.append("is_active", String(form.is_active));
      if (form.monthly_salary.trim()) {
        formData.append("monthly_salary", form.monthly_salary.trim());
      }
      if (form.daily_wage.trim()) {
        formData.append("daily_wage", form.daily_wage.trim());
      }
      if (form.passport_photo) {
        formData.append("passport_photo", form.passport_photo);
      }

      const url = selectedEmployee
        ? `${API}/employees/${selectedEmployee.id}/update/`
        : `${API}/employees/`;
      const method = selectedEmployee ? "PATCH" : "POST";

      const response = await authenticatedFetch(url, { method, body: formData });
      if (!response) return;

      if (!response.ok) {
        let message = "Failed to save employee.";
        try {
          const data = await response.json();
          if (typeof data === "object" && data !== null) {
            message = Object.entries(data)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
              .join(" | ");
          }
        } catch {
          // Keep default message
        }
        throw new Error(message);
      }

      await fetchEmployees();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedEmployee(null);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save employee.");
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // TOGGLE STATUS
  // ==================================================

  async function handleToggleStatus(employee: Employee) {
    try {
      const response = await authenticatedFetch(`${API}/employees/${employee.id}/update/`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !employee.is_active }),
      });
      if (!response) return;
      if (!response.ok) throw new Error("Failed to update employee status.");
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update employee status.");
    }
  }

  // ==================================================
  // DELETE EMPLOYEE
  // ==================================================

  async function handleDelete() {
    if (!selectedEmployee) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await authenticatedFetch(
        `${API}/employees/${selectedEmployee.id}/delete/`,
        { method: "DELETE" }
      );
      if (!response) return;
      if (!response.ok) {
        let message = "Failed to delete employee.";
        try {
          const data = await response.json();
          if (data?.detail) message = data.detail;
          else if (data?.error) message = data.error;
        } catch {
          // Keep default
        }
        throw new Error(message);
      }
      await fetchEmployees();
      setShowDeleteModal(false);
      setSelectedEmployee(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete employee.");
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch(`${API}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      router.replace("/");
    }
  };

  // ==================================================
  // FILTERING
  // ==================================================

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.full_name.toLowerCase().includes(query) ||
        employee.employee_id.toLowerCase().includes(query) ||
        employee.national_id.toLowerCase().includes(query) ||
        employee.phone_number.toLowerCase().includes(query) ||
        employee.job_role.toLowerCase().includes(query);
      const matchesEmployment =
        employmentFilter === "all" || employee.employment_type === employmentFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active);
      return matchesSearch && matchesEmployment && matchesStatus;
    });
  }, [employees, search, employmentFilter, statusFilter]);

  // ==================================================
  // STATISTICS
  // ==================================================

  const activeEmployees = useMemo(() => employees.filter((e) => e.is_active).length, [employees]);
  const permanentEmployees = useMemo(
    () => employees.filter((e) => e.employment_type === "permanent").length,
    [employees]
  );
  const casualEmployees = useMemo(
    () => employees.filter((e) => e.employment_type === "casual").length,
    [employees]
  );

  // ==================================================
  // FORMAT HELPERS
  // ==================================================

  function formatDate(date: string) {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return date;
    }
  }

  function formatCurrency(value: string | number | null) {
    if (value === null || value === undefined || value === "") return "—";
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return String(value);
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(numericValue);
  }

  // ==================================================
  // USER INFO
  // ==================================================

  const firstName = user?.email?.split("@")[0] || "Administrator";
  const fullName = firstName;

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
          <p className="mt-5 text-sm font-medium text-slate-600">Loading employees...</p>
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
                    Employee Management
                  </span>
                </div>

                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                  View, add, edit, and manage all employee records in one place.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <Users size={34} className="text-blue-400" />
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 rounded p-1 hover:bg-red-100"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Total Employees</p>
              <p className="mt-1 text-2xl font-bold">{employees.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-green-50 p-2.5">
                  <UserCheck className="h-5 w-5 text-green-700" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="mt-1 text-2xl font-bold">{activeEmployees}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <UserPlus className="h-5 w-5 text-blue-700" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Permanent</p>
              <p className="mt-1 text-2xl font-bold">{permanentEmployees}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-orange-50 p-2.5">
                  <Users className="h-5 w-5 text-orange-700" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Casual</p>
              <p className="mt-1 text-2xl font-bold">{casualEmployees}</p>
            </div>
          </div>

          {/* Search + Filters + Add Button */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, employee ID, ID number, phone or job role..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={employmentFilter}
                  onChange={(event) =>
                    setEmploymentFilter(event.target.value as "all" | "casual" | "permanent")
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All Employment Types</option>
                  <option value="permanent">Permanent</option>
                  <option value="casual">Casual</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "active" | "inactive")
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Button
                  onClick={() => {
                    resetForm();
                    setSelectedEmployee(null);
                    setShowAddModal(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Employee
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold">Employee Records</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Showing {filteredEmployees.length} of {employees.length} employees
                </p>
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="font-semibold">No employees found</h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  {employees.length === 0
                    ? "You have not added any employees yet."
                    : "Try changing your search or filters."}
                </p>
                {employees.length === 0 && (
                  <Button
                    className="mt-5 gap-2"
                    onClick={() => {
                      resetForm();
                      setSelectedEmployee(null);
                      setShowAddModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">ID Number</th>
                      <th className="px-5 py-4">Phone</th>
                      <th className="px-5 py-4">Employment</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {employee.passport_photo ? (
                              <img
                                src={employee.passport_photo}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                                {employee.full_name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">{employee.full_name}</p>
                              <p className="text-xs text-slate-500">{employee.employee_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm">{employee.national_id || "—"}</td>
                        <td className="px-5 py-4 text-sm">{employee.phone_number || "—"}</td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                              employee.employment_type === "permanent"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-orange-50 text-orange-700"
                            )}
                          >
                            {employee.employment_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm">{employee.job_role || "—"}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(employee)}
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                              employee.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {employee.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowViewModal(true);
                              }}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                populateForm(employee);
                                setShowEditModal(true);
                              }}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowDeleteModal(true);
                              }}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                              title="Delete"
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
          ADD / EDIT MODAL
      ================================================== */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">
                  {showEditModal ? "Edit Employee" : "Add Employee"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {showEditModal
                    ? "Update employee information"
                    : "Create a new employee record"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedEmployee(null);
                  resetForm();
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h3 className="mb-4 font-semibold">Basic Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Employee ID <span className="ml-1 text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.employee_id}
                        required
                        onChange={(e) => handleInputChange("employee_id", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Full Name <span className="ml-1 text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.full_name}
                        required
                        onChange={(e) => handleInputChange("full_name", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        National ID <span className="ml-1 text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.national_id}
                        required
                        onChange={(e) => handleInputChange("national_id", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Phone Number <span className="ml-1 text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.phone_number}
                        required
                        onChange={(e) => handleInputChange("phone_number", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Employment Type <span className="ml-1 text-red-500">*</span>
                      </label>
                      <select
                        value={form.employment_type}
                        onChange={(e) =>
                          handleInputChange(
                            "employment_type",
                            e.target.value as "casual" | "permanent"
                          )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="permanent">Permanent</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Job Role <span className="ml-1 text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.job_role}
                        required
                        onChange={(e) => handleInputChange("job_role", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Date Employed <span className="ml-1 text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={form.date_employed}
                        onChange={(e) => handleInputChange("date_employed", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Passport Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handlePhotoChange(event.target.files?.[0] || null)}
                        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      />
                      {previewImage && (
                        <div className="mt-3">
                          <img
                            src={previewImage}
                            alt=""
                            className="h-20 w-20 rounded-xl object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payroll Information */}
                <div className="md:col-span-2">
                  <h3 className="mb-4 font-semibold">Payroll Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Monthly Salary</label>
                      <input
                        type="number"
                        min="0"
                        value={form.monthly_salary}
                        onChange={(e) => handleInputChange("monthly_salary", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Daily Wage</label>
                      <input
                        type="number"
                        min="0"
                        value={form.daily_wage}
                        onChange={(e) => handleInputChange("daily_wage", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">SHA Number</label>
                      <input
                        type="text"
                        value={form.sha_number}
                        onChange={(e) => handleInputChange("sha_number", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">NSSF Number</label>
                      <input
                        type="text"
                        value={form.nssf_number}
                        onChange={(e) => handleInputChange("nssf_number", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Next of Kin */}
                <div className="md:col-span-2">
                  <h3 className="mb-4 font-semibold">Next of Kin</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Next of Kin Name</label>
                      <input
                        type="text"
                        value={form.next_of_kin_name}
                        onChange={(e) => handleInputChange("next_of_kin_name", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Next of Kin Phone</label>
                      <input
                        type="text"
                        value={form.next_of_kin_phone}
                        onChange={(e) => handleInputChange("next_of_kin_phone", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => handleInputChange("is_active", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-medium">Employee is active</span>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : showEditModal
                    ? "Update Employee"
                    : "Create Employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          VIEW MODAL
      ================================================== */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">Employee Details</h2>
                <p className="mt-1 text-sm text-slate-500">Complete employee record</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedEmployee(null);
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row">
                {selectedEmployee.passport_photo ? (
                  <img
                    src={selectedEmployee.passport_photo}
                    alt=""
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold text-slate-500">
                    {selectedEmployee.full_name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold">{selectedEmployee.full_name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedEmployee.employee_id}</p>
                  <span
                    className={cn(
                      "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium",
                      selectedEmployee.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {selectedEmployee.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    National ID
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.national_id || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Phone Number
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.phone_number || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Employment Type
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800 capitalize">
                    {selectedEmployee.employment_type || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Job Role
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.job_role || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Date Employed
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(selectedEmployee.date_employed)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Monthly Salary
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatCurrency(selectedEmployee.monthly_salary)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Daily Wage
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatCurrency(selectedEmployee.daily_wage)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    SHA Number
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.sha_number || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    NSSF Number
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.nssf_number || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Next of Kin
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.next_of_kin_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Next of Kin Phone
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.next_of_kin_phone || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Created
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(selectedEmployee.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end border-t border-slate-200 pt-5">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedEmployee(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          DELETE MODAL
      ================================================== */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-bold">Delete Employee?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                You are about to delete{" "}
                <span className="font-semibold text-slate-900">
                  {selectedEmployee.full_name}
                </span>
                . This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEmployee(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting ? "Deleting..." : "Delete Employee"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}