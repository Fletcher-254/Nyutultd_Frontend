"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Truck,
  Fuel,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Lock,
  CircleDollarSign,
  Store,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured.");
}

type Employee = {
  id: number;
  employee_id?: string;
  full_name?: string;
  name?: string;
  employment_type?: string;
  is_active?: boolean;
};

type AttendanceRecord = {
  id: number;
  employee: number;
  employee_id?: string;
  employee_name?: string;
  is_present: boolean;
  marked_at?: string;
  created_at?: string;
  time?: string;
};

type UserProfile = {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  role?: string;
};

type ErrorResponse = {
  detail?: string;
  message?: string;
  error?: string;
};

const menuItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Employees",
    href: "/admin/employees",
    icon: Users,
  },
  {
    label: "Attendance",
    href: "/admin/attendance",
    icon: CalendarCheck,
  },
  {
    label: "Vehicles",
    href: "/admin/vehicles",
    icon: Truck,
  },
  {
    label: "Fuel",
    href: "/admin/fuel",
    icon: Fuel,
  },
  {
    label: "Expenses",
    href: "/admin/expenses",
    icon: CircleDollarSign,
  },
  {
    label: "Vendors",
    href: "/admin/vendors",
    icon: Store,
  },
];

function getEmployeeDisplayName(employee: Employee) {
  return (
    employee.full_name ||
    employee.name ||
    employee.employee_id ||
    `Employee #${employee.id}`
  );
}

function getSafeErrorMessage(
  response: Response,
  data: ErrorResponse | null
) {
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (data?.error) return data.error;

  return `Request failed with status ${response.status}.`;
}

