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
  CheckCircle2,
  XCircle,
  Eye,
  CreditCard,
  FileText,
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

type Vendor = {
  id: number;
  vendor_name: string;
  service_type: string;
  contact_person: string | null;
  phone_number: string;
  physical_address: string | null;
  is_active: boolean;

  transaction_count: number;
  total_amount: string | number;
  total_paid: string | number;
  total_balance: string | number;

  can_delete: boolean;

  created_at: string;
  updated_at: string;
};

type VendorTransaction = {
  id: number;
  vendor: number;
  vendor_name: string;

  transaction_date: string;
  invoice_number: string | null;
  description: string;

  quantity: string | number | null;
  unit_price: string | number | null;
  total_amount: string | number;

  amount_paid: string | number;
  balance_due: string | number;
  payment_status: string;
  payment_date: string | null;

  remarks: string | null;

  can_delete: boolean;

  created_at: string;
  updated_at: string;
};

// ==================================================
// PAGE
// ==================================================

export default function VendorsPage() {
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

  const [user, setUser] = useState<UserProfile | null>(
    null
  );

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<
    VendorTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [view, setView] = useState<
    "vendors" | "transactions"
  >("vendors");

  // ==================================================
  // VENDOR MODAL
  // ==================================================

  const [showVendorModal, setShowVendorModal] =
    useState(false);

  const [editingVendor, setEditingVendor] =
    useState<Vendor | null>(null);

  const [vendorSubmitting, setVendorSubmitting] =
    useState(false);

  const [vendorForm, setVendorForm] = useState({
    vendor_name: "",
    service_type: "",
    contact_person: "",
    phone_number: "",
    physical_address: "",
    is_active: true,
  });

  // ==================================================
  // TRANSACTION MODAL
  // ==================================================

  const [showTransactionModal, setShowTransactionModal] =
    useState(false);

  const [editingTransaction, setEditingTransaction] =
    useState<VendorTransaction | null>(null);

  const [transactionSubmitting, setTransactionSubmitting] =
    useState(false);

  const [transactionType, setTransactionType] = useState<
    "goods" | "service"
  >("goods");

  const [transactionForm, setTransactionForm] = useState({
    vendor: "",
    transaction_date: new Date()
      .toISOString()
      .split("T")[0],
    invoice_number: "",
    description: "",
    quantity: "",
    unit_price: "",
    total_amount: "",
    amount_paid: "0",
    payment_date: "",
    remarks: "",
  });

  // ==================================================
  // DETAIL MODAL
  // ==================================================

  const [selectedVendor, setSelectedVendor] =
    useState<Vendor | null>(null);

  const [selectedTransaction, setSelectedTransaction] =
    useState<VendorTransaction | null>(null);

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
  // LOAD VENDORS
  // ==================================================

  async function loadVendors(token: string) {
    const response = await fetch(`${API}/vendors/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }

      throw new Error(
        `Failed to load vendors. Server returned ${response.status}.`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Invalid vendor response from server."
      );
    }

    setVendors(data);
  }

  // ==================================================
  // LOAD TRANSACTIONS
  // ==================================================

  async function loadTransactions(token: string) {
    const response = await fetch(
      `${API}/vendors/transactions/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return;
      }

      throw new Error(
        `Failed to load vendor transactions. Server returned ${response.status}.`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Invalid vendor transaction response from server."
      );
    }

    setTransactions(data);
  }

  // ==================================================
  // LOAD EVERYTHING
  // ==================================================

  async function loadVendorsPage() {
    const token = getToken();

    if (!token) {
      router.push("/");
      return;
    }

    try {
      setError("");

      await loadUser(token);

      await Promise.all([
        loadVendors(token),
        loadTransactions(token),
      ]);
    } catch (err: any) {
      console.error(
        "Vendors page error:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while loading vendors."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadVendorsPage();
  }, []);

  // ==================================================
  // REFRESH
  // ==================================================

  async function refreshPage() {
    setRefreshing(true);
    await loadVendorsPage();
  }

  // ==================================================
  // PERMISSIONS
  // ==================================================

  const isAdmin = user?.role === "admin";
  const isDirector =user?.role==="director";

  // ==================================================
  // FORM HELPERS
  // ==================================================

  function resetVendorForm() {
    setVendorForm({
      vendor_name: "",
      service_type: "",
      contact_person: "",
      phone_number: "",
      physical_address: "",
      is_active: true,
    });

    setEditingVendor(null);
  }

  function openCreateVendor() {
    resetVendorForm();
    setShowVendorModal(true);
  }

  function openEditVendor(vendor: Vendor) {
    setEditingVendor(vendor);

    setVendorForm({
      vendor_name: vendor.vendor_name,
      service_type: vendor.service_type,
      contact_person: vendor.contact_person || "",
      phone_number: vendor.phone_number,
      physical_address: vendor.physical_address || "",
      is_active: vendor.is_active,
    });

    setShowVendorModal(true);
  }

  function closeVendorModal() {
    if (vendorSubmitting) return;

    setShowVendorModal(false);
    resetVendorForm();
  }

  // ==================================================
  // CREATE / UPDATE VENDOR
  // ==================================================

  async function saveVendor() {
    const token = getToken();

    if (!token) {
      router.push("/");
      return;
    }

    if (!isAdmin) {
      alert("Only an admin can create or update vendors.");
      return;
    }

    setVendorSubmitting(true);

    try {
      const isEditing = editingVendor !== null;

      const url = isEditing
        ? `${API}/vendors/${editingVendor.id}/update/`
        : `${API}/vendors/create/`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendor_name: vendorForm.vendor_name.trim(),
          service_type: vendorForm.service_type.trim(),
          contact_person:
            vendorForm.contact_person.trim() || null,
          phone_number: vendorForm.phone_number.trim(),
          physical_address:
            vendorForm.physical_address.trim() || null,
          is_active: vendorForm.is_active,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Failed to save vendor. Server returned ${response.status}.`;

        try {
          const data = JSON.parse(responseText);

          if (data.error) {
            message = data.error;
          } else if (typeof data === "object") {
            message = Object.entries(data)
              .map(
                ([key, value]) =>
                  `${key}: ${
                    Array.isArray(value)
                      ? value.join(", ")
                      : value
                  }`
              )
              .join("\n");
          }
        } catch {}

        alert(message);
        return;
      }

      const savedVendor = JSON.parse(responseText);

      if (isEditing) {
        setVendors((previous) =>
          previous.map((vendor) =>
            vendor.id === savedVendor.id
              ? savedVendor
              : vendor
          )
        );
      } else {
        setVendors((previous) => [
          savedVendor,
          ...previous,
        ]);
      }

      closeVendorModal();
    } catch (err) {
      console.error("Vendor save error:", err);

      alert(
        "Something went wrong while saving the vendor."
      );
    } finally {
      setVendorSubmitting(false);
    }
  }

  // ==================================================
  // DELETE VENDOR
  // ==================================================

  async function deleteVendor(vendor: Vendor) {
    const token = getToken();

    if (!token) {
      router.push("/");
      return;
    }

    if (!isDirector) {
      alert("You're unauthorized to delete vendors.");
      return;
    }

    if (!vendor.can_delete) {
      alert(
        "This vendor cannot be deleted because financial transactions exist for this vendor. Deactivate the vendor instead."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete vendor "${vendor.vendor_name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/vendors/${vendor.id}/delete/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Failed to delete vendor. Server returned ${response.status}.`;

        try {
          const data = JSON.parse(responseText);
          message =
            data.error ||
            data.detail ||
            message;
        } catch {}

        alert(message);
        return;
      }

      setVendors((previous) =>
        previous.filter(
          (item) => item.id !== vendor.id
        )
      );
    } catch (err) {
      console.error("Vendor delete error:", err);

      alert(
        "Something went wrong while deleting the vendor."
      );
    }
  }

  // ==================================================
  // TRANSACTION FORM
  // ==================================================

  function resetTransactionForm() {
    setTransactionForm({
      vendor: "",
      transaction_date: new Date()
        .toISOString()
        .split("T")[0],
      invoice_number: "",
      description: "",
      quantity: "",
      unit_price: "",
      total_amount: "",
      amount_paid: "0",
      payment_date: "",
      remarks: "",
    });

    setTransactionType("goods");
    setEditingTransaction(null);
  }

  function openCreateTransaction() {
    resetTransactionForm();
    setShowTransactionModal(true);
  }

  function openEditTransaction(
    transaction: VendorTransaction
  ) {
    setEditingTransaction(transaction);

    const isGoods =
      transaction.quantity !== null &&
      transaction.unit_price !== null;

    setTransactionType(
      isGoods ? "goods" : "service"
    );

    setTransactionForm({
      vendor: String(transaction.vendor),
      transaction_date:
        transaction.transaction_date,
      invoice_number:
        transaction.invoice_number || "",
      description:
        transaction.description || "",
      quantity:
        transaction.quantity !== null
          ? String(transaction.quantity)
          : "",
      unit_price:
        transaction.unit_price !== null
          ? String(transaction.unit_price)
          : "",
      total_amount:
        String(transaction.total_amount),
      amount_paid:
        String(transaction.amount_paid),
      payment_date:
        transaction.payment_date || "",
      remarks:
        transaction.remarks || "",
    });

    setShowTransactionModal(true);
  }

  function closeTransactionModal() {
    if (transactionSubmitting) return;

    setShowTransactionModal(false);
    resetTransactionForm();
  }

  // ==================================================
  // CALCULATED TOTAL
  // ==================================================

  const calculatedTotal = useMemo(() => {
    if (transactionType !== "goods") {
      return Number(
        transactionForm.total_amount || 0
      );
    }

    const quantity = Number(
      transactionForm.quantity || 0
    );

    const unitPrice = Number(
      transactionForm.unit_price || 0
    );

    return quantity * unitPrice;
  }, [
    transactionType,
    transactionForm.quantity,
    transactionForm.unit_price,
    transactionForm.total_amount,
  ]);

  // ==================================================
  // SAVE TRANSACTION
  // ==================================================

  async function saveTransaction() {
    const token = getToken();

    if (!token) {
      router.push("/");
      return;
    }

    if (!isAdmin) {
      alert(
        "Only an admin can create or update transactions."
      );
      return;
    }

    if (!transactionForm.vendor) {
      alert("Please select a vendor.");
      return;
    }

    if (!transactionForm.description.trim()) {
      alert("Please enter a description.");
      return;
    }

    if (transactionType === "goods") {
      if (
        !transactionForm.quantity ||
        Number(transactionForm.quantity) <= 0
      ) {
        alert(
          "Quantity must be greater than zero."
        );
        return;
      }

      if (
        !transactionForm.unit_price ||
        Number(transactionForm.unit_price) <= 0
      ) {
        alert(
          "Unit price must be greater than zero."
        );
        return;
      }
    } else {
      if (
        !transactionForm.total_amount ||
        Number(transactionForm.total_amount) <= 0
      ) {
        alert(
          "Total amount must be greater than zero."
        );
        return;
      }
    }

    const amountPaid = Number(
      transactionForm.amount_paid || 0
    );

    if (amountPaid < 0) {
      alert("Amount paid cannot be negative.");
      return;
    }

    if (amountPaid > calculatedTotal) {
      alert(
        "Amount paid cannot exceed the total amount."
      );
      return;
    }

    if (
      amountPaid > 0 &&
      !transactionForm.payment_date
    ) {
      alert(
        "Payment date is required when amount paid is greater than zero."
      );
      return;
    }

    if (
      amountPaid === 0 &&
      transactionForm.payment_date
    ) {
      alert(
        "Payment date cannot be set when amount paid is zero."
      );
      return;
    }

    setTransactionSubmitting(true);

    try {
      const isEditing =
        editingTransaction !== null;

      const url = isEditing
        ? `${API}/vendors/transactions/${editingTransaction.id}/update/`
        : `${API}/vendors/transactions/create/`;

      const payload: Record<string, any> = {
        vendor: Number(transactionForm.vendor),
        transaction_date:
          transactionForm.transaction_date,
        invoice_number:
          transactionForm.invoice_number.trim() ||
          null,
        description:
          transactionForm.description.trim(),
        amount_paid: amountPaid,
        payment_date:
          transactionForm.payment_date || null,
        remarks:
          transactionForm.remarks.trim() || null,
      };

      if (transactionType === "goods") {
        payload.quantity = Number(
          transactionForm.quantity
        );

        payload.unit_price = Number(
          transactionForm.unit_price
        );
      } else {
        payload.quantity = null;
        payload.unit_price = null;
        payload.total_amount = Number(
          transactionForm.total_amount
        );
      }

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Failed to save transaction. Server returned ${response.status}.`;

        try {
          const data = JSON.parse(responseText);

          if (data.error) {
            message = data.error;
          } else if (typeof data === "object") {
            message = Object.entries(data)
              .map(
                ([key, value]) =>
                  `${key}: ${
                    Array.isArray(value)
                      ? value.join(", ")
                      : value
                  }`
              )
              .join("\n");
          }
        } catch {}

        alert(message);
        return;
      }

      const savedTransaction =
        JSON.parse(responseText);

      if (isEditing) {
        setTransactions((previous) =>
          previous.map((transaction) =>
            transaction.id ===
            savedTransaction.id
              ? savedTransaction
              : transaction
          )
        );
      } else {
        setTransactions((previous) => [
          savedTransaction,
          ...previous,
        ]);
      }

      closeTransactionModal();

      // Refresh vendors because their financial
      // summaries have changed.
      await loadVendors(token);
    } catch (err) {
      console.error(
        "Transaction save error:",
        err
      );

      alert(
        "Something went wrong while saving the transaction."
      );
    } finally {
      setTransactionSubmitting(false);
    }
  }

  // ==================================================
  // DELETE TRANSACTION
  // ==================================================

  async function deleteTransaction(
    transaction: VendorTransaction
  ) {
    const token = getToken();

    if (!token) {
      router.push("/");
      return;
    }

    if (!isAdmin) {
      alert("Only an admin can delete transactions.");
      return;
    }

    if (!transaction.can_delete) {
      alert(
        "This transaction cannot be deleted because a payment has already been recorded."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete transaction "${transaction.description}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/vendors/transactions/${transaction.id}/delete/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Failed to delete transaction. Server returned ${response.status}.`;

        try {
          const data = JSON.parse(responseText);

          message =
            data.error ||
            data.detail ||
            message;
        } catch {}

        alert(message);
        return;
      }

      setTransactions((previous) =>
        previous.filter(
          (item) => item.id !== transaction.id
        )
      );

      await loadVendors(token);
    } catch (err) {
      console.error(
        "Transaction delete error:",
        err
      );

      alert(
        "Something went wrong while deleting the transaction."
      );
    }
  }

  // ==================================================
  // SEARCH
  // ==================================================

  const filteredVendors = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return vendors;

    return vendors.filter(
      (vendor) =>
        vendor.vendor_name
          .toLowerCase()
          .includes(value) ||
        vendor.service_type
          .toLowerCase()
          .includes(value) ||
        (vendor.contact_person || "")
          .toLowerCase()
          .includes(value) ||
        vendor.phone_number
          .toLowerCase()
          .includes(value)
    );
  }, [vendors, search]);

  const filteredTransactions = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return transactions;

    return transactions.filter(
      (transaction) =>
        transaction.vendor_name
          .toLowerCase()
          .includes(value) ||
        transaction.description
          .toLowerCase()
          .includes(value) ||
        (transaction.invoice_number || "")
          .toLowerCase()
          .includes(value) ||
        transaction.payment_status
          .toLowerCase()
          .includes(value)
    );
  }, [transactions, search]);

  // ==================================================
  // STATISTICS
  // ==================================================

  const activeVendors = vendors.filter(
    (vendor) => vendor.is_active
  ).length;

  const inactiveVendors = vendors.filter(
    (vendor) => !vendor.is_active
  ).length;

  const totalPurchases = vendors.reduce(
    (sum, vendor) =>
      sum + Number(vendor.total_amount || 0),
    0
  );

  const totalPaid = vendors.reduce(
    (sum, vendor) =>
      sum + Number(vendor.total_paid || 0),
    0
  );

  const totalOutstanding = vendors.reduce(
    (sum, vendor) =>
      sum + Number(vendor.total_balance || 0),
    0
  );

  // ==================================================
  // FORMAT MONEY
  // ==================================================

  function formatMoney(value: string | number) {
    return Number(value || 0).toLocaleString(
      "en-KE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString(
      "en-KE",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
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

            <span className="font-bold text-gray-900">
              Chuka ERP
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setMobileOpen(!mobileOpen)
            }
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

            <p className="text-gray-600">
              Loading vendors...
            </p>
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

          <span className="font-bold text-gray-900">
            Chuka ERP
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setMobileOpen(!mobileOpen)
          }
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* MOBILE OVERLAY */}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200",
          "lg:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
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
                  <Store className="w-6 h-6 text-blue-600" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Vendors
                  </h1>

                  <p className="text-sm text-gray-500 mt-1">
                    Vendor and procurement management
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
                    className={`w-4 h-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />

                  Refresh
                </button>

                {isAdmin && (
                  <>
                    <button
                      onClick={openCreateVendor}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Vendor
                    </button>

                    <button
                      onClick={openCreateTransaction}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Transaction
                    </button>
                  </>
                )}

              </div>

            </div>

          </div>
        </div>

        {/* CONTENT */}

        <main className="max-w-7xl mx-auto px-6 py-6">

          {/* ERROR */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">

              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />

              <div>
                <p className="font-semibold text-red-800">
                  Unable to load vendors
                </p>

                <p className="text-sm text-red-700 mt-1 whitespace-pre-line">
                  {error}
                </p>
              </div>

            </div>
          )}

          {/* STATS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

            <StatCard
              title="Total Vendors"
              value={vendors.length}
              icon={
                <Store className="w-5 h-5" />
              }
            />

            <StatCard
              title="Active Vendors"
              value={activeVendors}
              icon={
                <CheckCircle2 className="w-5 h-5" />
              }
            />

            <StatCard
              title="Inactive Vendors"
              value={inactiveVendors}
              icon={
                <XCircle className="w-5 h-5" />
              }
            />

            <MoneyStatCard
              title="Total Purchases"
              value={totalPurchases}
              icon={
                <Receipt className="w-5 h-5" />
              }
            />

            <MoneyStatCard
              title="Outstanding"
              value={totalOutstanding}
              icon={
                <CreditCard className="w-5 h-5" />
              }
            />

          </div>

          {/* FINANCIAL SUMMARY */}

          <div className="bg-white rounded-xl border border-blue-100 p-5 mb-6 shadow-sm">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>
                <h2 className="font-semibold text-gray-900">
                  Vendor Financial Summary
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Total amount paid across all vendor transactions
                </p>
              </div>

              <div className="text-right">

                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Total Paid
                </p>

                <p className="text-2xl font-bold text-emerald-600">
                  KES {formatMoney(totalPaid)}
                </p>

              </div>

            </div>

          </div>

          {/* TABLE CONTAINER */}

          <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">

            {/* TABS + SEARCH */}

            <div className="border-b border-gray-200 px-5 pt-5">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                <div className="flex gap-6">

                  <button
                    onClick={() =>
                      setView("vendors")
                    }
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                      view === "vendors"
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  >
                    Vendors
                  </button>

                  <button
                    onClick={() =>
                      setView("transactions")
                    }
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                      view === "transactions"
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  >
                    Transactions
                  </button>

                </div>

                <div className="relative pb-3">

                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />

                  <input
                    type="text"
                    placeholder={
                      view === "vendors"
                        ? "Search vendors..."
                        : "Search transactions..."
                    }
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                  />

                </div>

              </div>

            </div>

            {/* ==================================================
                VENDORS TABLE
            ================================================== */}

            {view === "vendors" && (
              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-blue-50 border-b border-blue-200">

                    <tr>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Vendor
                      </th>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Service Type
                      </th>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Contact
                      </th>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Status
                      </th>

                      <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Transactions
                      </th>

                      <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Total
                      </th>

                      <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Balance
                      </th>

                      <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {filteredVendors.length === 0 ? (

                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-12 text-center text-gray-500"
                        >
                          {search
                            ? "No vendors match your search."
                            : "No vendors found."}
                        </td>
                      </tr>

                    ) : (

                      filteredVendors.map(
                        (vendor) => (
                          <tr
                            key={vendor.id}
                            className="hover:bg-blue-50/50 transition-colors"
                          >

                            <td className="px-5 py-4">

                              <div className="font-semibold text-gray-900">
                                {vendor.vendor_name}
                              </div>

                              {vendor.physical_address && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {vendor.physical_address}
                                </div>
                              )}

                            </td>

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {vendor.service_type}
                            </td>

                            <td className="px-5 py-4">

                              <div className="text-sm text-gray-900">
                                {vendor.contact_person ||
                                  "—"}
                              </div>

                              <div className="text-xs text-gray-500 mt-1">
                                {vendor.phone_number}
                              </div>

                            </td>

                            <td className="px-5 py-4">

                              {vendor.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Inactive
                                </span>
                              )}

                            </td>

                            <td className="px-5 py-4 text-right text-sm font-semibold text-gray-700">
                              {vendor.transaction_count}
                            </td>

                            <td className="px-5 py-4 text-right">

                              <span className="font-semibold text-gray-900">
                                KES{" "}
                                {formatMoney(
                                  vendor.total_amount
                                )}
                              </span>

                              <div className="text-xs text-emerald-600 mt-1">
                                Paid: KES{" "}
                                {formatMoney(
                                  vendor.total_paid
                                )}
                              </div>

                            </td>

                            <td className="px-5 py-4 text-right">

                              <span
                                className={`font-semibold ${
                                  Number(
                                    vendor.total_balance
                                  ) > 0
                                    ? "text-red-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                KES{" "}
                                {formatMoney(
                                  vendor.total_balance
                                )}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <div className="flex justify-end gap-2">

                                <button
                                  onClick={() =>
                                    setSelectedVendor(
                                      vendor
                                    )
                                  }
                                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                                  title="View vendor"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() =>
                                        openEditVendor(
                                          vendor
                                        )
                                      }
                                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                                      title="Edit vendor"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        deleteVendor(
                                          vendor
                                        )
                                      }
                                      disabled={
                                        !vendor.can_delete
                                      }
                                      className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      title={
                                        vendor.can_delete
                                          ? "Delete vendor"
                                          : "Cannot delete vendor with financial history"
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                              </div>

                            </td>

                          </tr>
                        )
                      )

                    )}

                  </tbody>

                </table>

              </div>
            )}

            {/* ==================================================
                TRANSACTIONS TABLE
            ================================================== */}

            {view === "transactions" && (
              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-blue-50 border-b border-blue-200">

                    <tr>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Date
                      </th>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Vendor
                      </th>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Description
                      </th>

                      <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Invoice
                      </th>

                      <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Total
                      </th>

                      <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Paid
                      </th>

                      <th className="text-right px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wider">
                        Balance
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

                    {filteredTransactions.length === 0 ? (

                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-12 text-center text-gray-500"
                        >
                          {search
                            ? "No transactions match your search."
                            : "No vendor transactions found."}
                        </td>
                      </tr>

                    ) : (

                      filteredTransactions.map(
                        (transaction) => (
                          <tr
                            key={transaction.id}
                            className="hover:bg-blue-50/50 transition-colors"
                          >

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {formatDate(
                                transaction.transaction_date
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <div className="font-semibold text-gray-900">
                                {transaction.vendor_name}
                              </div>

                            </td>

                            <td className="px-5 py-4">

                              <div className="font-medium text-gray-900">
                                {transaction.description}
                              </div>

                              {transaction.quantity !==
                                null &&
                                transaction.unit_price !==
                                  null && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {
                                      transaction.quantity
                                    }{" "}
                                    × KES{" "}
                                    {formatMoney(
                                      transaction.unit_price
                                    )}
                                  </div>
                                )}

                            </td>

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {transaction.invoice_number ||
                                "—"}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-gray-900">
                              KES{" "}
                              {formatMoney(
                                transaction.total_amount
                              )}
                            </td>

                            <td className="px-5 py-4 text-right text-emerald-600 font-semibold">
                              KES{" "}
                              {formatMoney(
                                transaction.amount_paid
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">

                              <span
                                className={`font-semibold ${
                                  Number(
                                    transaction.balance_due
                                  ) > 0
                                    ? "text-red-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                KES{" "}
                                {formatMoney(
                                  transaction.balance_due
                                )}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <PaymentStatus
                                status={
                                  transaction.payment_status
                                }
                              />

                            </td>

                            <td className="px-5 py-4">

                              <div className="flex justify-end gap-2">

                                <button
                                  onClick={() =>
                                    setSelectedTransaction(
                                      transaction
                                    )
                                  }
                                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                                  title="View transaction"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() =>
                                        openEditTransaction(
                                          transaction
                                        )
                                      }
                                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100"
                                      title={
                                        transaction.can_delete
                                          ? "Edit transaction"
                                          : "View protected transaction"
                                      }
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        deleteTransaction(
                                          transaction
                                        )
                                      }
                                      disabled={
                                        !transaction.can_delete
                                      }
                                      className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      title={
                                        transaction.can_delete
                                          ? "Delete transaction"
                                          : "Cannot delete after payment"
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                              </div>

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

      {/* ==================================================
          VENDOR FORM MODAL
      ================================================== */}

      {showVendorModal && (
        <Modal
          title={
            editingVendor
              ? "Edit Vendor"
              : "Add New Vendor"
          }
          onClose={closeVendorModal}
        >

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <FormField
              label="Vendor Name"
              required
              value={vendorForm.vendor_name}
              onChange={(value) =>
                setVendorForm((previous) => ({
                  ...previous,
                  vendor_name: value,
                }))
              }
              placeholder="e.g. ABC Supplies Ltd"
            />

            <FormField
              label="Service Type"
              required
              value={vendorForm.service_type}
              onChange={(value) =>
                setVendorForm((previous) => ({
                  ...previous,
                  service_type: value,
                }))
              }
              placeholder="e.g. Farm inputs"
            />

            <FormField
              label="Contact Person"
              value={vendorForm.contact_person}
              onChange={(value) =>
                setVendorForm((previous) => ({
                  ...previous,
                  contact_person: value,
                }))
              }
              placeholder="Contact person name"
            />

            <FormField
              label="Phone Number"
              required
              value={vendorForm.phone_number}
              onChange={(value) =>
                setVendorForm((previous) => ({
                  ...previous,
                  phone_number: value,
                }))
              }
              placeholder="e.g. 0712345678"
            />

            <div className="md:col-span-2">

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Physical Address
              </label>

              <textarea
                value={
                  vendorForm.physical_address
                }
                onChange={(e) =>
                  setVendorForm((previous) => ({
                    ...previous,
                    physical_address:
                      e.target.value,
                  }))
                }
                rows={3}
                placeholder="Vendor physical address"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <div className="md:col-span-2">

              <label className="flex items-center gap-3 cursor-pointer">

                <input
                  type="checkbox"
                  checked={
                    vendorForm.is_active
                  }
                  onChange={(e) =>
                    setVendorForm((previous) => ({
                      ...previous,
                      is_active:
                        e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />

                <span className="text-sm font-medium text-gray-700">
                  Vendor is active
                </span>

              </label>

            </div>

          </div>

          <ModalActions
            onCancel={closeVendorModal}
            onSubmit={saveVendor}
            submitting={vendorSubmitting}
            submitText={
              editingVendor
                ? "Save Changes"
                : "Create Vendor"
            }
          />

        </Modal>
      )}

      {/* ==================================================
          TRANSACTION FORM MODAL
      ================================================== */}

      {showTransactionModal && (
        <Modal
          title={
            editingTransaction
              ? "Edit Vendor Transaction"
              : "Add Vendor Transaction"
          }
          onClose={closeTransactionModal}
          wide
        >

          {editingTransaction &&
            Number(
              editingTransaction.amount_paid
            ) > 0 && (
              <div className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                This transaction has received a payment. Its financial details are protected by the backend and cannot be changed.
              </div>
            )}

          {/* TRANSACTION TYPE */}

          {!editingTransaction && (
            <div className="mb-5">

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>

              <div className="grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setTransactionType(
                      "goods"
                    )
                  }
                  className={`p-3 rounded-lg border text-sm font-semibold ${
                    transactionType ===
                    "goods"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Goods
                  <span className="block text-xs font-normal mt-1">
                    Quantity × Unit Price
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTransactionType(
                      "service"
                    )
                  }
                  className={`p-3 rounded-lg border text-sm font-semibold ${
                    transactionType ===
                    "service"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Service
                  <span className="block text-xs font-normal mt-1">
                    Enter total amount
                  </span>
                </button>

              </div>

            </div>
          )}

          {/* FORM */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* VENDOR */}

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor *
              </label>

              <select
                value={
                  transactionForm.vendor
                }
                onChange={(e) =>
                  setTransactionForm(
                    (previous) => ({
                      ...previous,
                      vendor:
                        e.target.value,
                    })
                  )
                }
                disabled={
                  !!editingTransaction &&
                  Number(
                    editingTransaction.amount_paid
                  ) > 0
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >

                <option value="">
                  Select vendor
                </option>

                {vendors
                  .filter(
                    (vendor) =>
                      vendor.is_active ||
                      String(
                        vendor.id
                      ) ===
                        transactionForm.vendor
                  )
                  .map((vendor) => (
                    <option
                      key={vendor.id}
                      value={vendor.id}
                    >
                      {vendor.vendor_name}
                    </option>
                  ))}

              </select>

            </div>

            {/* DATE */}

            <FormField
              label="Transaction Date"
              required
              type="date"
              value={
                transactionForm.transaction_date
              }
              disabled={
                !!editingTransaction &&
                Number(
                  editingTransaction.amount_paid
                ) > 0
              }
              onChange={(value) =>
                setTransactionForm(
                  (previous) => ({
                    ...previous,
                    transaction_date:
                      value,
                  })
                )
              }
            />

            {/* INVOICE */}

            <FormField
              label="Invoice Number"
              value={
                transactionForm.invoice_number
              }
              onChange={(value) =>
                setTransactionForm(
                  (previous) => ({
                    ...previous,
                    invoice_number:
                      value,
                  })
                )
              }
              placeholder="Invoice number"
            />

            {/* DESCRIPTION */}

            <FormField
              label="Description"
              required
              value={
                transactionForm.description
              }
              onChange={(value) =>
                setTransactionForm(
                  (previous) => ({
                    ...previous,
                    description:
                      value,
                  })
                )
              }
              placeholder="What was purchased?"
            />

            {/* GOODS */}

            {transactionType ===
              "goods" && (
              <>
                <FormField
                  label="Quantity"
                  required
                  type="number"
                  value={
                    transactionForm.quantity
                  }
                  disabled={
                    !!editingTransaction &&
                    Number(
                      editingTransaction.amount_paid
                    ) > 0
                  }
                  onChange={(value) =>
                    setTransactionForm(
                      (previous) => ({
                        ...previous,
                        quantity:
                          value,
                      })
                    )
                  }
                  placeholder="0"
                />

                <FormField
                  label="Unit Price"
                  required
                  type="number"
                  value={
                    transactionForm.unit_price
                  }
                  disabled={
                    !!editingTransaction &&
                    Number(
                      editingTransaction.amount_paid
                    ) > 0
                  }
                  onChange={(value) =>
                    setTransactionForm(
                      (previous) => ({
                        ...previous,
                        unit_price:
                          value,
                      })
                    )
                  }
                  placeholder="0.00"
                />
              </>
            )}

            {/* SERVICE TOTAL */}

            {transactionType ===
              "service" && (
              <FormField
                label="Total Amount"
                required
                type="number"
                value={
                  transactionForm.total_amount
                }
                disabled={
                  !!editingTransaction &&
                  Number(
                    editingTransaction.amount_paid
                  ) > 0
                }
                onChange={(value) =>
                  setTransactionForm(
                    (previous) => ({
                      ...previous,
                      total_amount:
                        value,
                    })
                  )
                }
                placeholder="0.00"
              />
            )}

            {/* TOTAL DISPLAY */}

            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">

              <p className="text-xs text-blue-700 font-medium uppercase">
                Total Amount
              </p>

              <p className="text-xl font-bold text-blue-800 mt-1">
                KES{" "}
                {formatMoney(
                  calculatedTotal
                )}
              </p>

            </div>

            {/* AMOUNT PAID */}

            <FormField
              label="Amount Paid"
              type="number"
              value={
                transactionForm.amount_paid
              }
              disabled={
                !!editingTransaction &&
                Number(
                  editingTransaction.amount_paid
                ) > 0
              }
              onChange={(value) =>
                setTransactionForm(
                  (previous) => ({
                    ...previous,
                    amount_paid:
                      value,
                  })
                )
              }
              placeholder="0.00"
            />

            {/* PAYMENT DATE */}

            <FormField
              label="Payment Date"
              type="date"
              value={
                transactionForm.payment_date
              }
              disabled={
                !!editingTransaction &&
                Number(
                  editingTransaction.amount_paid
                ) > 0
              }
              onChange={(value) =>
                setTransactionForm(
                  (previous) => ({
                    ...previous,
                    payment_date:
                      value,
                  })
                )
              }
            />

            {/* BALANCE */}

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">

              <p className="text-xs text-gray-500 font-medium uppercase">
                Balance Due
              </p>

              <p className="text-xl font-bold text-gray-900 mt-1">
                KES{" "}
                {formatMoney(
                  Math.max(
                    calculatedTotal -
                      Number(
                        transactionForm.amount_paid ||
                          0
                      ),
                    0
                  )
                )}
              </p>

            </div>

            {/* REMARKS */}

            <div className="md:col-span-2">

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>

              <textarea
                value={
                  transactionForm.remarks
                }
                onChange={(e) =>
                  setTransactionForm(
                    (previous) => ({
                      ...previous,
                      remarks:
                        e.target.value,
                    })
                  )
                }
                rows={3}
                placeholder="Optional remarks"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

          </div>

          <ModalActions
            onCancel={closeTransactionModal}
            onSubmit={saveTransaction}
            submitting={transactionSubmitting}
            submitText={
              editingTransaction
                ? "Save Changes"
                : "Create Transaction"
            }
          />

        </Modal>
      )}

      {/* ==================================================
          VENDOR DETAILS
      ================================================== */}

      {selectedVendor && (
        <Modal
          title="Vendor Details"
          onClose={() =>
            setSelectedVendor(null)
          }
        >

          <div className="space-y-4">

            <DetailRow
              label="Vendor Name"
              value={
                selectedVendor.vendor_name
              }
            />

            <DetailRow
              label="Service Type"
              value={
                selectedVendor.service_type
              }
            />

            <DetailRow
              label="Contact Person"
              value={
                selectedVendor.contact_person ||
                "—"
              }
            />

            <DetailRow
              label="Phone"
              value={
                selectedVendor.phone_number
              }
            />

            <DetailRow
              label="Physical Address"
              value={
                selectedVendor.physical_address ||
                "—"
              }
            />

            <DetailRow
              label="Status"
              value={
                selectedVendor.is_active
                  ? "Active"
                  : "Inactive"
              }
            />

            <div className="border-t border-gray-200 pt-4">

              <h3 className="font-semibold text-gray-900 mb-3">
                Financial Summary
              </h3>

              <div className="grid grid-cols-3 gap-3">

                <SummaryBox
                  label="Transactions"
                  value={
                    selectedVendor.transaction_count
                  }
                />

                <SummaryBox
                  label="Total"
                  value={`KES ${formatMoney(
                    selectedVendor.total_amount
                  )}`}
                />

                <SummaryBox
                  label="Balance"
                  value={`KES ${formatMoney(
                    selectedVendor.total_balance
                  )}`}
                />

              </div>

            </div>

          </div>

        </Modal>
      )}

      {/* ==================================================
          TRANSACTION DETAILS
      ================================================== */}

      {selectedTransaction && (
        <Modal
          title="Transaction Details"
          onClose={() =>
            setSelectedTransaction(null)
          }
        >

          <div className="space-y-4">

            <DetailRow
              label="Vendor"
              value={
                selectedTransaction.vendor_name
              }
            />

            <DetailRow
              label="Date"
              value={formatDate(
                selectedTransaction.transaction_date
              )}
            />

            <DetailRow
              label="Invoice Number"
              value={
                selectedTransaction.invoice_number ||
                "—"
              }
            />

            <DetailRow
              label="Description"
              value={
                selectedTransaction.description
              }
            />

            {selectedTransaction.quantity !==
              null && (
              <DetailRow
                label="Quantity"
                value={String(
                  selectedTransaction.quantity
                )}
              />
            )}

            {selectedTransaction.unit_price !==
              null && (
              <DetailRow
                label="Unit Price"
                value={`KES ${formatMoney(
                  selectedTransaction.unit_price
                )}`}
              />
            )}

            <DetailRow
              label="Total Amount"
              value={`KES ${formatMoney(
                selectedTransaction.total_amount
              )}`}
            />

            <DetailRow
              label="Amount Paid"
              value={`KES ${formatMoney(
                selectedTransaction.amount_paid
              )}`}
            />

            <DetailRow
              label="Balance Due"
              value={`KES ${formatMoney(
                selectedTransaction.balance_due
              )}`}
            />

            <DetailRow
              label="Payment Status"
              value={
                selectedTransaction.payment_status
              }
            />

            <DetailRow
              label="Payment Date"
              value={
                selectedTransaction.payment_date
                  ? formatDate(
                      selectedTransaction.payment_date
                    )
                  : "—"
              }
            />

            <DetailRow
              label="Remarks"
              value={
                selectedTransaction.remarks ||
                "—"
              }
            />

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

            <div className="font-bold text-gray-900">
              Chuka ERP
            </div>

            <div className="text-[11px] text-gray-500">
              Enterprise Management
            </div>

          </div>

        </div>

      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">

        <div className="space-y-1">

          {navigation.map((item) => {

            const Icon = item.icon;

            if (item.href) {

              const active =
                isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() =>
                    setMobileOpen(false)
                  }
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

            const isOpen =
              openSections[item.label];

            const hasActiveChild =
              item.children?.some(
                (child) =>
                  isActive(child.href)
              );

            return (
              <div key={item.label}>

                <button
                  type="button"
                  onClick={() =>
                    toggleSection(
                      item.label
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >

                  <Icon className="h-4 w-4" />

                  <span className="flex-1 text-left">
                    {item.label}
                  </span>

                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}

                </button>

                {isOpen &&
                  item.children && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">

                      {item.children.map(
                        (child) => {

                          const ChildIcon =
                            child.icon;

                          const active =
                            isActive(
                              child.href
                            );

                          return (
                            <Link
                              key={
                                child.href
                              }
                              href={
                                child.href
                              }
                              onClick={() =>
                                setMobileOpen(
                                  false
                                )
                              }
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                active
                                  ? "bg-blue-50 font-medium text-blue-700"
                                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              <ChildIcon className="h-4 w-4" />
                              <span>
                                {child.label}
                              </span>
                            </Link>
                          );
                        }
                      )}

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
          onClick={() =>
            setMobileOpen(false)
          }
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
          wide
            ? "max-w-4xl"
            : "max-w-2xl"
        )}
      >

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">

          <h2 className="text-lg font-bold text-gray-900">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

        <div className="p-6">
          {children}
        </div>

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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>

      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && (
          <span className="text-red-500 ml-1">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
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
        {submitting && (
          <RefreshCw className="w-4 h-4 animate-spin" />
        )}

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
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-gray-500 font-medium">
            {title}
          </p>

          <p className="text-2xl font-bold text-gray-900 mt-1">
            {value}
          </p>

        </div>

        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>

      </div>

    </div>
  );
}

// ==================================================
// MONEY STAT CARD
// ==================================================

function MoneyStatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-gray-500 font-medium">
            {title}
          </p>

          <p className="text-lg font-bold text-gray-900 mt-1">
            KES{" "}
            {value.toLocaleString(
              "en-KE",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </p>

        </div>

        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>

      </div>

    </div>
  );
}

// ==================================================
// PAYMENT STATUS
// ==================================================

function PaymentStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  if (
    normalized.includes("paid") &&
    !normalized.includes("partial")
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  }

  if (
    normalized.includes("partial")
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      {status}
    </span>
  );
}

// ==================================================
// DETAIL ROW
// ==================================================

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">

      <span className="text-sm font-medium text-gray-500 sm:w-40">
        {label}
      </span>

      <span className="text-sm text-gray-900 font-medium">
        {value}
      </span>

    </div>
  );
}

// ==================================================
// SUMMARY BOX
// ==================================================

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="font-bold text-gray-900 mt-1 text-sm">
        {value}
      </p>

    </div>
  );
}