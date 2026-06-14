/**
 * src/lib/apps.ts — Single source of truth for the Rizq app registry.
 * Server-safe module: no JSX, no client imports.
 * All icon names have been verified against lucide-react's exported set.
 */
import {
  LayoutDashboard,
  FileText,
  Users,
  CalendarDays,
  TrendingUp,
  ReceiptText,
  Calculator,
  Tag,
  Target,
  FolderOpen,
  BookOpen,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type AppGroup = "home" | "work" | "money" | "tools" | "account";

export type AppDef = {
  id: string;
  href: string;
  icon: LucideIcon;
  group: AppGroup;
  /** Whether to show this item in the sidebar. Upgrade chip is top-bar only. */
  sidebar: boolean;
};

export const APPS: AppDef[] = [
  // ── home ───────────────────────────────────────────────────────────────────
  {
    id: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "home",
    sidebar: true,
  },
  // ── work ───────────────────────────────────────────────────────────────────
  {
    id: "proposals",
    href: "/proposals",
    icon: FileText,
    group: "work",
    sidebar: true,
  },
  {
    id: "clients",
    href: "/clients",
    icon: Users,
    group: "work",
    sidebar: true,
  },
  {
    id: "calendar",
    href: "/calendar",
    icon: CalendarDays,
    group: "work",
    sidebar: true,
  },
  // ── money ──────────────────────────────────────────────────────────────────
  {
    id: "income",
    href: "/income",
    icon: TrendingUp, // TrendingUp confirmed in lucide-react
    group: "money",
    sidebar: true,
  },
  {
    id: "invoices",
    href: "/invoices",
    icon: ReceiptText, // ReceiptText confirmed in lucide-react
    group: "money",
    sidebar: true,
  },
  {
    id: "rate-calculator",
    href: "/rate-calculator",
    icon: Calculator,
    group: "money",
    sidebar: true,
  },
  // ── tools ──────────────────────────────────────────────────────────────────
  {
    id: "tool",
    href: "/tool",
    icon: Tag, // Tag confirmed; original spec said Tag or Search — Tag fits "pricing tool"
    group: "tools",
    sidebar: true,
  },
  {
    id: "hadaf",
    href: "/hadaf",
    icon: Target,
    group: "tools",
    sidebar: true,
  },
  {
    id: "documents",
    href: "/documents",
    icon: FolderOpen,
    group: "tools",
    sidebar: true,
  },
  {
    id: "methodology",
    href: "/methodology",
    icon: BookOpen,
    group: "tools",
    sidebar: true,
  },
  // ── account ────────────────────────────────────────────────────────────────
  {
    id: "settings",
    href: "/settings",
    icon: Settings,
    group: "account",
    sidebar: true,
  },
  {
    id: "upgrade",
    href: "/upgrade",
    icon: Sparkles,
    group: "account",
    sidebar: false, // top-bar chip only
  },
];