function formatAttendanceTime(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [yesterdayRecords, setYesterdayRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "yesterday">("today");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const isLocked = currentTime.getHours() >= 10;

  const fetchWithAuth = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/");
        throw new Error("Your session has expired.");
      }

      return response;
    },
    [router]
  );

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const meResponse = await fetchWithAuth("/me/");

        if (!meResponse.ok) {
          let data: ErrorResponse | null = null;

          try {
            data = await meResponse.json();
          } catch {
            data = null;
          }

          throw new Error(getSafeErrorMessage(meResponse, data));
        }

        const meData: UserProfile = await meResponse.json();

        setUser(meData);

        if (meData.role && meData.role.toLowerCase() !== "admin") {
          const role = meData.role.toLowerCase();

          if (role === "manager") {
            router.replace("/manager/dashboard");
            return;
          }

          if (role === "director") {
            router.replace("/director/dashboard");
            return;
          }
        }

        const [employeesResponse, todayResponse, yesterdayResponse] =
          await Promise.all([
            fetchWithAuth("/employees/list/"),
            fetchWithAuth("/attendance/today/"),
            fetchWithAuth("/attendance/yesterday/"),
          ]);

        if (!employeesResponse.ok) {
          let data: ErrorResponse | null = null;

          try {
            data = await employeesResponse.json();
          } catch {
            data = null;
          }

          throw new Error(getSafeErrorMessage(employeesResponse, data));
        }

        if (!todayResponse.ok) {
          let data: ErrorResponse | null = null;

          try {
            data = await todayResponse.json();
          } catch {
            data = null;
          }

          throw new Error(getSafeErrorMessage(todayResponse, data));
        }

        if (!yesterdayResponse.ok) {
          let data: ErrorResponse | null = null;

          try {
            data = await yesterdayResponse.json();
          } catch {
            data = null;
          }

          throw new Error(getSafeErrorMessage(yesterdayResponse, data));
        }

        const employeesData = await employeesResponse.json();
        const todayData = await todayResponse.json();
        const yesterdayData = await yesterdayResponse.json();

        setEmployees(
          Array.isArray(employeesData)
            ? employeesData
            : employeesData.results || employeesData.employees || []
        );

        setTodayRecords(
          Array.isArray(todayData)
            ? todayData
            : todayData.results || todayData.attendance || []
        );

        setYesterdayRecords(
          Array.isArray(yesterdayData)
            ? yesterdayData
            : yesterdayData.results || yesterdayData.attendance || []
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load attendance data.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth, router]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = useMemo(() => {
    if (user?.first_name) {
      return user.first_name;
    }

    if (user?.full_name) {
      return user.full_name.split(" ")[0];
    }

    if (user?.name) {
      return user.name.split(" ")[0];
    }

    if (user?.email) {
      return user.email.split("@")[0];
    }

    return "Administrator";
  }, [user]);

  const fullName = useMemo(() => {
    if (user?.full_name) {
      return user.full_name;
    }

    if (user?.name) {
      return user.name;
    }

    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }

    return user?.email || "Administrator";
  }, [user]);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  }, [currentTime]);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [currentTime]);

  const employeeRecordMap = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();

    todayRecords.forEach((record) => {
      map.set(record.employee, record);
    });

    return map;
  }, [todayRecords]);

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter((employee) => {
      const name = getEmployeeDisplayName(employee).toLowerCase();
      const employeeId = employee.employee_id?.toLowerCase() || "";
      const employmentType =
        employee.employment_type?.toLowerCase() || "";

      return (
        name.includes(query) ||
        employeeId.includes(query) ||
        employmentType.includes(query)
      );
    });
  }, [employees, searchTerm]);

  const markedCount = useMemo(() => {
    return employees.filter((employee) =>
      employeeRecordMap.has(employee.id)
    ).length;
  }, [employees, employeeRecordMap]);

  const presentCount = useMemo(() => {
    return employees.filter((employee) => {
      const record = employeeRecordMap.get(employee.id);
      return record?.is_present === true;
    }).length;
  }, [employees, employeeRecordMap]);

  const absentCount = useMemo(() => {
    return employees.filter((employee) => {
      const record = employeeRecordMap.get(employee.id);
      return record?.is_present === false;
    }).length;
  }, [employees, employeeRecordMap]);

  const unmarkedCount = Math.max(employees.length - markedCount, 0);

  const attendancePercentage = useMemo(() => {
    if (employees.length === 0) {
      return 0;
    }

    return Math.round((markedCount / employees.length) * 100);
  }, [employees.length, markedCount]);

  const markAttendance = async (
    employeeId: number,
    isPresent: boolean
  ) => {
    if (isLocked) {
      setError("Attendance marking is locked after 10:00 AM.");
      return;
    }

    if (submitting) {
      return;
    }

    if (employeeRecordMap.has(employeeId)) {
      setError("Attendance has already been marked for this employee.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetchWithAuth("/attendance/mark/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee: employeeId,
          is_present: isPresent,
        }),
      });

      let data: ErrorResponse | null = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(getSafeErrorMessage(response, data));
      }

      setSuccess(
        `Attendance marked as ${isPresent ? "present" : "absent"}.`
      );

      await loadData(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to mark attendance.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const markAllPresent = async () => {
    if (isLocked) {
      setError("Attendance marking is locked after 10:00 AM.");
      return;
    }

    if (submitting) {
      return;
    }

    if (unmarkedCount === 0) {
      setError("All employees already have attendance marked.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetchWithAuth(
        "/attendance/mark-all-present/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      let data: ErrorResponse | null = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(getSafeErrorMessage(response, data));
      }

      setSuccess("All unmarked employees have been marked present.");

      await loadData(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to mark all employees present.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchWithAuth("/logout/", {
        method: "POST",
      });
    } catch {
      // Continue to login even if logout request fails.
    } finally {
      router.push("/");
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>

          <p className="text-sm font-medium text-slate-600">
            Loading attendance...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <ShieldCheck className="h-5 w-5 text-slate-950" />
            </div>

            <div>
              <p className="text-sm font-bold tracking-wide">NYUTU</p>
              <p className="text-xs text-slate-400">Administration</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  router.push(item.href);
                  setMobileMenuOpen(false);
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-white text-slate-950 shadow-lg"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>

                {active && <ChevronRight className="h-4 w-4" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-4 rounded-2xl bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                {firstName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {fullName}
                </p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Attendance
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Daily employee attendance management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">
                System Online
              </span>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-xs font-medium text-slate-500">
                {formattedDate}
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl sm:p-8">
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-300">
                <CalendarCheck className="h-4 w-4" />
                Employee Attendance
              </div>

              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {greeting}, {firstName}.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Record and monitor daily attendance for all active employees
                from one place.
              </p>
            </div>

            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
          </section>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="text-sm font-semibold">Something went wrong</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="text-sm font-semibold">Success</p>
                <p className="mt-1 text-sm">{success}</p>
              </div>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {isLocked && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <Lock className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="text-sm font-semibold">
                  Attendance marking is locked
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Attendance can no longer be marked after 10:00 AM.
                </p>
              </div>
            </div>
          )}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Total Employees
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {employees.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <CalendarCheck className="h-5 w-5 text-blue-600" />
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Marked
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {markedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-emerald-50 p-2.5">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Present
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {presentCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-red-50 p-2.5">
                  <UserX className="h-5 w-5 text-red-600" />
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Absent
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {absentCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-amber-50 p-2.5">
                  <Clock3 className="h-5 w-5 text-amber-600" />
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-slate-500">
                Unmarked
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {unmarkedCount}
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Attendance Progress
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {markedCount} of {employees.length} employees marked
                </p>
              </div>

              <button
                type="button"
                onClick={markAllPresent}
                disabled={
                  submitting || isLocked || unmarkedCount === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Mark All Present
              </button>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-950 transition-all duration-500"
                style={{
                  width: `${attendancePercentage}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>0%</span>
              <span className="font-semibold text-slate-700">
                {attendancePercentage}%
              </span>
              <span>100%</span>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Attendance Records
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    View and manage employee attendance.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search employees..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => loadData(true)}
                    disabled={refreshing}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-5 flex gap-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("today")}
                  className={`border-b-2 px-4 pb-3 text-sm font-semibold transition ${
                    activeTab === "today"
                      ? "border-slate-950 text-slate-950"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("yesterday")}
                  className={`border-b-2 px-4 pb-3 text-sm font-semibold transition ${
                    activeTab === "yesterday"
                      ? "border-slate-950 text-slate-950"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>

            {activeTab === "today" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Employee
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        ID
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Type
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center"
                        >
                          <Users className="mx-auto h-10 w-10 text-slate-300" />
                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No employees found
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Try changing your search.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const record = employeeRecordMap.get(
                          employee.id
                        );

                        return (
                          <tr
                            key={employee.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                                  {getEmployeeDisplayName(
                                    employee
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {getEmployeeDisplayName(
                                      employee
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {employee.employee_id || "—"}
                            </td>

                            <td className="px-6 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {employee.employment_type || "—"}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              {record ? (
                                record.is_present ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Present
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                                    <UserX className="h-3.5 w-3.5" />
                                    Absent
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  Unmarked
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">
                              {!record ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      markAttendance(
                                        employee.id,
                                        true
                                      )
                                    }
                                    disabled={
                                      submitting || isLocked
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Present
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      markAttendance(
                                        employee.id,
                                        false
                                      )
                                    }
                                    disabled={
                                      submitting || isLocked
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                    Absent
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-slate-400">
                                  Marked
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Employee
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        ID
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Time
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {yesterdayRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center"
                        >
                          <CalendarCheck className="mx-auto h-10 w-10 text-slate-300" />
                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No attendance records
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            There are no records for yesterday.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      yesterdayRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {record.employee_name ||
                                `Employee #${record.employee}`}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {record.employee_id || "—"}
                          </td>

                          <td className="px-6 py-4">
                            {record.is_present ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                                <UserX className="h-3.5 w-3.5" />
                                Absent
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatAttendanceTime(
                              record.marked_at ||
                                record.created_at ||
                                record.time
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}