"use client";

import { useCallback, useEffect, useState } from "react";
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
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Eye,
  User,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Shield,
  Key,
  Edit,
  Save,
  Trash2,
  AlertTriangle,
  FileSearch,
  Briefcase,
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
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface UserData {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
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
        name: "Users",
        description: "Manage system users",
        href: "/director/users",
        icon: Shield,
      },
      {
        name: "Audit",
        description: "View audit logs and reports",
        href: "/director/audit",
        icon: FileSearch,
      },
    ],
  },
];

function formatDate(dateString: string) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleBadge(role: string) {
  const roles: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    admin: {
      color: "bg-red-50 text-red-700 border-red-200",
      icon: <Shield className="h-3.5 w-3.5" />,
      label: "Admin",
    },
    director: {
      color: "bg-purple-50 text-purple-700 border-purple-200",
      icon: <Shield className="h-3.5 w-3.5" />,
      label: "Director",
    },
    manager: {
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <User className="h-3.5 w-3.5" />,
      label: "Manager",
    },
  };

  return roles[role] || roles.manager;
}

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: "Active",
    };
  }
  return {
    color: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "Inactive",
  };
}

function getVerificationBadge(isVerified: boolean) {
  if (isVerified) {
    return {
      color: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: "Verified",
    };
  }
  return {
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Unverified",
  };
}

