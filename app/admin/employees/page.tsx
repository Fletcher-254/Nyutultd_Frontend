
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  Truck,
  Fuel,
  Store,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Briefcase,
  Clock,
  Phone,
  Calendar,
  User,
  FileText,
} from "lucide-react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
  national_id: string;
  phone_number: string;
  passport_photo: string | null;
  employment_type: "casual" | "permanent";
  job_role: string;
  date_employed: string;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  is_active: boolean;
}

interface EmployeeForm {
  full_name: string;
  national_id: string;
  phone_number: string;
  employment_type: "casual" | "permanent";
  job_role: string;
  date_employed: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
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
        description: "System overview",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Employees",
        description: "Manage employee records",
        href: "/admin/employees",
        icon: Users,
      },
      {
        name: "Vehicles",
        description: "Manage company vehicles",
        href: "/admin/vehicles",
        icon: Truck,
      },
      {
        name: "Fuel",
        description: "Monitor fuel usage",
        href: "/admin/fuel",
        icon: Fuel,
      },
      {
        name: "Vendors",
        description: "Manage vendors",
        href: "/admin/vendors",
        icon: Store,
      },
    ],
  },
];

function formatDate(dateString: string) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getEmploymentTypeBadge(type: string) {
  const types: Record<
    string,
    {
      color: string;
      icon: React.ReactNode;
      label: string;
    }
  > = {
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
  };

  return types[type.toLowerCase()] || types.casual;
}

function AdminEmployeesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mobileOpen, setMobileOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState<EmployeeForm>({
    full_name: "",
    national_id: "",
    phone_number: "",
    employment_type: "permanent",
    job_role: "",
    date_employed: new Date().toISOString().split("T")[0],
    next_of_kin_name: "",
    next_of_kin_phone: "",
  });

  const ITEMS_PER_PAGE = 10;

  // -------------------------------------------------
  // AUTHENTICATED API REQUEST
  // -------------------------------------------------

  const authenticatedFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API}${endpoint}`, {
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
          } else if (typeof data === "object" && data !== null) {
            const firstError = Object.values(data)[0];

            if (Array.isArray(firstError)) {
              message = String(firstError[0]);
            } else if (typeof firstError === "string") {
              message = firstError;
            }
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

  // -------------------------------------------------
  // RESET FORM
  // -------------------------------------------------

  const resetForm = useCallback(() => {
    setForm({
      full_name: "",
      national_id: "",
      phone_number: "",
      employment_type: "permanent",
      job_role: "",
      date_employed: new Date().toISOString().split("T")[0],
      next_of_kin_name: "",
      next_of_kin_phone: "",
    });

    setActionError("");
  }, []);

  // -------------------------------------------------
  // LOAD ADMIN + EMPLOYEES
  // -------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meData, employeesData] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/employees/list/"),
      ]);

      if (meData.role !== "admin") {
        if (meData.role === "manager") {
          router.replace("/manager/dashboard");
        } else if (meData.role === "director") {
          router.replace("/director/dashboard");
        } else {
          router.replace("/");
        }

        return;
      }

      setMe(meData);
      setEmployees(
        Array.isArray(employeesData) ? employeesData : []
      );
      setCurrentPage(1);
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
    loadData();
  }, [loadData]);

  // -------------------------------------------------
  // OPEN ADD MODAL FROM ?action=add
  // -------------------------------------------------

  useEffect(() => {
    const action = searchParams?.get("action");

    if (action === "add") {
      resetForm();
      setShowAddModal(true);
    }
  }, [searchParams, resetForm]);

  // -------------------------------------------------
  // FILTER EMPLOYEES
  // -------------------------------------------------

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.full_name.toLowerCase().includes(query) ||
        employee.employee_id.toLowerCase().includes(query) ||
        employee.phone_number?.toLowerCase().includes(query) ||
        employee.job_role?.toLowerCase().includes(query) ||
        employee.national_id?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && employee.is_active) ||
        (statusFilter === "inactive" && !employee.is_active);

      const matchesType =
        typeFilter === "all" ||
        employee.employment_type.toLowerCase() ===
          typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [employees, search, statusFilter, typeFilter]);

  // -------------------------------------------------
  // PAGINATION
  // -------------------------------------------------

  const totalPages = Math.ceil(
    filteredEmployees.length / ITEMS_PER_PAGE
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // -------------------------------------------------
  // STATS
  // -------------------------------------------------

  const stats = useMemo(() => {
    const total = employees.length;

    const active = employees.filter(
      (employee) => employee.is_active
    ).length;

    const inactive = total - active;

    const casual = employees.filter(
      (employee) => employee.employment_type === "casual"
    ).length;

    const permanent = employees.filter(
      (employee) => employee.employment_type === "permanent"
    ).length;

    return {
      total,
      active,
      inactive,
      casual,
      permanent,
    };
  }, [employees]);

  // -------------------------------------------------
  // GREETING
  // -------------------------------------------------

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";

    return "Good evening";
  })();

  // -------------------------------------------------
  // FORM CHANGE
  // -------------------------------------------------

  const handleFormChange = (
    field: keyof EmployeeForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // -------------------------------------------------
  // ADD EMPLOYEE
  // -------------------------------------------------

  const openAddModal = () => {
    resetForm();
    setSelectedEmployee(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();

    if (searchParams?.get("action") === "add") {
      router.replace(pathname);
    }
  };

  const handleAddEmployee = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setActionError("");

      /*
       * IMPORTANT:
       * The Admin only sends NON-FINANCIAL employee details.
       *
       * No:
       * - daily_wage
       * - monthly_salary
       * - sha_number
       * - nssf_number
       */

      const payload = {
        full_name: form.full_name,
        national_id: form.national_id,
        phone_number: form.phone_number,
        employment_type: form.employment_type,
        job_role: form.job_role,
        date_employed: form.date_employed,
        next_of_kin_name: form.next_of_kin_name || null,
        next_of_kin_phone: form.next_of_kin_phone || null,
      };

      await authenticatedFetch("/employees/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMessage("Employee created successfully!");

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);

      closeAddModal();

      await loadData();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to create employee."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------
  // VIEW EMPLOYEE
  // -------------------------------------------------

  const openViewModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  // -------------------------------------------------
  // EDIT EMPLOYEE
  // -------------------------------------------------

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);

    setForm({
      full_name: employee.full_name || "",
      national_id: employee.national_id || "",
      phone_number: employee.phone_number || "",
      employment_type:
        employee.employment_type || "permanent",
      job_role: employee.job_role || "",
      date_employed: employee.date_employed || "",
      next_of_kin_name:
        employee.next_of_kin_name || "",
      next_of_kin_phone:
        employee.next_of_kin_phone || "",
    });

    setActionError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedEmployee(null);
    resetForm();
  };

  const handleEditEmployee = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedEmployee) return;

    try {
      setSubmitting(true);
      setActionError("");

      /*
       * Admin can only update NON-FINANCIAL information.
       */

      const payload = {
        full_name: form.full_name,
        national_id: form.national_id,
        phone_number: form.phone_number,
        employment_type: form.employment_type,
        job_role: form.job_role,
        date_employed: form.date_employed,
        next_of_kin_name: form.next_of_kin_name || null,
        next_of_kin_phone: form.next_of_kin_phone || null,
      };

      await authenticatedFetch(
        `/employees/${selectedEmployee.id}/update/`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      setSuccessMessage("Employee updated successfully!");

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);

      closeEditModal();

      await loadData();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to update employee."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------
  // LOGOUT
  // -------------------------------------------------

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
      // Even if logout fails, leave the dashboard.
    } finally {
      router.replace("/");
    }
  };

  // -------------------------------------------------
  // LOADING
  // -------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />

          <p className="mt-4 text-sm font-medium text-white">
            Loading employees...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Fetching employee records
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------
  // ERROR
  // -------------------------------------------------

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

      {/* =================================================
          SUCCESS TOAST
      ================================================= */}

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg border border-green-200 bg-green-50 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />

            <div>
              <p className="text-sm font-medium text-green-800">
                Success
              </p>

              <p className="text-sm text-green-600">
                {successMessage}
              </p>
            </div>

            <button
              onClick={() => setSuccessMessage("")}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* =================================================
          ADD EMPLOYEE MODAL
      ================================================= */}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Add Employee
                </h3>

                <p className="text-sm text-slate-500">
                  Create a new employee record
                </p>
              </div>

              <button
                onClick={closeAddModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee}>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">

                {/* Full Name */}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Full Name *
                  </label>

                  <input
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      handleFormChange(
                        "full_name",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter full name"
                  />
                </div>

                {/* National ID */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    National ID *
                  </label>

                  <input
                    required
                    value={form.national_id}
                    onChange={(e) =>
                      handleFormChange(
                        "national_id",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="National ID number"
                  />
                </div>

                {/* Phone */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone Number *
                  </label>

                  <input
                    required
                    value={form.phone_number}
                    onChange={(e) =>
                      handleFormChange(
                        "phone_number",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Phone number"
                  />
                </div>

                {/* Job Role */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Job Role *
                  </label>

                  <input
                    required
                    value={form.job_role}
                    onChange={(e) =>
                      handleFormChange(
                        "job_role",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g. Driver"
                  />
                </div>

                {/* Date Employed */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Date Employed *
                  </label>

                  <input
                    required
                    type="date"
                    value={form.date_employed}
                    onChange={(e) =>
                      handleFormChange(
                        "date_employed",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Employment Type */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Employment Type *
                  </label>

                  <select
                    value={form.employment_type}
                    onChange={(e) =>
                      handleFormChange(
                        "employment_type",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="permanent">
                      Permanent
                    </option>

                    <option value="casual">
                      Casual
                    </option>
                  </select>
                </div>

                {/* Next of Kin Name */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Next of Kin Name
                  </label>

                  <input
                    value={form.next_of_kin_name}
                    onChange={(e) =>
                      handleFormChange(
                        "next_of_kin_name",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Next of kin name"
                  />
                </div>

                {/* Next of Kin Phone */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Next of Kin Phone
                  </label>

                  <input
                    value={form.next_of_kin_phone}
                    onChange={(e) =>
                      handleFormChange(
                        "next_of_kin_phone",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Next of kin phone"
                  />
                </div>

              </div>

              {actionError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {actionError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {submitting
                    ? "Creating..."
                    : "Create Employee"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          EDIT EMPLOYEE MODAL
      ================================================= */}

      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Edit Employee
                </h3>

                <p className="text-sm text-slate-500">
                  {selectedEmployee.employee_id}
                </p>
              </div>

              <button
                onClick={closeEditModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee}>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">

                {/* Full Name */}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Full Name *
                  </label>

                  <input
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      handleFormChange(
                        "full_name",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* National ID */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    National ID *
                  </label>

                  <input
                    required
                    value={form.national_id}
                    onChange={(e) =>
                      handleFormChange(
                        "national_id",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Phone */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone Number *
                  </label>

                  <input
                    required
                    value={form.phone_number}
                    onChange={(e) =>
                      handleFormChange(
                        "phone_number",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Job Role */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Job Role *
                  </label>

                  <input
                    required
                    value={form.job_role}
                    onChange={(e) =>
                      handleFormChange(
                        "job_role",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Date Employed */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Date Employed *
                  </label>

                  <input
                    required
                    type="date"
                    value={form.date_employed}
                    onChange={(e) =>
                      handleFormChange(
                        "date_employed",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Employment Type */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Employment Type *
                  </label>

                  <select
                    value={form.employment_type}
                    onChange={(e) =>
                      handleFormChange(
                        "employment_type",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="permanent">
                      Permanent
                    </option>

                    <option value="casual">
                      Casual
                    </option>
                  </select>
                </div>

                {/* Next of Kin Name */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Next of Kin Name
                  </label>

                  <input
                    value={form.next_of_kin_name}
                    onChange={(e) =>
                      handleFormChange(
                        "next_of_kin_name",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Next of Kin Phone */}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Next of Kin Phone
                  </label>

                  <input
                    value={form.next_of_kin_phone}
                    onChange={(e) =>
                      handleFormChange(
                        "next_of_kin_phone",
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

              </div>

              {actionError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {actionError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {submitting
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          VIEW EMPLOYEE MODAL
      ================================================= */}

      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-700">
                  {getInitials(selectedEmployee.full_name)}
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
                  setShowViewModal(false);
                  setSelectedEmployee(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              {/* National ID */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <User className="h-4 w-4" />
                  <span>National ID</span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedEmployee.national_id || "—"}
                </p>

              </div>

              {/* Phone */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="h-4 w-4" />
                  <span>Phone Number</span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedEmployee.phone_number || "—"}
                </p>

              </div>

              {/* Job Role */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Briefcase className="h-4 w-4" />
                  <span>Job Role</span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedEmployee.job_role || "—"}
                </p>

              </div>

              {/* Employment Type */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Briefcase className="h-4 w-4" />
                  <span>Employment Type</span>
                </div>

                <div className="mt-2">
                  {(() => {
                    const badge = getEmploymentTypeBadge(
                      selectedEmployee.employment_type
                    );

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

              </div>

              {/* Date Employed */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Date Employed</span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatDate(selectedEmployee.date_employed)}
                </p>

              </div>

              {/* Status */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <UserCheck className="h-4 w-4" />
                  <span>Status</span>
                </div>

                <div className="mt-2">

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedEmployee.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedEmployee.is_active
                          ? "bg-green-600"
                          : "bg-red-600"
                      }`}
                    />

                    {selectedEmployee.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>

                </div>

              </div>

              {/* Next of Kin */}

              <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <User className="h-4 w-4" />
                  <span>Next of Kin</span>
                </div>

                {selectedEmployee.next_of_kin_name ? (
                  <>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {selectedEmployee.next_of_kin_name}
                    </p>

                    {selectedEmployee.next_of_kin_phone && (
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedEmployee.next_of_kin_phone}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    No next of kin information provided.
                  </p>
                )}

              </div>

            </div>

            <div className="mt-6 flex justify-end">

              <button
                onClick={() => {
                  setShowViewModal(false);
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

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* Sidebar Header */}

        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">

          <div>
            <p className="text-sm font-semibold tracking-wide">
              NYUTU LIMITED
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Admin Portal
            </p>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* Navigation */}

        <div className="flex-1 overflow-y-auto px-4 py-6">

          {sidebarSections.map((section) => (
            <div
              key={section.title}
              className="mb-6"
            >

              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>

              <nav className="mt-3 space-y-1">

                {section.items.map((module) => {
                  const Icon = module.icon;

                  const isActive =
                    pathname === module.href;

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

        {/* Sidebar Footer */}

        <div className="border-t border-white/10 p-4">

          <div className="mb-3 rounded-xl bg-white/5 p-3">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="h-5 w-5 text-slate-300" />
              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-medium text-white">
                  Admin
                </p>

                <p className="truncate text-xs text-slate-500">
                  {me?.email}
                </p>

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

      {/* =================================================
          MAIN
      ================================================= */}

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

              <p className="text-sm font-medium text-slate-900">
                Employees
              </p>

              <p className="text-xs text-slate-500">
                Manage employee records
              </p>

            </div>

            <div className="flex items-center gap-3">

              <div className="hidden text-right sm:block">

                <p className="text-sm font-medium text-slate-900">
                  {me?.email}
                </p>

                <p className="text-xs text-slate-500">
                  Admin
                </p>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {me?.email?.charAt(0).toUpperCase() || "A"}
              </div>

            </div>

          </div>

        </header>

        {/* Main Content */}

        <main className="px-5 py-7 sm:px-8 lg:py-9">

          {/* Welcome Banner */}

          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-sm sm:px-8">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-medium text-slate-400">
                  {greeting}, Admin
                </p>

                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Employee Management
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Create, view, and manage employee records and
                  basic employment information.
                </p>

              </div>

              <div className="flex items-center gap-3">

                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <Plus className="h-4 w-4" />
                  Add Employee
                </button>

                <button
                  onClick={loadData}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>

              </div>

            </div>

          </section>

          {/* =================================================
              SUMMARY CARDS
          ================================================= */}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Total */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-slate-100 p-2">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>

                <div>

                  <p className="text-xs text-slate-500">
                    Total Employees
                  </p>

                  <p className="text-2xl font-semibold text-slate-900">
                    {stats.total}
                  </p>

                  <p className="text-xs text-slate-400">
                    {stats.active} active · {stats.inactive} inactive
                  </p>

                </div>

              </div>

            </div>

            {/* Permanent */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-50 p-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>

                <div>

                  <p className="text-xs text-slate-500">
                    Permanent
                  </p>

                  <p className="text-2xl font-semibold text-slate-900">
                    {stats.permanent}
                  </p>

                  <p className="text-xs text-slate-400">
                    Permanent employees
                  </p>

                </div>

              </div>

            </div>

            {/* Casual */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-orange-50 p-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>

                <div>

                  <p className="text-xs text-slate-500">
                    Casual
                  </p>

                  <p className="text-2xl font-semibold text-slate-900">
                    {stats.casual}
                  </p>

                  <p className="text-xs text-slate-400">
                    Casual employees
                  </p>

                </div>

              </div>

            </div>

            {/* Active */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-green-50 p-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>

                <div>

                  <p className="text-xs text-slate-500">
                    Active
                  </p>

                  <p className="text-2xl font-semibold text-slate-900">
                    {stats.active}
                  </p>

                  <p className="text-xs text-slate-400">
                    Currently employed
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              FILTERS
          ================================================= */}

          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">

              <div className="relative flex-1">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, ID, phone, or role..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />

              </div>

              <div className="flex items-center gap-2">

                <Filter className="h-4 w-4 text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">
                    All Status
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">
                    All Types
                  </option>

                  <option value="permanent">
                    Permanent
                  </option>

                  <option value="casual">
                    Casual
                  </option>
                </select>

              </div>

            </div>

            <div className="text-sm text-slate-500">
              {filteredEmployees.length} employee
              {filteredEmployees.length !== 1 ? "s" : ""}
            </div>

          </section>

          {/* =================================================
              EMPLOYEE TABLE
          ================================================= */}

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Employee
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Employee ID
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Job Role
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Type
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Date Employed
                    </th>

                    <th className="px-4 py-3 text-center font-medium text-slate-600">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center font-medium text-slate-600">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {paginatedEmployees.length === 0 ? (

                    <tr>

                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-slate-500"
                      >

                        <div className="flex flex-col items-center gap-2">

                          <Users className="h-8 w-8 text-slate-300" />

                          <p>
                            No employees found
                          </p>

                          <p className="text-xs text-slate-400">

                            {search ||
                            statusFilter !== "all" ||
                            typeFilter !== "all"
                              ? "Try adjusting your filters"
                              : "No employees have been added yet"}

                          </p>

                        </div>

                      </td>

                    </tr>

                  ) : (

                    paginatedEmployees.map((employee) => {

                      const typeBadge =
                        getEmploymentTypeBadge(
                          employee.employment_type
                        );

                      return (
                        <tr
                          key={employee.id}
                          className="transition hover:bg-slate-50/50"
                        >

                          {/* Employee */}

                          <td className="px-4 py-3.5">

                            <div className="flex items-center gap-3">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {getInitials(
                                  employee.full_name
                                )}
                              </div>

                              <div>

                                <p className="font-medium text-slate-900">
                                  {employee.full_name}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {employee.phone_number}
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* Employee ID */}

                          <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                            {employee.employee_id}
                          </td>

                          {/* Job Role */}

                          <td className="px-4 py-3.5 text-slate-600">
                            {employee.job_role || "—"}
                          </td>

                          {/* Type */}

                          <td className="px-4 py-3.5">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${typeBadge.color}`}
                            >
                              {typeBadge.icon}
                              {typeBadge.label}
                            </span>

                          </td>

                          {/* Date */}

                          <td className="px-4 py-3.5 text-slate-600">
                            {formatDate(
                              employee.date_employed
                            )}
                          </td>

                          {/* Status */}

                          <td className="px-4 py-3.5 text-center">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                employee.is_active
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  employee.is_active
                                    ? "bg-green-600"
                                    : "bg-red-600"
                                }`}
                              />

                              {employee.is_active
                                ? "Active"
                                : "Inactive"}

                            </span>

                          </td>

                          {/* Actions */}

                          <td className="px-4 py-3.5">

                            <div className="flex items-center justify-center gap-1.5">

                              <button
                                onClick={() =>
                                  openViewModal(employee)
                                }
                                title="View employee"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>

                              <button
                                onClick={() =>
                                  openEditModal(employee)
                                }
                                title="Edit employee"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    })
                  )}

                </tbody>

              </table>

            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            {totalPages > 1 && (

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">

                <div className="text-sm text-slate-500">

                  Showing{" "}
                  {startIndex + 1}
                  –
                  {Math.min(
                    startIndex + ITEMS_PER_PAGE,
                    filteredEmployees.length
                  )}{" "}
                  of{" "}
                  {filteredEmployees.length}

                </div>

                <div className="flex gap-1.5">

                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.max(1, p - 1)
                      )
                    }
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                  ).map((page) => (

                    <button
                      key={page}
                      onClick={() =>
                        setCurrentPage(page)
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm transition ${
                        page === currentPage
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
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
                    disabled={
                      currentPage === totalPages
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                </div>

              </div>
            )}

          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="mt-9 border-t border-slate-200 pt-6">

            <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">

              <p>
                © {new Date().getFullYear()} NYUTU LIMITED
              </p>

              <p>
                Admin Portal · Employee Management
              </p>

            </div>

          </footer>

        </main>

      </div>
    </div>
  );
}

/*
 * IMPORTANT:
 * useSearchParams() requires a Suspense boundary
 * during production prerendering in Next.js.
 */

export default function AdminEmployeesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">

          <div className="text-center">

            <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />

            <p className="mt-4 text-sm font-medium text-white">
              Loading employees...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Verifying secure access
            </p>

          </div>

        </div>
      }
    >
      <AdminEmployeesPageContent />
    </Suspense>
  );
}

