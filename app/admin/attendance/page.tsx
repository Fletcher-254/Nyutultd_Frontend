
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
  CheckCircle2,
  XCircle,
  Clock3,
  Search,
  RefreshCw,
  Lock,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ==================================================
// TYPES
// ==================================================

type Employee = {
  id: number;
  employee_id: string;
  name?: string;
  full_name?: string;
  employment_type: string;
  is_active: boolean;
};

type AttendanceRecord = {
  id: number;
  employee: number;
  employee_name: string;
  employee_id_display: string;
  date: string;
  time: string | null;
  is_present: boolean;
};

type UserProfile = {
  id: number;
  email: string;
  role: "director" | "admin" | "manager";
};

type ErrorResponse = {
  error?: unknown;
  detail?: unknown;
  message?: unknown;
};

// ==================================================
// HELPERS
// ==================================================

function getEmployeeDisplayName(employee: Employee): string {
  return employee.full_name || employee.name || "Unknown employee";
}

function getSafeErrorMessage(
  data: ErrorResponse | null,
  fallback: string
): string {
  if (!data) return fallback;

  const possibleValues = [
    data.error,
    data.detail,
    data.message,
  ];

  for (const value of possibleValues) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (value !== null && typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return fallback;
      }
    }
  }

  return fallback;
}

