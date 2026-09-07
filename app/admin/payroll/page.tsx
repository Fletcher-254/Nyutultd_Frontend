"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ElementType } from "react";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Truck,
  Fuel,
  Receipt,
  WalletCards,
  Store,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Building2,
  Search,
  RefreshCw,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  FileText,
  User,
  Hash,
  Calendar,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  UserCheck,
  UserX,
  Users as UsersIcon,
  Wallet,
  Banknote,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

// ==================================================
// SIDEBAR
// ==================================================

type ChildItem = {
  label: string;
  href: string;
  icon: ElementType;
};

type NavItem = {
  label: string;
  href?: string;
  icon: ElementType;
  children?: ChildItem[];
};

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Human Resources",
    icon: Users,
    children: [
      {
        label: "Employees",
        href: "/employees",
        icon: Users,
      },
      {
        label: "Attendance",
        href: "/attendance",
        icon: CalendarDays,
      },
    ],
  },
  {
    label: "Procurement",
    icon: Store,
    children: [
      {
        label: "Vendors",
        href: "/vendors",
        icon: Store,
      },
      {
        label: "Expenses",
        href: "/expenses",
        icon: Receipt,
      },
    ],
  },
  {
    label: "Fleet",
    icon: Truck,
    children: [
      {
        label: "Vehicles",
        href: "/vehicles",
        icon: Truck,
      },
      {
        label: "Fuel",
        href: "/fuel",
        icon: Fuel,
      },
    ],
  },
  {
    label: "Finance",
    icon: WalletCards,
    children: [
      {
        label: "Payroll",
        href: "/payroll",
        icon: WalletCards,
      },
    ],
  },
];

// ==================================================
// TYPES
// ==================================================

type UserProfile = {
  id: number;
  email: string;
  role: "director" | "admin" | "manager";
};

