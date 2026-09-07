"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  DollarSign,
  FileText,
  UserCog,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "director" | "admin" | "manager";

type ChildItem = {
  label: string;
  href: string;
  icon: ElementType;
  roles: Role[];
};

type NavItem = {
  label: string;
  href?: string;
  icon: ElementType;
  roles: Role[];
  children?: ChildItem[];
};

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["director", "admin", "manager"],
  },


  { label: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["director", "admin", "manager"],
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: CalendarDays,
    roles: ["director", "admin", "manager"],
  },
  

  {
    label: "Vendors",
    href: "/vendors",
    icon: Store,
    roles: ["director", "admin", "manager"],
  },
        

  {
    label: "Expenses",
    href: "/expenses",
    icon: Receipt,
    roles: ["director", "admin", "manager"],
  },
  
  

  {
    label: "Vehicles",
    href: "/vehicles",
    icon: Truck,
    roles: ["director", "admin", "manager"],
  },
  {
    label: "Fuel",
    href: "/fuel",
    icon: Fuel,
    roles: ["director", "admin", "manager"],
  },
  
  

  {
    label: "Payroll",
    href: "/payroll",
    icon: WalletCards,
    roles: ["director"],
  },


  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    roles: ["director"],
  },

];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [openSections, setOpenSections] = useState<
    Record<string, boolean>
  >({
    "Human Resources": true,
    Procurement: true,
    Fleet: true,
    Finance: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/");
        return;
      }

      try {
        const api =
          process.env.NEXT_PUBLIC_API_URL ||
          "http://127.0.0.1:8000/api";

        const response = await fetch(`${api}/me/`, {
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

          throw new Error("Failed to load current user.");
        }

        const user = await response.json();

        if (mounted) {
          setRole(user.role);
        }
      } catch (error) {
        console.error(
          "Failed to load sidebar permissions:",
          error
        );
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  function canAccess(roles: Role[]) {
    if (!role) return false;

    return roles.includes(role);
  }

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

  /*
   * Filter navigation according to the authenticated
   * user's backend role permissions.
   *
   * Parent sections with no permitted children are
   * removed completely.
   */
  const visibleNavigation = navigation
    .map((item) => {
      if (item.href) {
        return canAccess(item.roles) ? item : null;
      }

      const visibleChildren =
        item.children?.filter((child) =>
          canAccess(child.roles)
        ) || [];

      if (visibleChildren.length === 0) {
        return null;
      }

      return {
        ...item,
        children: visibleChildren,
      };
    })
    .filter(
      (item): item is NavItem => item !== null
    );

  /*
   * Prevent an unauthorized user from manually visiting
   * a route through the sidebar.
   *
   * The backend still remains the real security boundary.
   */
  useEffect(() => {
    if (authLoading || !role) return;

    const currentItem = navigation.find(
      (item) =>
        item.href && isActive(item.href)
    );

    if (currentItem && !canAccess(currentItem.roles)) {
      router.push("/dashboard");
      return;
    }

    for (const item of navigation) {
      const child = item.children?.find((child) =>
        isActive(child.href)
      );

      if (child && !canAccess(child.roles)) {
        router.push("/dashboard");
        return;
      }
    }
  }, [pathname, role, authLoading]);

  if (authLoading) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>

            <span className="font-bold text-gray-900">
              Chuka ERP
            </span>
          </div>
        </div>

        <aside className="fixed left-0 top-0 bottom-0 z-50 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
          <SidebarBrand />
        </aside>
      </>
    );
  }

  return (
    <>
      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

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
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200",
          "lg:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        )}
      >
        <SidebarBrand />

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;

              {/* ============================================
                  SIMPLE NAVIGATION LINK
              ============================================ */}

              if (item.href) {
                const active = isActive(item.href);

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

              {/* ============================================
                  COLLAPSIBLE SECTION
              ============================================ */}

              const isOpen =
                openSections[item.label];

              const hasActiveChild =
                item.children?.some((child) =>
                  isActive(child.href)
                );

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSection(item.label)
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

                  {isOpen && item.children && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3">
                      {item.children.map((child) => {
                        const ChildIcon =
                          child.icon;

                        const active =
                          isActive(child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() =>
                              setMobileOpen(false)
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
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* =================================================
            BOTTOM ACTIONS
        ================================================= */}

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
      </aside>
    </>
  );
}

// =====================================================
// SIDEBAR BRAND
// =====================================================

function SidebarBrand() {
  return (
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
  );
}