export default function DirectorUsersPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editData, setEditData] = useState<Partial<UserData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    email: "",
    password: "",
    role: "manager" as Role,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;

  const authenticatedFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_URL}${endpoint}`, {
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
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      return response.json();
    },
    [router]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meData, usersData] = await Promise.all([
        authenticatedFetch("/me/"),
        authenticatedFetch("/users/"),
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
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Unable to load users data.");
      }
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async () => {
    if (!createData.email || !createData.password) {
      setCreateError("Email and password are required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      await authenticatedFetch("/register/", {
        method: "POST",
        body: JSON.stringify(createData),
      });

      setCreateSuccess(`User ${createData.email} created successfully!`);
      setTimeout(() => setCreateSuccess(null), 5000);
      setShowCreateModal(false);
      setCreateData({ email: "", password: "", role: "manager" });
      await loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editData) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await authenticatedFetch(`/users/${editingUser.id}/`, {
        method: "PATCH",
        body: JSON.stringify(editData),
      });

      setSaveSuccess(`User ${editingUser.email} updated successfully!`);
      setTimeout(() => setSaveSuccess(null), 5000);
      setShowEditModal(false);
      setEditingUser(null);
      setEditData(null);
      await loadData();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await authenticatedFetch(`/users/${deletingUser.id}/delete/`, {
        method: "DELETE",
      });

      setSaveSuccess(`User ${deletingUser.email} has been permanently deleted!`);
      setTimeout(() => setSaveSuccess(null), 5000);
      setShowDeleteModal(false);
      setDeletingUser(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower);

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Stats
  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
    admin: users.filter((u) => u.role === "admin").length,
    director: users.filter((u) => u.role === "director").length,
    manager: users.filter((u) => u.role === "manager").length,
  };

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
        headers: { Accept: "application/json" },
      });
    } catch {
      // Even if the logout request fails, leave the dashboard.
    } finally {
      router.replace("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-4 text-sm font-medium text-white">Loading users...</p>
          <p className="mt-1 text-xs text-slate-400">Fetching user data</p>
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
          <h1 className="mt-5 text-lg font-semibold text-slate-900">Unable to load data</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
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
      {/* Success Toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg bg-green-50 border border-green-200 p-4 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Success</p>
              <p className="text-sm text-green-600">{saveSuccess}</p>
            </div>
            <button
              onClick={() => setSaveSuccess(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {createSuccess && (
        <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg bg-green-50 border border-green-200 p-4 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">User Created</p>
              <p className="text-sm text-green-600">{createSuccess}</p>
            </div>
            <button
              onClick={() => setCreateSuccess(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold text-slate-900">Confirm Permanent Deletion</h3>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              Are you sure you want to permanently delete the user <strong>{deletingUser.email}</strong>?
              This action <strong>cannot be undone</strong> and will remove all associated data.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingUser(null);
                  setDeleteError(null);
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Permanently Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Create New User</h3>
                <p className="text-sm text-slate-500">Add a new system user</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateData({ email: "", password: "", role: "manager" });
                  setCreateError(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                {createError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={createData.role}
                  onChange={(e) => setCreateData({ ...createData, role: e.target.value as Role })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="admin">Admin</option>
                  <option value="director">Director</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateData({ email: "", password: "", role: "manager" });
                  setCreateError(null);
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isCreating}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Create User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
                <p className="text-sm text-slate-500">{editingUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setEditData(null);
                  setSaveError(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {saveError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                {saveError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={editData.role || editingUser.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value as Role })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="admin">Admin</option>
                  <option value="director">Director</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editData.is_active !== undefined ? String(editData.is_active) : String(editingUser.is_active)}
                  onChange={(e) => setEditData({ ...editData, is_active: e.target.value === "true" })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Verification</label>
                <select
                  value={editData.is_verified !== undefined ? String(editData.is_verified) : String(editingUser.is_verified)}
                  onChange={(e) => setEditData({ ...editData, is_verified: e.target.value === "true" })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setEditData(null);
                  setSaveError(null);
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <User className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    User Details
                  </h3>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedUser(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {selectedUser.email}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="h-4 w-4" />
                  <span>Role</span>
                </div>
                <div className="mt-2">
                  {(() => {
                    const badge = getRoleBadge(selectedUser.role);
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <div className="mt-2">
                  {(() => {
                    const badge = getStatusBadge(selectedUser.is_active);
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-4 w-4" />
                  <span>Verification</span>
                </div>
                <div className="mt-2">
                  {(() => {
                    const badge = getVerificationBadge(selectedUser.is_verified);
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="col-span-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>Created At</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatDate(selectedUser.created_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedUser(null);
                }}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
              <p className="text-sm font-medium text-slate-900">User Management</p>
              <p className="text-xs text-slate-500">Manage system users</p>
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
                  User Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Manage system users, roles, and access permissions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
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

          {/* Summary Cards */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2">
                  <Users className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Users</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-400">{stats.active} active · {stats.inactive} inactive</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-2">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Admins</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.admin}</p>
                  <p className="text-xs text-slate-400">Full system access</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Directors</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.director}</p>
                  <p className="text-xs text-slate-400">Executive access</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Managers</p>
                  <p className="text-2xl font-semibold text-slate-900">{stats.manager}</p>
                  <p className="text-xs text-slate-400">Operational access</p>
                </div>
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by email or role..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="director">Director</option>
                  <option value="manager">Manager</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-slate-500">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
            </div>
          </section>

          {/* Table */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Verified</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-slate-300" />
                          <p>No users found</p>
                          <p className="text-xs text-slate-400">
                            {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                              ? "Try adjusting your filters"
                              : "No users have been created yet"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const roleBadge = getRoleBadge(user.role);
                      const statusBadge = getStatusBadge(user.is_active);
                      const verificationBadge = getVerificationBadge(user.is_verified);
                      const isCurrentUser = me?.id === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                                {user.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{user.email}</p>
                                {isCurrentUser && (
                                  <span className="text-xs text-slate-400">(You)</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadge.color}`}>
                              {roleBadge.icon}
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge.color}`}>
                              {statusBadge.icon}
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${verificationBadge.color}`}>
                              {verificationBadge.icon}
                              {verificationBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDetailModal(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>
                              {!isCurrentUser && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingUser(user);
                                      setEditData({
                                        role: user.role,
                                        is_active: user.is_active,
                                        is_verified: user.is_verified,
                                      });
                                      setShowEditModal(true);
                                      setSaveError(null);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                                  >
                                    <Edit className="h-3 w-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingUser(user);
                                      setShowDeleteModal(true);
                                      setDeleteError(null);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4">
                <div className="text-sm text-slate-500">
                  Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
                  {filteredUsers.length}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

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