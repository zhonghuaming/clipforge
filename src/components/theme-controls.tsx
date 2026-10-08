"use client";

import { useEffect } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useThemeStore, type ThemeMode } from "@/lib/stores/theme-store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemeInitializer() {
  const mode = useThemeStore((state) => state.mode);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", mode === "dark" || (mode === "system" && media.matches));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);
  return null;
}

export function ThemeToggle() {
  const locale = useLocale();
  const { mode, setMode } = useThemeStore();
  const title = locale === "zh" ? "主题" : "Theme";
  const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: locale === "zh" ? "明亮" : "Light", icon: Sun },
    { value: "dark", label: locale === "zh" ? "深色" : "Dark", icon: Moon },
    { value: "system", label: locale === "zh" ? "跟随系统" : "System", icon: Monitor },
  ];
  const Icon = mode === "dark" ? Moon : mode === "system" ? Monitor : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={title} title={title} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <Icon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {options.map(({ value, label, icon: OptionIcon }) => (
          <DropdownMenuItem key={value} onClick={() => setMode(value)}>
            <OptionIcon className="h-4 w-4" /><span className="flex-1">{label}</span>{mode === value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
