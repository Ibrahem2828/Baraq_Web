import type { LucideIcon } from "lucide-react";
import {
  Home,
  Sparkles,
  Library,
  CalendarCheck,
  ListChecks,
  FolderKanban,
  TrendingUp,
  FileText,
  Mic,
  Bell,
  CreditCard,
  LifeBuoy,
  School,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Shown only in the primary (bottom nav / top sidebar) set. */
  primary?: boolean;
}

/** Central nav route contract — mirrors the mobile app's bottom tabs + app stack grouping. */
// `primary` mirrors the mobile app's 5 bottom tabs exactly (MainTabNavigator.tsx):
// Home, Plans (Study Plans), Quizzes, Library (Sources), Account (Settings).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.home", icon: Home, primary: true },
  { href: "/characters", labelKey: "nav.characters", icon: Sparkles },
  { href: "/library", labelKey: "nav.library", icon: Library, primary: true },
  { href: "/study-plans", labelKey: "nav.studyPlans", icon: CalendarCheck, primary: true },
  { href: "/quizzes", labelKey: "nav.quizzes", icon: ListChecks, primary: true },
  { href: "/projects", labelKey: "nav.projects", icon: FolderKanban },
  { href: "/recommendations", labelKey: "nav.recommendations", icon: TrendingUp },
  { href: "/summaries", labelKey: "nav.summaries", icon: FileText },
  { href: "/transcriptions", labelKey: "nav.transcriptions", icon: Mic },
  { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { href: "/subscription", labelKey: "nav.subscription", icon: CreditCard },
  { href: "/join", labelKey: "nav.join", icon: School },
  { href: "/support", labelKey: "nav.support", icon: LifeBuoy },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, primary: true },
];

export const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter((item) => item.primary);
