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
  ShieldCheck,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  RefreshCw,
  UserRound,
  BriefcaseBusiness,
  FileSearch,
  Briefcase,
  Eye,
  User,
  Clock,
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

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  employment_type: string;
  daily_wage: string | number;
  phone_number?: string | null;
  email?: string | null;
  department?: string | null;
  job_title?: string | null;
  date_hired?: string | null;
  is_active: boolean;
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

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }

  return [];
}

function getEmploymentTypeBadge(type: string) {
  const types: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    permanent: {
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Briefcase className="h-3.5 w-3.5" />,
      label: "Permanent",
    },
    casual: {
      color: "bg-orange-50 text-orange-700 border-orange-200",
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Casual",
    },
    contract: {
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <FileSearch className="h-3.5 w-3.5" />,
      label: "Contract",
    },
  };

  return types[type.toLowerCase()] || types.casual;
}

export default function DirectorEmployeesPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState<
    "all" | "casual" | "permanent" | "contract"
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const authenticatedFetch = useCallback(
    async (endpoint: string) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
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
          // Keep default message.
        }

        throw new Error(message);
      }

      return response.json();
    },
    [router]
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meData, employeesData] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/employees/list/"),
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
      setEmployees(extractArray<Employee>(employeesData));
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load employees.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.full_name.toLowerCase().includes(query) ||
        employee.employee_id.toLowerCase().includes(query) ||
        (employee.email?.toLowerCase().includes(query) ?? false) ||
        (employee.job_title?.toLowerCase().includes(query) ?? false);

      const matchesEmployment =
        employmentFilter === "all" ||
        employee.employment_type.toLowerCase() === employmentFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active);

      return matchesSearch && matchesEmployment && matchesStatus;
    });
  }, [employees, search, employmentFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.is_active).length;
    const inactive = total - active;
    const casual = employees.filter((e) => e.employment_type.toLowerCase() === "casual").length;
    const permanent = employees.filter((e) => e.employment_type.toLowerCase() === "permanent").length;
    const contract = employees.filter((e) => e.employment_type.toLowerCase() === "contract").length;

    return {
      total,
      active,
      inactive,
      casual,
      permanent,
      contract,
    };
  }, [employees]);

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
        headers: {
          Accept: "application/json",
        },
      });
    } catch {
      // Leave the page regardless of logout request failure.
    } finally {
      router.replace("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-4 text-sm font-medium text-white">Loading employees...</p>
          <p className="mt-1 text-xs text-slate-400">Retrieving employee records</p>
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
          <h1 className="mt-5 text-lg font-semibold text-slate-900">
            Unable to load employees
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button
            onClick={loadEmployees}
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
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
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
              <p className="text-sm font-medium text-slate-900">Employees</p>
              <p className="text-xs text-slate-500">Employee directory</p>
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
                  Employee Directory
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  View all employee records across the organization.
                </p>
              </div>
              <button
                onClick={loadEmployees}
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
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Employees</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-400">{stats.active} active · {stats.inactive} inactive</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Permanent</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.permanent}</p>
                  <p className="text-xs text-slate-400">Monthly payroll</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-50 p-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Casual</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.casual}</p>
                  <p className="text-xs text-slate-400">Daily wages</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2">
                  <FileSearch className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Contract</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.contract}</p>
                  <p className="text-xs text-slate-400">Fixed term</p>
                </div>
              </div>
            </div>
          </section>

          {/* Search / Filter */}
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, ID, email or job title..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={employmentFilter}
                  onChange={(event) =>
                    setEmploymentFilter(
                      event.target.value as "all" | "casual" | "permanent" | "contract"
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All Types</option>
                  <option value="permanent">Permanent</option>
                  <option value="casual">Casual</option>
                  <option value="contract">Contract</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "all" | "active" | "inactive"
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-slate-500">
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
            </div>
          </section>

          {/* Employee Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {filteredEmployees.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Users className="h-5 w-5 text-slate-500" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    No employees found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or filters.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Employee ID</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Job Title</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((employee) => {
                      const typeBadge = getEmploymentTypeBadge(employee.employment_type);
                      return (
                        <tr key={employee.id} className="transition hover:bg-slate-50/50">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                {employee.full_name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) => part.charAt(0))
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {employee.full_name}
                                </p>
                                {employee.email && (
                                  <p className="text-xs text-slate-400">{employee.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                            {employee.employee_id}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {employee.job_title || "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${typeBadge.color}`}>
                              {typeBadge.icon}
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                              employee.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                employee.is_active ? "bg-green-600" : "bg-red-600"
                              }`} />
                              {employee.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedEmployee(employee);
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
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Employee Detail Modal */}
          {showDetailModal && selectedEmployee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
              <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-700">
                      {selectedEmployee.full_name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part.charAt(0))
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedEmployee.full_name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedEmployee.employee_id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedEmployee(null);
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
                      <span>Job Title</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {selectedEmployee.job_title || "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Briefcase className="h-4 w-4" />
                      <span>Employment Type</span>
                    </div>
                    <div className="mt-2">
                      {(() => {
                        const badge = getEmploymentTypeBadge(selectedEmployee.employment_type);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {selectedEmployee.department && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <User className="h-4 w-4" />
                        <span>Department</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedEmployee.department}
                      </p>
                    </div>
                  )}

                  {selectedEmployee.phone_number && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <User className="h-4 w-4" />
                        <span>Phone Number</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedEmployee.phone_number}
                      </p>
                    </div>
                  )}

                  {selectedEmployee.email && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <User className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {selectedEmployee.email}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      <span>Status</span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        selectedEmployee.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          selectedEmployee.is_active ? "bg-green-600" : "bg-red-600"
                        }`} />
                        {selectedEmployee.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {selectedEmployee.daily_wage !== undefined && selectedEmployee.daily_wage !== null && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CircleDollarSign className="h-4 w-4" />
                        <span>Daily Wage</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {formatCurrency(selectedEmployee.daily_wage)}
                      </p>
                    </div>
                  )}

                  {selectedEmployee.date_hired && (
                    <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span>Date Hired</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {formatDate(selectedEmployee.date_hired)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

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