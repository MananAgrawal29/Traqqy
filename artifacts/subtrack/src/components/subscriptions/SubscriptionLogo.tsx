import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { stringToColor } from "./CatalogPicker";

export type LogoSize = "sm" | "md" | "lg" | "xl";

interface SubscriptionLogoProps {
  name: string;
  icon?: string | null;
  size?: LogoSize;
  className?: string;
}

interface CachedIcon {
  path: string;
  viewBox: string;
  title: string;
}

const iconCache = new Map<string, CachedIcon | null>();

const sizeClasses: Record<LogoSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const fallbackTextClasses: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

async function loadIcon(slug: string): Promise<CachedIcon | null> {
  if (iconCache.has(slug)) return iconCache.get(slug)!;

  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/${slug}.svg`
    );
    if (!res.ok) {
      iconCache.set(slug, null);
      return null;
    }
    const svg = await res.text();
    const pathMatch = svg.match(/<path d="([^"]+)"/);
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    const titleMatch = svg.match(/<title>([^<]+)<\/title>/);
    if (!pathMatch || !viewBoxMatch) {
      iconCache.set(slug, null);
      return null;
    }
    const result: CachedIcon = {
      path: pathMatch[1],
      viewBox: viewBoxMatch[1],
      title: titleMatch?.[1] ?? slug,
    };
    iconCache.set(slug, result);
    return result;
  } catch {
    iconCache.set(slug, null);
    return null;
  }
}

export default function SubscriptionLogo({
  name,
  icon,
  size = "md",
  className,
}: SubscriptionLogoProps) {
  const [svg, setSvg] = useState<CachedIcon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const normalizedIcon = useMemo(() => {
    if (!icon) return null;
    return icon.trim().toLowerCase();
  }, [icon]);

  useEffect(() => {
    if (!normalizedIcon) {
      setSvg(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    loadIcon(normalizedIcon).then((data) => {
      if (cancelled) return;
      setSvg(data);
      setError(!data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedIcon]);

  const initial = name.charAt(0).toUpperCase() || "?";

  if (!normalizedIcon || error || loading) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "rounded-full flex items-center justify-center font-bold text-white shrink-0",
          fallbackTextClasses[size],
          className
        )}
        style={{ backgroundColor: stringToColor(name) }}
        aria-label={name}
      >
        {initial}
      </div>
    );
  }

  return (
    <svg
      className={cn(sizeClasses[size], "shrink-0", className)}
      viewBox={svg?.viewBox ?? "0 0 24 24"}
      fill="currentColor"
      role="img"
      aria-label={svg?.title ?? name}
    >
      <path d={svg?.path ?? ""} />
    </svg>
  );
}
