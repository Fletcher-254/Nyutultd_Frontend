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
  ArrowLeft,
  Check,
  ChevronRight,
  Edit,
  Eye,
  Fuel,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured.");
}

interface Employee {
  id: number;
  employee_id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  employment_type?: string;
  is_active?: boolean;
  status?: string;
  created_at?: string;
}

interface EmployeeForm {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  employment_type: string;
}

function EmployeesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const [form, setForm] = useState<EmployeeForm>({
    full_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    employment_type: "permanent",
  });

  const resetForm = useCallback(() => {
    setForm({
      full_name: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      employment_type: "permanent",
    });
    setActionError("");
  }, []);

  /*
   * Open Add Employee modal when the page is opened with:
   * /admin/employees?action=add
   */
  useEffect(() => {
    const action = searchParams?.get("action");

    if (action === "add") {
      resetForm();
      setShowAddModal(true);
    }
  }, [searchParams, resetForm]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await fetch(`${API_URL}/employees/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load employees.");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setEmployees(data);
      } else if (Array.isArray(data.results)) {
        setEmployees(data.results);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load employees."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const name =
        employee.full_name ||
        employee.name ||
        "";

      const status =
        employee.status ||
        (employee.is_active ? "active" : "inactive");

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.phone?.toLowerCase().includes(query) ||
        employee.employee_id?.toLowerCase().includes(query) ||
        employee.position?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === "all" ||
        employee.employment_type?.toLowerCase() ===
          typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [employees, search, statusFilter, typeFilter]);

  const activeCount = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.is_active === true ||
          employee.status?.toLowerCase() === "active"
      ).length,
    [employees]
  );

  const inactiveCount = employees.length - activeCount;

  const casualCount = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.employment_type?.toLowerCase() === "casual"
      ).length,
    [employees]
  );

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

  const openViewModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);

    setForm({
      full_name: employee.full_name || employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      department: employee.department || "",
      employment_type: employee.employment_type || "permanent",
    });

    setActionError("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedEmployee(null);
    resetForm();
  };

  const handleFormChange = (
    field: keyof EmployeeForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAddEmployee = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setActionError("");

      const response = await fetch(`${API_URL}/employees/create/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data?.detail ||
          data?.message ||
          "Failed to create employee.";

        throw new Error(
          typeof message === "string"
            ? message
            : "Failed to create employee."
        );
      }

      closeAddModal();
      await fetchEmployees();
    } catch (error) {
      console.error("Failed to create employee:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to create employee."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEmployee = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedEmployee) return;

    try {
      setSubmitting(true);
      setActionError("");

      const response = await fetch(
        `${API_URL}/employees/${selectedEmployee.id}/update/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data?.detail ||
          data?.message ||
          "Failed to update employee.";

        throw new Error(
          typeof message === "string"
            ? message
            : "Failed to update employee."
        );
      }

      closeEditModal();
      await fetchEmployees();
    } catch (error) {
      console.error("Failed to update employee:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to update employee."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      const response = await fetch(
        `${API_URL}/employees/${employee.id}/update/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            is_active: !employee.is_active,
          }),
        }
      );

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update employee status.");
      }

      await fetchEmployees();
    } catch (error) {
      console.error("Failed to toggle employee:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update employee status."
      );
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/login");
    }
  };

  const menuItems = [
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
      label: "Vehicles",
      icon: Truck,
      path: "/admin/vehicles",
    },
    {
      label: "Fuel",
      icon: Fuel,
      path: "/admin/fuel",
    },
    {
      label: "Vendors",
      icon: Store,
      path: "/admin/vendors",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-200 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>

          <div className="ml-3">
            <p className="text-sm font-bold text-slate-900">
              NYUTU LIMITED
            </p>
            <p className="text-xs text-slate-500">
              Administration
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className={`flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
                {active && (
                  <ChevronRight className="ml-auto h-4 w-4" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                type="button"
                className="mr-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                onClick={() => router.push("/admin/dashboard")}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Employees
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Manage your workforce and employee records
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </button>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* SUMMARY */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Employees
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {employees.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Active
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {activeCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Casual Employees
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {casualCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH / FILTERS */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search employees..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Employment Types</option>
                <option value="permanent">Permanent</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>

          {/* ERROR */}
          {pageError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )}

          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Employee Records
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredEmployees.length} employee
                    {filteredEmployees.length === 1 ? "" : "s"} found
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Loading employees...
                  </p>
                </div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  No employees found
                </h3>

                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {search ||
                  statusFilter !== "all" ||
                  typeFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Add your first employee to get started."}
                </p>

                {!search &&
                  statusFilter === "all" &&
                  typeFilter === "all" && (
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Employee
                    </button>
                  )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Position
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Type
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((employee) => {
                      const name =
                        employee.full_name ||
                        employee.name ||
                        "Unnamed Employee";

                      const isActive =
                        employee.is_active === true ||
                        employee.status?.toLowerCase() === "active";

                      return (
                        <tr
                          key={employee.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                                {name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>

                              <div className="ml-3 min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {name}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {employee.employee_id ||
                                    employee.email ||
                                    employee.phone ||
                                    "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700">
                              {employee.position || "—"}
                            </p>

                            <p className="text-xs text-slate-500">
                              {employee.department || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                              {employee.employment_type || "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <span
                                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                                  isActive
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openViewModal(employee)
                                }
                                title="View employee"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(employee)
                                }
                                title="Edit employee"
                                className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleStatus(employee)
                                }
                                title={
                                  isActive
                                    ? "Deactivate employee"
                                    : "Activate employee"
                                }
                                className={`rounded-lg p-2 ${
                                  isActive
                                    ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
                                    : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                }`}
                              >
                                {isActive ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Add Employee
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a new employee record
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee}>
              <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(event) =>
                      handleFormChange(
                        "full_name",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      handleFormChange(
                        "email",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="employee@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      handleFormChange(
                        "phone",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Position
                  </label>
                  <input
                    value={form.position}
                    onChange={(event) =>
                      handleFormChange(
                        "position",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Driver"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Department
                  </label>
                  <input
                    value={form.department}
                    onChange={(event) =>
                      handleFormChange(
                        "department",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Department"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Employment Type
                  </label>
                  <select
                    value={form.employment_type}
                    onChange={(event) =>
                      handleFormChange(
                        "employment_type",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="permanent">
                      Permanent
                    </option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
              </div>

              {actionError && (
                <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* VIEW MODAL */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Employee Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Employee information
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedEmployee(null);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="flex items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-700">
                  {(selectedEmployee.full_name ||
                    selectedEmployee.name ||
                    "E")
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>

                <div className="ml-4">
                  <h3 className="font-bold text-slate-900">
                    {selectedEmployee.full_name ||
                      selectedEmployee.name ||
                      "Unnamed Employee"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedEmployee.position || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Employee ID
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.employee_id || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Employment Type
                  </p>
                  <p className="mt-1 text-sm font-medium capitalize text-slate-800">
                    {selectedEmployee.employment_type || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-800">
                    {selectedEmployee.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Phone
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.phone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Department
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.department || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedEmployee.is_active
                      ? "Active"
                      : "Inactive"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedEmployee(null);
                }}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Edit Employee
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update employee information
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee}>
              <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(event) =>
                      handleFormChange(
                        "full_name",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      handleFormChange(
                        "email",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      handleFormChange(
                        "phone",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Position
                  </label>
                  <input
                    value={form.position}
                    onChange={(event) =>
                      handleFormChange(
                        "position",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Department
                  </label>
                  <input
                    value={form.department}
                    onChange={(event) =>
                      handleFormChange(
                        "department",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Employment Type
                  </label>
                  <select
                    value={form.employment_type}
                    onChange={(event) =>
                      handleFormChange(
                        "employment_type",
                        event.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="permanent">
                      Permanent
                    </option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
              </div>

              {actionError && (
                <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  );
}

/*
 * IMPORTANT:
 * useSearchParams() requires a Suspense boundary during
 * production prerendering in Next.js.
 */
export default function EmployeesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-600">
              Loading employees...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Verifying secure access
            </p>
          </div>
        </div>
      }
    >
      <EmployeesPageContent />
    </Suspense>
  );
}