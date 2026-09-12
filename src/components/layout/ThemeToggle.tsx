"use client";

import { Sun, Moon, Flame, MonitorSmartphone } from "lucide-react";
import {
  useThemeStore,
  useHasHydratedThemeStore,
  type ThemePreference,
} from "@/stores/theme-store";
import { Dropdown } from "@/components/ui/Dropdown";
import { IconButton } from "@/components/ui/IconButton";

const ICONS: Record<ThemePreference, typeof Sun> = {
  system: MonitorSmartphone,
  light: Sun,
  dark: Moon,
  fire: Flame,
};

export function ThemeToggle({ labels }: { labels: Record<ThemePreference, string> }) {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const hasHydrated = useHasHydratedThemeStore();

  const displayedPreference = hasHydrated ? preference : "system";
  const Icon = ICONS[displayedPreference];

  return (
    <Dropdown
      trigger={
        <IconButton aria-label={labels[displayedPreference]} size="sm">
          <Icon className="size-4" aria-hidden="true" />
        </IconButton>
      }
      selectedValue={displayedPreference}
      onSelect={(value) => setPreference(value as ThemePreference)}
      items={(Object.keys(ICONS) as ThemePreference[]).map((key) => ({
        value: key,
        label: labels[key],
      }))}
    />
  );
}