function formatAttendanceTime(value: string | null): string {
  if (!value) return "—";

  const parts = value.split(":");

  if (parts.length < 2) {
    return value;
  }

  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

// ==================================================
// PAGE
// ==================================================

export default function AttendancePage() {
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
  // MENU
  // ==================================================

  const menu = useMemo(
    () => [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
      },
      {
        label: "Employees",
        icon: Users,
        path: "/admin/employees",
      },
      {
        label: "Attendance",
        icon: CalendarCheck,
        path: "/admin/attendance",
      },
      {
        label: "Vehicles",
        icon: Truck,
        path: "/admin/vehicles",
      },
      {
        label: "Fuel",
        icon: Fuel,
        path: "/admin/fuel",
      },
    ],
    []
  );

  const isActive = (path: string) => {
    if (path === "/admin/dashboard") {
      return (
        pathname === "/admin/dashboard" ||
        pathname === "/dashboard"
      );
    }

    return (
      pathname === path ||
      pathname.startsWith(`${path}/`)
    );
  };

  const navigate = (path: string) => {
    setSidebarOpen(false);
    router.push(path);
  };

  // ==================================================
  // DATA STATE
  // ==================================================

  const [user, setUser] = useState<UserProfile | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayRecords, setTodayRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [yesterdayRecords, setYesterdayRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [view, setView] = useState<
    "today" | "yesterday"
  >("today");

  const [submitting, setSubmitting] = useState<
    number | "all" | null
  >(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==================================================
  // CUT-OFF
  // ==================================================

  const isLocked = useMemo(() => {
    const now = new Date();
    return now.getHours() >= 10;
  }, []);

  // ==================================================
  // AUTHENTICATED FETCH
  // ==================================================

  const authenticatedFetch = useCallback(
    async (
      url: string,
      options: RequestInit = {}
    ): Promise<Response | null> => {
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
        console.error(
          "Authenticated request failed:",
          err
        );
        throw err;
      }
    },
    [router]
  );

  // ==================================================
  // LOAD DATA
  // ==================================================

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setInitialLoading(true);
        }

        setError("");

        // ------------------------------------------------
        // USER
        // ------------------------------------------------

        const userResponse = await authenticatedFetch(
          `${API}/me/`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!userResponse) return;

        if (!userResponse.ok) {
          throw new Error(
            "Failed to load user profile."
          );
        }

        const userData =
          (await userResponse.json()) as UserProfile;

        setUser(userData);

        // ------------------------------------------------
        // DATE / GREETING
        // ------------------------------------------------

        const now = new Date();
        const hour = now.getHours();

        if (hour < 12) {
          setGreeting("Good Morning");
        } else if (hour < 17) {
          setGreeting("Good Afternoon");
        } else {
          setGreeting("Good Evening");
        }

        setToday(
          now.toLocaleDateString("en-KE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        );

        // ------------------------------------------------
        // LOAD EMPLOYEES + TODAY + YESTERDAY
        // ------------------------------------------------

        const [
          employeeResponse,
          todayResponse,
          yesterdayResponse,
        ] = await Promise.all([
          authenticatedFetch(
            `${API}/employees/list/`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            }
          ),

          authenticatedFetch(
            `${API}/attendance/today/`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            }
          ),

          authenticatedFetch(
            `${API}/attendance/yesterday/`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            }
          ),
        ]);

        if (
          !employeeResponse ||
          !todayResponse ||
          !yesterdayResponse
        ) {
          return;
        }

        // ------------------------------------------------
        // EMPLOYEES
        // ------------------------------------------------

        if (!employeeResponse.ok) {
          throw new Error(
            "Failed to load employees."
          );
        }

        const employeeData =
          (await employeeResponse.json()) as
            | Employee[]
            | { results?: Employee[] };

        const employeesArray = Array.isArray(
          employeeData
        )
          ? employeeData
          : Array.isArray(employeeData.results)
          ? employeeData.results
          : [];

        // The backend already returns active employees.
        setEmployees(employeesArray);

        // ------------------------------------------------
        // TODAY
        // ------------------------------------------------

        if (!todayResponse.ok) {
          throw new Error(
            "Failed to load today's attendance."
          );
        }

        const todayData =
          (await todayResponse.json()) as AttendanceRecord[];

        setTodayRecords(
          Array.isArray(todayData)
            ? todayData
            : []
        );

        // ------------------------------------------------
        // YESTERDAY
        // ------------------------------------------------

        if (!yesterdayResponse.ok) {
          throw new Error(
            "Failed to load yesterday's attendance."
          );
        }

        const yesterdayData =
          (await yesterdayResponse.json()) as AttendanceRecord[];

        setYesterdayRecords(
          Array.isArray(yesterdayData)
            ? yesterdayData
            : []
        );
      } catch (err: unknown) {
        console.error(
          "Attendance load error:",
          err
        );

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Something went wrong while loading attendance."
          );
        }
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [authenticatedFetch]
  );

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // ==================================================
  // REFRESH
  // ==================================================

  const refresh = async () => {
    if (refreshing) return;

    await loadData(true);
  };

  // ==================================================
  // GET ATTENDANCE RECORD
  // ==================================================

  const getAttendance = useCallback(
    (employeeId: number) => {
      return todayRecords.find(
        (record) => record.employee === employeeId
      );
    },
    [todayRecords]
  );

  // ==================================================
  // MARK INDIVIDUAL ATTENDANCE
  // ==================================================

  const markAttendance = async (
    employeeId: number,
    isPresent: boolean
  ) => {
    if (user?.role !== "admin") {
      setError(
        "Only an admin can mark attendance."
      );

      window.setTimeout(
        () => setError(""),
        3000
      );

      return;
    }

    if (isLocked) {
      setError(
        "Attendance is locked after 10:00 AM."
      );

      window.setTimeout(
        () => setError(""),
        3000
      );

      return;
    }

    const employee = employees.find(
      (item) => item.id === employeeId
    );

    if (!employee) {
      setError(
        "Employee could not be found."
      );

      return;
    }

    const existing = todayRecords.find(
      (record) =>
        record.employee === employeeId
    );

    if (existing) {
      setError(
        `Attendance has already been recorded for today as ${
          existing.is_present
            ? "Present"
            : "Absent"
        }.`
      );

      window.setTimeout(
        () => setError(""),
        4000
      );

      return;
    }

    setSubmitting(employeeId);
    setError("");
    setSuccess("");

    try {
      const response =
        await authenticatedFetch(
          `${API}/attendance/mark/`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              employee: employeeId,
              is_present: isPresent,
            }),
          }
        );

      if (!response) return;

      const responseText =
        await response.text();

      let data:
        | AttendanceRecord
        | ErrorResponse
        | null = null;

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const backendError =
          getSafeErrorMessage(
            data &&
              typeof data === "object" &&
              !Array.isArray(data)
              ? (data as ErrorResponse)
              : null,
            responseText ||
              `Failed to mark attendance (${response.status}).`
          );

        setError(backendError);

        window.setTimeout(
          () => setError(""),
          5000
        );

        return;
      }

      if (
        !data ||
        typeof data !== "object" ||
        !("id" in data)
      ) {
        throw new Error(
          "Unexpected server response."
        );
      }

      const createdRecord =
        data as AttendanceRecord;

      setTodayRecords((prev) => [
        ...prev,
        createdRecord,
      ]);

      setSuccess(
        `${getEmployeeDisplayName(
          employee
        )} marked as ${
          isPresent ? "Present" : "Absent"
        }.`
      );

      window.setTimeout(
        () => setSuccess(""),
        3000
      );
    } catch (err: unknown) {
      console.error(
        "Attendance submission error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Network error. Please check your connection and try again."
        );
      }

      window.setTimeout(
        () => setError(""),
        4000
      );
    } finally {
      setSubmitting(null);
    }
  };

  // ==================================================
  // MARK ALL PRESENT
  // ==================================================

  const markAllPresent = async () => {
    if (user?.role !== "admin") {
      setError(
        "Only an admin can mark attendance."
      );

      window.setTimeout(
        () => setError(""),
        3000
      );

      return;
    }

    if (isLocked) {
      setError(
        "Attendance is locked after 10:00 AM."
      );

      window.setTimeout(
        () => setError(""),
        3000
      );

      return;
    }

    if (unmarkedCount === 0) {
      setSuccess(
        "All employees already have attendance recorded for today."
      );

      window.setTimeout(
        () => setSuccess(""),
        3000
      );

      return;
    }

    setSubmitting("all");
    setError("");
    setSuccess("");

    try {
      const response =
        await authenticatedFetch(
          `${API}/attendance/mark-all-present/`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
          }
        );

      if (!response) return;

      const responseText =
        await response.text();

      let data:
        | {
            message?: string;
            total_employees?: number;
            marked_today?: number;
            present_today?: number;
            absent_today?: number;
            new_records_created?: number;
          }
        | ErrorResponse
        | null = null;

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const backendError =
          getSafeErrorMessage(
            data &&
              typeof data === "object" &&
              !Array.isArray(data)
              ? (data as ErrorResponse)
              : null,
            responseText ||
              `Failed to mark all employees present (${response.status}).`
          );

        setError(backendError);

        window.setTimeout(
          () => setError(""),
          5000
        );

        return;
      }

      const createdCount =
        data &&
        typeof data === "object" &&
        "new_records_created" in data &&
        typeof data.new_records_created ===
          "number"
          ? data.new_records_created
          : unmarkedCount;

      setSuccess(
        createdCount > 0
          ? `${createdCount} employee${
              createdCount === 1 ? "" : "s"
            } marked Present.`
          : "All employees are already marked."
      );

      // Reload from backend so the table
      // reflects the authoritative server state.
      await loadData(true);
    } catch (err: unknown) {
      console.error(
        "Mark all present error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Network error. Please check your connection and try again."
        );
      }

      window.setTimeout(
        () => setError(""),
        5000
      );
    } finally {
      setSubmitting(null);
    }
  };

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
        headers: {
          Accept: "application/json",
        },
      });
    } catch (err) {
      console.error(
        "Logout request failed:",
        err
      );
    } finally {
      router.replace("/");
    }
  };

  // ==================================================
  // COMPUTED DATA
  // ==================================================

  const employeeIds = useMemo(
    () =>
      new Set(
        employees.map(
          (employee) => employee.id
        )
      ),
    [employees]
  );

  const displayedTodayRecords = useMemo(
    () =>
      todayRecords.filter((record) =>
        employeeIds.has(record.employee)
      ),
    [todayRecords, employeeIds]
  );

  const markedCount =
    displayedTodayRecords.length;

  const totalEmployees =
    employees.length;

  const presentCount =
    displayedTodayRecords.filter(
      (record) => record.is_present
    ).length;

  const absentCount =
    displayedTodayRecords.filter(
      (record) => !record.is_present
    ).length;

  const unmarkedCount = Math.max(
    totalEmployees - markedCount,
    0
  );

  const percentage =
    totalEmployees > 0
      ? Math.round(
          (markedCount / totalEmployees) * 100
        )
      : 0;

  // ==================================================
  // SEARCH
  // ==================================================

  const filteredEmployees = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter(
      (employee) => {
        const name =
          getEmployeeDisplayName(
            employee
          ).toLowerCase();

        const employeeId =
          employee.employee_id.toLowerCase();

        const employmentType =
          employee.employment_type.toLowerCase();

        return (
          name.includes(query) ||
          employeeId.includes(query) ||
          employmentType.includes(query)
        );
      }
    );
  }, [employees, search]);

  // ==================================================
  // USER INFO
  // ==================================================

  const firstName =
    user?.email?.split("@")[0] ||
    "Administrator";

  const fullName = firstName;

  // ==================================================
  // INITIAL LOADING
  // ==================================================

  if (initialLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
          </div>

          <p className="mt-5 text-sm font-medium text-slate-600">
            Loading attendance...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Verifying secure access
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ==================================================
          MOBILE OVERLAY
      ================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-lg font-black text-white shadow-lg shadow-blue-600/20">
              N
            </div>

            <div className="text-left">
              <p className="text-sm font-bold tracking-wide text-white">
                NYUTU LIMITED
              </p>

              <p className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-slate-500">
                ERP MANAGEMENT
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
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
              const active = isActive(
                item.path
              );

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    navigate(item.path)
                  }
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={
                      active ? 2.4 : 2
                    }
                  />

                  <span className="flex-1 text-left">
                    {item.label}
                  </span>

                  {active && (
                    <ChevronRight
                      size={15}
                      className="opacity-70"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-400">
              {firstName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {fullName}
              </p>

              <p className="truncate text-[10px] text-slate-500">
                {user.role ||
                  "Administrator"}
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

            <span>
              {loggingOut
                ? "Signing out..."
                : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* ==================================================
          MAIN CONTENT
      ================================================== */}

      <div className="min-h-screen lg:pl-72">
        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="hidden text-xs font-medium text-slate-400 sm:block">
                  {today}
                </p>

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
                {firstName
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* ==================================================
              WELCOME
          ================================================== */}

          <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 shadow-xl sm:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5">
                  <ShieldCheck
                    size={13}
                    className="text-blue-400"
                  />

                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                    Attendance Management
                  </span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Today&apos;s Attendance
                </h2>

                <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
                  Record attendance for all active
                  employees. Attendance can be
                  marked individually or all
                  unmarked employees can be
                  marked present at once.
                </p>
              </div>

              <div className="hidden md:block">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                  <CalendarCheck
                    size={34}
                    className="text-blue-400"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              ERROR / SUCCESS
          ================================================== */}

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <div>
                <strong>Error:</strong>{" "}
                {error}
              </div>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{success}</span>
            </div>
          )}

          {/* ==================================================
              LOCKED
          ================================================== */}

          {isLocked && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              <Lock className="h-4 w-4 shrink-0" />

              <span>
                Attendance is locked after
                10:00 AM.
              </span>
            </div>
          )}

          {/* ==================================================
              STATS
          ================================================== */}

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Total Employees
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {totalEmployees}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Active employees
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                Marked
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {markedCount}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Recorded today
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
              <p className="text-xs font-medium text-emerald-700">
                Present
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {presentCount}
              </p>

              <p className="mt-1 text-xs text-emerald-600/70">
                Employees present
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm">
              <p className="text-xs font-medium text-red-700">
                Absent
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                {absentCount}
              </p>

              <p className="mt-1 text-xs text-red-600/70">
                Employees absent
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm">
              <p className="text-xs font-medium text-orange-700">
                Not Marked
              </p>

              <p className="mt-1 text-2xl font-bold text-orange-600">
                {unmarkedCount}
              </p>

              <p className="mt-1 text-xs text-orange-600/70">
                Still awaiting attendance
              </p>
            </div>
          </div>

          {/* ==================================================
              PROGRESS + ACTION
          ================================================== */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    Attendance progress
                  </span>

                  <span className="text-sm font-bold text-blue-600">
                    {percentage}%
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {markedCount} of{" "}
                  {totalEmployees} employees
                  have been marked
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void markAllPresent()
                }
                disabled={
                  user.role !== "admin" ||
                  isLocked ||
                  submitting !== null ||
                  unmarkedCount === 0
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting === "all" ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Mark All Present
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ==================================================
              TABLE
          ================================================== */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* TABLE HEADER */}

            <div className="border-b border-slate-200 px-4 pt-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-5">
                  <button
                    type="button"
                    onClick={() =>
                      setView("today")
                    }
                    className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                      view === "today"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Today ({markedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setView("yesterday")
                    }
                    className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                      view === "yesterday"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Yesterday (
                    {yesterdayRecords.length}
                    )
                  </button>
                </div>

                <div className="flex items-center gap-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 sm:w-64"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void refresh()
                    }
                    disabled={refreshing}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                    title="Refresh"
                    aria-label="Refresh attendance"
                  >
                    <RefreshCw
                      size={16}
                      className={
                        refreshing
                          ? "animate-spin"
                          : ""
                      }
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ==================================================
                TODAY
            ================================================== */}

            {view === "today" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Employee
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        ID
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Type
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center"
                        >
                          <Users className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-medium text-slate-600">
                            {search
                              ? "No employees match your search."
                              : "No active employees found."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map(
                        (employee) => {
                          const attendance =
                            getAttendance(
                              employee.id
                            );

                          const isSubmitting =
                            submitting ===
                            employee.id;

                          const displayName =
                            getEmployeeDisplayName(
                              employee
                            );

                          return (
                            <tr
                              key={employee.id}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <span className="font-semibold text-slate-900">
                                  {displayName}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-sm text-slate-500">
                                  {
                                    employee.employee_id
                                  }
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                                  {
                                    employee.employment_type
                                  }
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                {attendance ? (
                                  attendance.is_present ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                      <CheckCircle2
                                        size={13}
                                      />
                                      Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                      <XCircle
                                        size={13}
                                      />
                                      Absent
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                                    <Clock3
                                      size={13}
                                    />
                                    Not Marked
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4 text-right">
                                {attendance ? (
                                  <div className="text-right">
                                    <span className="text-xs font-medium text-slate-400">
                                      Recorded
                                    </span>

                                    {attendance.time && (
                                      <p className="mt-0.5 text-[11px] text-slate-400">
                                        {formatAttendanceTime(
                                          attendance.time
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ) : user.role !==
                                  "admin" ? (
                                  <span className="text-xs text-slate-400">
                                    Admin only
                                  </span>
                                ) : isLocked ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                    <Lock
                                      size={13}
                                    />
                                    Locked
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void markAttendance(
                                          employee.id,
                                          true
                                        )
                                      }
                                      disabled={
                                        submitting !==
                                        null
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {isSubmitting ? (
                                        <Loader2
                                          size={13}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <CheckCircle2
                                          size={13}
                                        />
                                      )}
                                      Present
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void markAttendance(
                                          employee.id,
                                          false
                                        )
                                      }
                                      disabled={
                                        submitting !==
                                        null
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <XCircle
                                        size={13}
                                      />
                                      Absent
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================================================
                YESTERDAY
            ================================================== */}

            {view === "yesterday" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Employee
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        ID
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Time
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {yesterdayRecords.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-12 text-center"
                        >
                          <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-medium text-slate-600">
                            No records from
                            yesterday.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      yesterdayRecords.map(
                        (record) => (
                          <tr
                            key={record.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <span className="font-semibold text-slate-900">
                                {
                                  record.employee_name
                                }
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <span className="text-sm text-slate-500">
                                {
                                  record.employee_id_display
                                }
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              {record.is_present ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2
                                    size={13}
                                  />
                                  Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  <XCircle
                                    size={13}
                                  />
                                  Absent
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-500">
                              {formatAttendanceTime(
                                record.time
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

