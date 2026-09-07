
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ElementType } from "react";
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
  Shield,
  FileSearch,
  Briefcase,
  Receipt,
  Store,
  Search,
  Wallet,
  UserCheck,
  Clock3,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type Role = "admin" | "manager" | "director";

interface Me {
  id: number;
  email: string;
  role: Role;
}

interface SidebarSection {
  title: string;
  items: Module[];
}

interface Module {
  label: string;
  href: string;
  icon: ElementType;
}

interface PermanentPayrollRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_id_display?: string;

  payroll_period?: number | string;

  basic_salary?: number;
  gross_salary?: number;
  total_deductions?: number;
  net_salary?: number;

  amount_due?: number;
  amount_paid?: number;

  payment_status: string;

  created_at?: string;
  updated_at?: string;
}

interface PayrollPeriod {
  id?: number;
  start_date?: string;
  end_date?: string;
}

interface PayrollSummary {
  total_employees: number;
  total_gross_salary?: number;
  total_deductions?: number;
  total_net_salary?: number;
  total_amount_due?: number;
  total_amount_paid?: number;
  total_amount_pending?: number;
  payroll_period?: PayrollPeriod | null;
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

function formatCurrency(value: number | undefined | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "paid") return "Paid";
  if (normalized === "pending") return "Pending";
  if (normalized === "processing") return "Processing";
  if (normalized === "failed") return "Failed";

  return status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Pending";
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "paid") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10";
  }

  if (normalized === "processing") {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/10";
  }

  if (normalized === "failed") {
    return "bg-red-50 text-red-700 ring-1 ring-red-600/10";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/10";
}

export default function DirectorPermanentPayrollPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [me, setMe] = useState<Me | null>(null);
  const [records, setRecords] = useState<PermanentPayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const sidebarSections: SidebarSection[] = [
    {
      title: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/director/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Financials",
      items: [
        {
          label: "Daily Wages",
          href: "/director/daily-wages",
          icon: CircleDollarSign,
        },
        {
          label: "Permanent Payroll",
          href: "/director/permanent-payroll",
          icon: Briefcase,
        },
        {
          label: "Expenses",
          href: "/director/expenses",
          icon: Receipt,
        },
        {
          label: "Vendors",
          href: "/director/vendors",
          icon: Store,
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          label: "Employees",
          href: "/director/employees",
          icon: Users,
        },
        {
          label: "Attendance",
          href: "/director/attendance",
          icon: CalendarCheck,
        },
        {
          label: "Vehicles",
          href: "/director/vehicles",
          icon: Truck,
        },
        {
          label: "Fuel",
          href: "/director/fuel",
          icon: Fuel,
        },
      ],
    },
    {
      title: "Governance",
      items: [
        {
          label: "Users",
          href: "/director/users",
          icon: Shield,
        },
        {
          label: "Audit",
          href: "/director/audit",
          icon: FileSearch,
        },
      ],
    },
  ];

  const fetchJSON = async (endpoint: string) => {
    const response = await fetch(`${API}${endpoint}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      router.replace("/");
      throw new Error("Unauthorized");
    }

    let data: unknown = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data &&
        typeof data === "object" &&
        ("detail" in data || "error" in data)
          ? String(
              (data as { detail?: unknown; error?: unknown }).detail ||
                (data as { detail?: unknown; error?: unknown }).error ||
                "Request failed."
            )
          : "Request failed.";

      throw new Error(message);
    }

    return data;
  };

  const loadPage = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [meData, payrollData, summaryData] = await Promise.all([
        fetchJSON("/me/"),
        fetchJSON("/payroll/permanent/"),
        fetchJSON("/payroll/permanent/monthly-summary/"),
      ]);

      const currentUser = meData as Me;

      if (currentUser.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      if (currentUser.role === "manager") {
        router.replace("/manager/dashboard");
        return;
      }

      if (currentUser.role !== "director") {
        router.replace("/");
        return;
      }

      setMe(currentUser);
      setRecords(
        extractArray<PermanentPayrollRecord>(payrollData)
      );
      setSummary(summaryData as PayrollSummary);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load permanent payroll."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        record.employee_name?.toLowerCase().includes(query) ||
        record.employee_id_display?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        record.payment_status?.toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const payrollPeriodText = useMemo(() => {
    const start = summary?.payroll_period?.start_date;
    const end = summary?.payroll_period?.end_date;

    if (!start && !end) {
      return "Current payroll month";
    }

    if (start && end) {
      return `${formatDate(start)} – ${formatDate(end)}`;
    }

    return start ? formatDate(start) : formatDate(end);
  }, [summary]);

  const totalNetSalary =
    summary?.total_net_salary ??
    summary?.total_amount_due ??
    records.reduce(
      (total, record) =>
        total + Number(record.net_salary ?? record.amount_due ?? 0),
      0
    );

  const totalPending =
    summary?.total_amount_pending ??
    Math.max(
      0,
      totalNetSalary - Number(summary?.total_amount_paid ?? 0)
    );

  const handleLogout = async () => {
    try {
      await fetch(`${API}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } catch {
      // Continue with local navigation.
    } finally {
      router.replace("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-4 text-sm font-medium">
              Loading permanent payroll...
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Verifying secure access
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>

            <h1 className="mt-5 text-lg font-semibold text-slate-900">
              Unable to load permanent payroll
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadPage()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
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
            <p className="text-sm font-semibold tracking-wide">
              NYUTU LIMITED
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Director Portal
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="space-y-7">
            {sidebarSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {section.title}
                </p>

                <div className="space-y-1">
                  {section.items.map((module) => {
                    const Icon = module.icon;

                    const isActive =
                      pathname === module.href;

                    return (
                      <button
                        key={module.href}
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          router.push(module.href);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                          isActive
                            ? "bg-white/10 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span>{module.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
              {me?.email?.charAt(0).toUpperCase() || "D"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {me?.email || "Director"}
              </p>
              <p className="text-xs text-slate-500">
                Director
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
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
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
                  Permanent Payroll
                </h1>

                <p className="text-xs text-slate-500">
                  Monthly salaried employee payroll
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {me?.email}
                </p>
                <p className="text-xs text-slate-500">
                  Director
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {me?.email?.charAt(0).toUpperCase() || "D"}
              </div>
            </div>
          </div>
        </header>

        <main className="px-5 py-7 sm:px-8 lg:py-9">
          {/* Page Banner */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  {getGreeting()}, Director
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Permanent Payroll
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Review the current monthly payroll position for
                  permanent employees, including salaries, deductions,
                  payments, and outstanding amounts.
                </p>

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  <span>{payrollPeriodText}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadPage(true)}
                disabled={refreshing}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
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

          {/* Payroll Overview */}
          <section className="mt-9">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Payroll Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current monthly permanent payroll position.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Users className="h-5 w-5 text-slate-700" />
                  </div>

                  <span className="text-xs font-medium text-slate-400">
                    Workforce
                  </span>
                </div>

                <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                  {summary?.total_employees ?? records.length}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Permanent employees
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Briefcase className="h-5 w-5 text-slate-700" />
                  </div>

                  <span className="text-xs font-medium text-slate-400">
                    Gross
                  </span>
                </div>

                <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatCurrency(summary?.total_gross_salary)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Gross payroll
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <CircleDollarSign className="h-5 w-5 text-slate-700" />
                  </div>

                  <span className="text-xs font-medium text-slate-400">
                    Net
                  </span>
                </div>

                <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatCurrency(totalNetSalary)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Net salaries payable
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Wallet className="h-5 w-5 text-slate-700" />
                  </div>

                  <span className="text-xs font-medium text-slate-400">
                    Outstanding
                  </span>
                </div>

                <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                  {formatCurrency(totalPending)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Pending payment
                </p>
              </div>
            </div>
          </section>

          {/* Payroll Records */}
          <section className="mt-9">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Payroll Records
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Permanent employee salary records for the current
                  payroll period.
                </p>
              </div>

              <p className="text-xs font-medium text-slate-400">
                {filteredRecords.length}{" "}
                {filteredRecords.length === 1
                  ? "record"
                  : "records"}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Filters */}
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search employee..."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="all">
                      All statuses
                    </option>

                    <option value="pending">
                      Pending
                    </option>

                    <option value="paid">
                      Paid
                    </option>

                    <option value="processing">
                      Processing
                    </option>

                    <option value="failed">
                      Failed
                    </option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50/70">
                    <tr>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Basic Salary
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Gross Salary
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Deductions
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Net Salary
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center"
                        >
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                            <Search className="h-5 w-5 text-slate-400" />
                          </div>

                          <p className="mt-4 text-sm font-medium text-slate-700">
                            No payroll records found
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Try changing your search or status
                            filter.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                {record.employee_name
                                  ?.charAt(0)
                                  .toUpperCase() || "E"}
                              </div>

                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {record.employee_name ||
                                    "Unknown employee"}
                                </p>

                                {record.employee_id_display && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {
                                      record.employee_id_display
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.basic_salary
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.gross_salary
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatCurrency(
                              record.total_deductions
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              record.net_salary ??
                                record.amount_due
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                record.payment_status
                              )}`}
                            >
                              {getStatusLabel(
                                record.payment_status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/director/permanent-payroll/${record.id}`
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              View
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-9 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>
                © {new Date().getFullYear()} NYUTU LIMITED
              </p>

              <p>
                Director Portal · Executive Access
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