type CasualPayroll = {
  id: number;
  employee: number;
  employee_id: string;
  employee_name: string;
  payroll_period: number;
  days_worked: number;
  daily_wage: number;
  amount_due: number;
  payment_status: "pending" | "processing" | "paid" | "failed";
  mpesa_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type PermanentPayroll = {
  id: number;
  employee: number;
  employee_id: string;
  employee_name: string;
  payroll_period: number;
  monthly_salary: number;
  allowances: number;
  overtime: number;
  bonuses: number;
  gross_pay: number;
  paye: number;
  sha: number;
  nssf: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  payment_status: "pending" | "processing" | "paid" | "failed";
  mpesa_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type PayrollSummary = {
  payroll_period: {
    id: number;
    period_type: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  total_employees: number;
  paid_employees: number;
  pending_employees: number;
  processing_employees: number;
  failed_employees: number;
  total_amount_due?: number;
  total_amount_paid?: number;
  total_amount_pending?: number;
  total_gross_pay?: number;
  total_deductions?: number;
  total_net_pay?: number;
  total_paid?: number;
  total_pending?: number;
};

// ==================================================
// PAGE
// ==================================================

export default function PayrollPage() {
  const router = useRouter();
  const pathname = usePathname();

  // ==================================================
  // SIDEBAR STATE
  // ==================================================

  const [mobileOpen, setMobileOpen] = useState(false);

  const [openSections, setOpenSections] = useState<
    Record<string, boolean>
  >({
    "Human Resources": true,
    Procurement: true,
    Fleet: true,
    Finance: true,
  });

  function toggleSection(label: string) {
    setOpenSections((previous) => ({
      ...previous,
      [label]: !previous[label],
    }));
  }

  function isActive(href: string) {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  // ==================================================
  // AUTH
  // ==================================================

  function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  // ==================================================
  // STATE
  // ==================================================

  const [user, setUser] = useState<UserProfile | null>(null);

  const [casualPayroll, setCasualPayroll] = useState<CasualPayroll[]>([]);
  const [permanentPayroll, setPermanentPayroll] = useState<PermanentPayroll[]>([]);

  const [casualSummary, setCasualSummary] = useState<PayrollSummary | null>(null);
  const [permanentSummary, setPermanentSummary] = useState<PayrollSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"casual" | "permanent">("casual");

  // ==================================================
  // PAY MODAL (Director only)
  // ==================================================

  const [showPayModal, setShowPayModal] = useState(false);
  const [payingEmployee, setPayingEmployee] = useState<CasualPayroll | PermanentPayroll | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [mpesaReference, setMpesaReference] = useState("");

  // ==================================================
  // EDIT PERMANENT PAYROLL MODAL (Manager & Director)
  // ==================================================

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PermanentPayroll | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    monthly_salary: "",
    allowances: "",
    overtime: "",
    bonuses: "",
    paye: "",
    sha: "",
    nssf: "",
    other_deductions: "",
  });

  // ==================================================
  // DETAIL MODAL
  // ==================================================

  const [selectedCasual, setSelectedCasual] = useState<CasualPayroll | null>(null);
  const [selectedPermanent, setSelectedPermanent] = useState<PermanentPayroll | null>(null);

  // ==================================================
  // LOAD USER
  // ==================================================

  async function loadUser(token: string) {
    const response = await fetch(`${API}/me/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return null;
      }
      throw new Error("Failed to load user.");
    }

    const data = await response.json();
    setUser(data);
    return data;
  }

  // ==================================================
  // LOAD CASUAL PAYROLL
  // ==================================================

  async function loadCasualPayroll(token: string) {
    const response = await fetch(`${API}/payroll/casual/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }
      throw new Error(`Failed to load casual payroll. Server returned ${response.status}.`);
    }

    const data = await response.json();
    const payrollList = Array.isArray(data) ? data : [];
    
    const parsedPayroll = payrollList.map((p) => ({
      ...p,
      days_worked: typeof p.days_worked === 'number' ? p.days_worked : Number(p.days_worked) || 0,
      daily_wage: typeof p.daily_wage === 'number' ? p.daily_wage : Number(p.daily_wage) || 0,
      amount_due: typeof p.amount_due === 'number' ? p.amount_due : Number(p.amount_due) || 0,
    }));
    
    setCasualPayroll(parsedPayroll);
  }

  // ==================================================
  // LOAD PERMANENT PAYROLL
  // ==================================================

  async function loadPermanentPayroll(token: string) {
    const response = await fetch(`${API}/payroll/permanent/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }
      throw new Error(`Failed to load permanent payroll. Server returned ${response.status}.`);
    }

    const data = await response.json();
    const payrollList = Array.isArray(data) ? data : [];
    
    const parsedPayroll = payrollList.map((p) => ({
      ...p,
      monthly_salary: typeof p.monthly_salary === 'number' ? p.monthly_salary : Number(p.monthly_salary) || 0,
      allowances: typeof p.allowances === 'number' ? p.allowances : Number(p.allowances) || 0,
      overtime: typeof p.overtime === 'number' ? p.overtime : Number(p.overtime) || 0,
      bonuses: typeof p.bonuses === 'number' ? p.bonuses : Number(p.bonuses) || 0,
      gross_pay: typeof p.gross_pay === 'number' ? p.gross_pay : Number(p.gross_pay) || 0,
      paye: typeof p.paye === 'number' ? p.paye : Number(p.paye) || 0,
      sha: typeof p.sha === 'number' ? p.sha : Number(p.sha) || 0,
      nssf: typeof p.nssf === 'number' ? p.nssf : Number(p.nssf) || 0,
      other_deductions: typeof p.other_deductions === 'number' ? p.other_deductions : Number(p.other_deductions) || 0,
      total_deductions: typeof p.total_deductions === 'number' ? p.total_deductions : Number(p.total_deductions) || 0,
      net_pay: typeof p.net_pay === 'number' ? p.net_pay : Number(p.net_pay) || 0,
    }));
    
    setPermanentPayroll(parsedPayroll);
  }

  // ==================================================
  // LOAD CASUAL SUMMARY
  // ==================================================

  async function loadCasualSummary(token: string) {
    const response = await fetch(`${API}/payroll/casual/summary/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load casual summary. Server returned ${response.status}.`);
    }

    const data = await response.json();
    setCasualSummary(data);
  }

  // ==================================================
  // LOAD PERMANENT SUMMARY
  // ==================================================

  async function loadPermanentSummary(token: string) {
    const response = await fetch(`${API}/payroll/permanent/summary/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load permanent summary. Server returned ${response.status}.`);
    }

    const data = await response.json();
    setPermanentSummary(data);
  }

  // ==================================================
  // LOAD EVERYTHING - BOTH ROLES CAN SEE ALL
  // ==================================================

  async function loadPayrollPage() {
    const token = getToken();

    if (!token) {
      router.push("/");
      return;
    }

    try {
      setError("");

      const userData = await loadUser(token);

      if (!userData) return;

      // Both Director and Manager can see both Casual and Permanent payroll
      await Promise.all([
        loadCasualPayroll(token),
        loadCasualSummary(token),
        loadPermanentPayroll(token),
        loadPermanentSummary(token),
      ]);
    } catch (err: any) {
      console.error("Payroll page error:", err);
      setError(
        err?.message ||
          "Something went wrong while loading payroll data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPayrollPage();
  }, []);

  // ==================================================
  // REFRESH
  // ==================================================

  async function refreshPage() {
    setRefreshing(true);
    await loadPayrollPage();
  }

  // ==================================================
  // PERMISSIONS
  // ==================================================

  const isManager = user?.role === "manager";
  const isDirector = user?.role === "director";
  
  // Manager can edit permanent payroll (set salaries)
  const canEditPermanent = isManager || isDirector;
  
  // Only Director can mark as paid (payment)
  const canPay = isDirector;

  // ==================================================
  // PAY EMPLOYEE (Director only)
  // ==================================================

  function openPayModal(employee: CasualPayroll | PermanentPayroll) {
    setPayingEmployee(employee);
    setMpesaReference("");
    setShowPayModal(true);
  }

  function closePayModal() {
    if (paySubmitting) return;
    setShowPayModal(false);
    setPayingEmployee(null);
    setMpesaReference("");
  }

  async function payEmployee() {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!payingEmployee) return;

    if (!mpesaReference.trim()) {
      alert("Please enter an M-Pesa reference number.");
      return;
    }

    setPaySubmitting(true);

    try {
      const isCasual = "days_worked" in payingEmployee;
      const endpoint = isCasual
        ? `${API}/payroll/casual/${payingEmployee.id}/pay/`
        : `${API}/payroll/permanent/${payingEmployee.id}/pay/`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mpesa_reference: mpesaReference.trim(),
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        let message = `Failed to process payment. Server returned ${response.status}.`;

        try {
          const data = await response.json();
          message = data.error || data.detail || message;
        } catch {}

        alert(message);
        return;
      }

      const updatedEmployee = await response.json();

      if (isCasual) {
        setCasualPayroll((prev) =>
          prev.map((p) =>
            p.id === updatedEmployee.id ? updatedEmployee : p
          )
        );
      } else {
        setPermanentPayroll((prev) =>
          prev.map((p) =>
            p.id === updatedEmployee.id ? updatedEmployee : p
          )
        );
      }

      setSuccess(`${payingEmployee.employee_name} has been marked as paid.`);
      closePayModal();

      const token2 = getToken();
      if (token2) {
        if (isCasual) await loadCasualSummary(token2);
        else await loadPermanentSummary(token2);
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Pay employee error:", err);
      alert("Something went wrong while processing the payment.");
    } finally {
      setPaySubmitting(false);
    }
  }

  // ==================================================
  // EDIT PERMANENT PAYROLL (Manager & Director)
  // ==================================================

  function openEditModal(payroll: PermanentPayroll) {
    setEditingPayroll(payroll);
    setEditForm({
      monthly_salary: String(payroll.monthly_salary),
      allowances: String(payroll.allowances),
      overtime: String(payroll.overtime),
      bonuses: String(payroll.bonuses),
      paye: String(payroll.paye),
      sha: String(payroll.sha),
      nssf: String(payroll.nssf),
      other_deductions: String(payroll.other_deductions),
    });
    setShowEditModal(true);
  }

  function closeEditModal() {
    if (editSubmitting) return;
    setShowEditModal(false);
    setEditingPayroll(null);
  }

  function handleEditChange(field: keyof typeof editForm, value: string) {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function savePermanentPayroll() {
    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!editingPayroll) return;

    setEditSubmitting(true);

    try {
      const payload = {
        monthly_salary: Number(editForm.monthly_salary) || 0,
        allowances: Number(editForm.allowances) || 0,
        overtime: Number(editForm.overtime) || 0,
        bonuses: Number(editForm.bonuses) || 0,
        paye: Number(editForm.paye) || 0,
        sha: Number(editForm.sha) || 0,
        nssf: Number(editForm.nssf) || 0,
        other_deductions: Number(editForm.other_deductions) || 0,
      };

      const response = await fetch(
        `${API}/payroll/permanent/${editingPayroll.id}/save/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        let message = `Failed to save payroll. Server returned ${response.status}.`;

        try {
          const data = await response.json();
          message = data.error || data.detail || message;
        } catch {}

        alert(message);
        return;
      }

      const updatedPayroll = await response.json();

      setPermanentPayroll((prev) =>
        prev.map((p) =>
          p.id === updatedPayroll.id ? updatedPayroll : p
        )
      );

      setSuccess(`${editingPayroll.employee_name}'s payroll has been updated.`);
      closeEditModal();

      const token2 = getToken();
      if (token2) await loadPermanentSummary(token2);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Save permanent payroll error:", err);
      alert("Something went wrong while saving the payroll.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // ==================================================
  // SEARCH & FILTER
  // ==================================================

  const filteredCasual = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) return casualPayroll;

    return casualPayroll.filter(
      (p) =>
        p.employee_name.toLowerCase().includes(searchTerm) ||
        p.employee_id.toLowerCase().includes(searchTerm) ||
        p.payment_status.toLowerCase().includes(searchTerm)
    );
  }, [casualPayroll, search]);

  const filteredPermanent = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) return permanentPayroll;

    return permanentPayroll.filter(
      (p) =>
        p.employee_name.toLowerCase().includes(searchTerm) ||
        p.employee_id.toLowerCase().includes(searchTerm) ||
        p.payment_status.toLowerCase().includes(searchTerm)
    );
  }, [permanentPayroll, search]);

  // ==================================================
  // STATISTICS
  // ==================================================

  const casualStats = useMemo(() => {
    const total = casualPayroll.length;
    const paid = casualPayroll.filter((p) => p.payment_status === "paid").length;
    const pending = casualPayroll.filter((p) => p.payment_status === "pending").length;
    const processing = casualPayroll.filter((p) => p.payment_status === "processing").length;
    const failed = casualPayroll.filter((p) => p.payment_status === "failed").length;

    const totalDue = casualPayroll.reduce((sum, p) => {
      const amount = typeof p.amount_due === 'number' ? p.amount_due : Number(p.amount_due) || 0;
      return sum + amount;
    }, 0);

    const totalPaid = casualPayroll
      .filter((p) => p.payment_status === "paid")
      .reduce((sum, p) => {
        const amount = typeof p.amount_due === 'number' ? p.amount_due : Number(p.amount_due) || 0;
        return sum + amount;
      }, 0);

    return { total, paid, pending, processing, failed, totalDue, totalPaid };
  }, [casualPayroll]);

  const permanentStats = useMemo(() => {
    const total = permanentPayroll.length;
    const paid = permanentPayroll.filter((p) => p.payment_status === "paid").length;
    const pending = permanentPayroll.filter((p) => p.payment_status === "pending").length;
    const processing = permanentPayroll.filter((p) => p.payment_status === "processing").length;
    const failed = permanentPayroll.filter((p) => p.payment_status === "failed").length;

    const totalNet = permanentPayroll.reduce((sum, p) => {
      const net = typeof p.net_pay === 'number' ? p.net_pay : Number(p.net_pay) || 0;
      return sum + net;
    }, 0);

    const totalPaid = permanentPayroll
      .filter((p) => p.payment_status === "paid")
      .reduce((sum, p) => {
        const net = typeof p.net_pay === 'number' ? p.net_pay : Number(p.net_pay) || 0;
        return sum + net;
      }, 0);

    return { total, paid, pending, processing, failed, totalNet, totalPaid };
  }, [permanentPayroll]);

  // ==================================================
  // FORMAT HELPERS
  // ==================================================

  function formatMoney(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString("en-KE", {
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

  function getStatusBadge(status: string) {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5" />
            Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Chuka ERP</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        <aside className="fixed left-0 top-0 bottom-0 z-50 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
          <SidebarContent
            pathname={pathname}
            openSections={openSections}
            toggleSection={toggleSection}
            isActive={isActive}
            handleLogout={handleLogout}
            setMobileOpen={setMobileOpen}
          />
        </aside>

        <div className="min-h-screen bg-gray-50 lg:ml-64 pt-16 lg:pt-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading payroll data...</p>
          </div>
        </div>
      </>
    );
  }

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <>
      {/* MOBILE HEADER */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Chuka ERP</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          pathname={pathname}
          openSections={openSections}
          toggleSection={toggleSection}
          isActive={isActive}
          handleLogout={handleLogout}
          setMobileOpen={setMobileOpen}
        />
      </aside>

      {/* MAIN */}
      <div className="min-h-screen bg-gray-50 lg:ml-64 pt-16 lg:pt-0">
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                  <WalletCards className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {isManager 
                      ? "View payroll and manage permanent employee salaries" 
                      : "Manage employee payroll and payments"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={refreshPage}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* SUCCESS */}
          {success && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 text-xs">✓</span>
              </div>
              <p className="text-sm font-medium text-emerald-800">{success}</p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Unable to load payroll data</p>
                <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {/* TABS - Both roles can see both tabs */}
          <div className="flex gap-6 mb-6 border-b border-gray-200">
            <button
              onClick={() => setView("casual")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                view === "casual"
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Casual Payroll (Weekly)
            </button>

            <button
              onClick={() => setView("permanent")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                view === "permanent"
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Permanent Payroll (Monthly)
            </button>
          </div>

          {/* ==================================================
              CASUAL PAYROLL VIEW
          ================================================== */}
          {view === "casual" && (
            <>
              {/* Casual Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard
                  title="Total Employees"
                  value={casualStats.total.toString()}
                  icon={<UsersIcon className="w-5 h-5" />}
                />

                <StatCard
                  title="Paid"
                  value={casualStats.paid.toString()}
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                />

                <StatCard
                  title="Pending"
                  value={casualStats.pending.toString()}
                  icon={<Clock className="w-5 h-5 text-yellow-600" />}
                />

                <StatCard
                  title="Total Due"
                  value={`KES ${formatMoney(casualStats.totalDue)}`}
                  icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                />

                <StatCard
                  title="Total Paid"
                  value={`KES ${formatMoney(casualStats.totalPaid)}`}
                  icon={<Wallet className="w-5 h-5 text-emerald-600" />}
                />
              </div>

              {/* Casual Payroll Table */}
              <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
                <div className="border-b border-gray-200 px-5 pt-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3">
                    <div className="relative flex-1 md:max-w-sm">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search casual employees..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      />
                    </div>

                    <div className="text-sm text-gray-500">
                      {filteredCasual.length} employees found
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 border-b border-blue-200">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Days Worked
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Daily Wage
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Amount Due
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredCasual.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                            {search
                              ? "No casual employees match your search."
                              : "No casual payroll records found."}
                          </td>
                        </tr>
                      ) : (
                        filteredCasual.map((payroll) => (
                          <tr key={payroll.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900">
                                {payroll.employee_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {payroll.employee_id}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center text-sm font-medium text-gray-700">
                              {payroll.days_worked}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-gray-600">
                              KES {formatMoney(payroll.daily_wage)}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-gray-900">
                              KES {formatMoney(payroll.amount_due)}
                            </td>

                            <td className="px-5 py-4">
                              {getStatusBadge(payroll.payment_status)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setSelectedCasual(payroll)}
                                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Pay button - Director only */}
                                {canPay && payroll.payment_status !== "paid" && (
                                  <button
                                    onClick={() => openPayModal(payroll)}
                                    className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    title="Mark as paid"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
                  <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Showing {filteredCasual.length} of {casualPayroll.length} employees
                    </span>
                    <span className="font-medium text-gray-700">
                      Total due: KES {formatMoney(casualStats.totalDue)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================================================
              PERMANENT PAYROLL VIEW
          ================================================== */}
          {view === "permanent" && (
            <>
              {/* Permanent Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard
                  title="Total Employees"
                  value={permanentStats.total.toString()}
                  icon={<UsersIcon className="w-5 h-5" />}
                />

                <StatCard
                  title="Paid"
                  value={permanentStats.paid.toString()}
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                />

                <StatCard
                  title="Pending"
                  value={permanentStats.pending.toString()}
                  icon={<Clock className="w-5 h-5 text-yellow-600" />}
                />

                <StatCard
                  title="Total Net Pay"
                  value={`KES ${formatMoney(permanentStats.totalNet)}`}
                  icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                />

                <StatCard
                  title="Total Paid"
                  value={`KES ${formatMoney(permanentStats.totalPaid)}`}
                  icon={<Wallet className="w-5 h-5 text-emerald-600" />}
                />
              </div>

              {/* Permanent Payroll Table */}
              <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
                <div className="border-b border-gray-200 px-5 pt-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3">
                    <div className="relative flex-1 md:max-w-sm">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search permanent employees..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      />
                    </div>

                    <div className="text-sm text-gray-500">
                      {filteredPermanent.length} employees found
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-50 border-b border-blue-200">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Gross Pay
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Deductions
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Net Pay
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredPermanent.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                            {search
                              ? "No permanent employees match your search."
                              : "No permanent payroll records found."}
                          </td>
                        </tr>
                      ) : (
                        filteredPermanent.map((payroll) => (
                          <tr key={payroll.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900">
                                {payroll.employee_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {payroll.employee_id}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-gray-600">
                              KES {formatMoney(payroll.gross_pay)}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-red-600">
                              KES {formatMoney(payroll.total_deductions)}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                              KES {formatMoney(payroll.net_pay)}
                            </td>

                            <td className="px-5 py-4">
                              {getStatusBadge(payroll.payment_status)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setSelectedPermanent(payroll)}
                                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Edit - Manager and Director can edit permanent payroll */}
                                {canEditPermanent && payroll.payment_status !== "paid" && (
                                  <button
                                    onClick={() => openEditModal(payroll)}
                                    className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    title="Edit payroll details"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Pay - Director only */}
                                {canPay && payroll.payment_status !== "paid" && (
                                  <button
                                    onClick={() => openPayModal(payroll)}
                                    className="p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    title="Mark as paid"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
                  <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Showing {filteredPermanent.length} of {permanentPayroll.length} employees
                    </span>
                    <span className="font-medium text-gray-700">
                      Total net pay: KES {formatMoney(permanentStats.totalNet)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ==================================================
          PAY MODAL (Director only)
      ================================================== */}
      {showPayModal && payingEmployee && (
        <Modal
          title="Pay Employee"
          onClose={closePayModal}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
              <p className="text-sm text-blue-700">
                <User className="w-4 h-4 inline mr-2" />
                <strong>{payingEmployee.employee_name}</strong>
                {" "}({payingEmployee.employee_id})
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Amount due:{" "}
                <strong>
                  KES {formatMoney(
                    "days_worked" in payingEmployee
                      ? payingEmployee.amount_due
                      : payingEmployee.net_pay
                  )}
                </strong>
              </p>
            </div>

            <FormField
              label="M-Pesa Reference Number"
              required
              value={mpesaReference}
              onChange={setMpesaReference}
              placeholder="Enter M-Pesa confirmation code"
            />

            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              This will mark the employee as paid. This action cannot be undone.
            </div>
          </div>

          <ModalActions
            onCancel={closePayModal}
            onSubmit={payEmployee}
            submitting={paySubmitting}
            submitText="Confirm Payment"
          />
        </Modal>
      )}

      {/* ==================================================
          EDIT PERMANENT PAYROLL MODAL (Manager & Director)
      ================================================== */}
      {showEditModal && editingPayroll && (
        <Modal
          title={`Edit Payroll - ${editingPayroll.employee_name}`}
          onClose={closeEditModal}
          wide
        >
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {isManager 
              ? "As a Manager, you can set salary details for permanent employees." 
              : "Edit payroll details for this permanent employee."}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Monthly Salary"
              type="number"
              step="0.01"
              value={editForm.monthly_salary}
              onChange={(value) => handleEditChange("monthly_salary", value)}
            />

            <FormField
              label="Allowances"
              type="number"
              step="0.01"
              value={editForm.allowances}
              onChange={(value) => handleEditChange("allowances", value)}
            />

            <FormField
              label="Overtime"
              type="number"
              step="0.01"
              value={editForm.overtime}
              onChange={(value) => handleEditChange("overtime", value)}
            />

            <FormField
              label="Bonuses"
              type="number"
              step="0.01"
              value={editForm.bonuses}
              onChange={(value) => handleEditChange("bonuses", value)}
            />

            <FormField
              label="PAYE"
              type="number"
              step="0.01"
              value={editForm.paye}
              onChange={(value) => handleEditChange("paye", value)}
            />

            <FormField
              label="SHA"
              type="number"
              step="0.01"
              value={editForm.sha}
              onChange={(value) => handleEditChange("sha", value)}
            />

            <FormField
              label="NSSF"
              type="number"
              step="0.01"
              value={editForm.nssf}
              onChange={(value) => handleEditChange("nssf", value)}
            />

            <FormField
              label="Other Deductions"
              type="number"
              step="0.01"
              value={editForm.other_deductions}
              onChange={(value) => handleEditChange("other_deductions", value)}
            />
          </div>

          <ModalActions
            onCancel={closeEditModal}
            onSubmit={savePermanentPayroll}
            submitting={editSubmitting}
            submitText="Save Changes"
          />
        </Modal>
      )}

      {/* ==================================================
          CASUAL PAYROLL DETAIL MODAL
      ================================================== */}
      {selectedCasual && (
        <Modal
          title="Casual Payroll Details"
          onClose={() => setSelectedCasual(null)}
        >
          <div className="space-y-4">
            <DetailRow label="Employee" value={selectedCasual.employee_name} />
            <DetailRow label="Employee ID" value={selectedCasual.employee_id} />
            <DetailRow label="Days Worked" value={selectedCasual.days_worked.toString()} />
            <DetailRow label="Daily Wage" value={`KES ${formatMoney(selectedCasual.daily_wage)}`} />
            <DetailRow label="Amount Due" value={`KES ${formatMoney(selectedCasual.amount_due)}`} />
            <DetailRow label="Status" value={selectedCasual.payment_status.toUpperCase()} />
            <DetailRow label="M-Pesa Reference" value={selectedCasual.mpesa_reference || "—"} />
            <DetailRow label="Paid At" value={formatDate(selectedCasual.paid_at)} />
            <DetailRow label="Created At" value={formatDate(selectedCasual.created_at)} />
          </div>
        </Modal>
      )}

      {/* ==================================================
          PERMANENT PAYROLL DETAIL MODAL
      ================================================== */}
      {selectedPermanent && (
        <Modal
          title="Permanent Payroll Details"
          onClose={() => setSelectedPermanent(null)}
        >
          <div className="space-y-4">
            <DetailRow label="Employee" value={selectedPermanent.employee_name} />
            <DetailRow label="Employee ID" value={selectedPermanent.employee_id} />

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Earnings</h3>
              <DetailRow label="Monthly Salary" value={`KES ${formatMoney(selectedPermanent.monthly_salary)}`} />
              <DetailRow label="Allowances" value={`KES ${formatMoney(selectedPermanent.allowances)}`} />
              <DetailRow label="Overtime" value={`KES ${formatMoney(selectedPermanent.overtime)}`} />
              <DetailRow label="Bonuses" value={`KES ${formatMoney(selectedPermanent.bonuses)}`} />
              <DetailRow label="Gross Pay" value={`KES ${formatMoney(selectedPermanent.gross_pay)}`} className="font-bold" />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Deductions</h3>
              <DetailRow label="PAYE" value={`KES ${formatMoney(selectedPermanent.paye)}`} />
              <DetailRow label="SHA" value={`KES ${formatMoney(selectedPermanent.sha)}`} />
              <DetailRow label="NSSF" value={`KES ${formatMoney(selectedPermanent.nssf)}`} />
              <DetailRow label="Other Deductions" value={`KES ${formatMoney(selectedPermanent.other_deductions)}`} />
              <DetailRow label="Total Deductions" value={`KES ${formatMoney(selectedPermanent.total_deductions)}`} className="font-bold" />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <DetailRow label="Net Pay" value={`KES ${formatMoney(selectedPermanent.net_pay)}`} className="font-bold text-emerald-600" />
              <DetailRow label="Status" value={selectedPermanent.payment_status.toUpperCase()} />
              <DetailRow label="M-Pesa Reference" value={selectedPermanent.mpesa_reference || "—"} />
              <DetailRow label="Paid At" value={formatDate(selectedPermanent.paid_at)} />
              <DetailRow label="Created At" value={formatDate(selectedPermanent.created_at)} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ==================================================
// SIDEBAR CONTENT
// ==================================================

function SidebarContent({
  pathname,
  openSections,
  toggleSection,
  isActive,
  handleLogout,
  setMobileOpen,
}: {
  pathname: string;
  openSections: Record<string, boolean>;
  toggleSection: (label: string) => void;
  isActive: (href: string) => boolean;
  handleLogout: () => void;
  setMobileOpen: (open: boolean) => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-gray-200 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900">Chuka ERP</div>
            <div className="text-[11px] text-gray-500">Enterprise Management</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (item.href) {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            }

            const isOpen = openSections[item.label];
            const hasActiveChild = item.children?.some(
              (child) => isActive(child.href)
            );

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {isOpen && item.children && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(child.href);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-blue-50 font-medium text-blue-700"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="space-y-1 border-t border-gray-200 p-3">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive("/settings")
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start px-3 text-gray-600 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </>
  );
}

// ==================================================
// MODAL
// ==================================================

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className={cn(
          "w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl",
          wide ? "max-w-4xl" : "max-w-2xl"
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ==================================================
// FORM FIELD
// ==================================================

function FormField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
  step,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
      />
    </div>
  );
}

// ==================================================
// MODAL ACTIONS
// ==================================================

function ModalActions({
  onCancel,
  onSubmit,
  submitting,
  submitText,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitText: string;
}) {
  return (
    <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-200">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
        {submitText}
      </button>
    </div>
  );
}

// ==================================================
// STAT CARD
// ==================================================

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ==================================================
// DETAIL ROW
// ==================================================

function DetailRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 ${className}`}>
      <span className="text-sm font-medium text-gray-500 sm:w-40">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}