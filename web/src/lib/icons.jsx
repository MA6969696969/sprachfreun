import {
  Home,
  Trophy,
  Flame,
  Settings,
  Languages,
  Backpack,
  Sunrise,
  Hand,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Palette,
  Cloud,
  Compass,
  Clock,
  Eye,
  Stethoscope,
  PartyPopper,
  Plane,
  Briefcase,
  Dumbbell,
  Smartphone,
  CalendarDays,
  TrainFront,
  Smile,
  House,
  Gift,
} from "lucide-react";

// Nav icons — used by AppShell for the persistent tab bar / sidebar.
export const NAV_ICONS = {
  home: Home,
  leaderboard: Trophy,
  streak: Flame,
  settings: Settings,
};

// Course icons, keyed by course id (stable across every language — course
// content is data-driven per id, and the icon is the same regardless of
// which language you're learning).
export const COURSE_ICONS = {
  basics: Languages,
  school: Backpack,
  "daily-life": Sunrise,
  greetings: Hand,
  family: Users,
  food: UtensilsCrossed,
  shopping: ShoppingBag,
  hobbies: Palette,
  weather: Cloud,
  directions: Compass,
  "numbers-time": Clock,
  descriptions: Eye,
  health: Stethoscope,
  weekend: PartyPopper,
  travel: Plane,
  work: Briefcase,
  sports: Dumbbell,
  technology: Smartphone,
  "making-plans": CalendarDays,
  transportation: TrainFront,
  emotions: Smile,
  home: House,
  holidays: Gift,
};

// A small rotating palette of muted colors, assigned per course so
// adjacent nodes on the same category's path don't repeat a hue.
export const COURSE_COLORS = {
  basics: "violet",
  school: "terracotta",
  "daily-life": "amber",
  greetings: "teal",
  family: "green",
  descriptions: "slate",
  food: "amber",
  shopping: "rose",
  directions: "teal",
  travel: "blue",
  transportation: "slate",
  hobbies: "violet",
  weekend: "rose",
  sports: "green",
  technology: "slate",
  "making-plans": "blue",
  holidays: "terracotta",
  weather: "blue",
  "numbers-time": "slate",
  health: "rose",
  work: "amber",
  emotions: "violet",
  home: "green",
};

export function courseColorClass(courseId) {
  const color = COURSE_COLORS[courseId];
  return color ? `icon-${color}` : "";
}

export function CourseIcon({ courseId, size = 22, className }) {
  const Icon = COURSE_ICONS[courseId];
  if (!Icon) return null;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
