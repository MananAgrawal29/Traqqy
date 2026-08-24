/**
 * TraqqyBrand — canonical brand rendering using the cleaned Traqqy assets.
 *
 * variant="wordmark" → traqqy-wordmark.png (the red hand-drawn wordmark, transparent)
 * variant="symbol"   → traqqy-symbol.png  (the atomic symbol, transparent)
 */

import { motion } from "framer-motion";

type TraqqyBrandProps = {
  variant?: "wordmark" | "symbol";
  size?: number;
  className?: string;
  animate?: boolean;
  draggable?: boolean;
};

export function TraqqyBrand({
  variant = "wordmark",
  size,
  className = "",
  animate = true,
  draggable = false,
}: TraqqyBrandProps) {
  const src = variant === "wordmark" ? "/traqqy-wordmark.png" : "/traqqy-symbol.png";
  const alt = "Traqqy";

  const h = size ?? (variant === "wordmark" ? 28 : 24);

  const imgProps = {
    src,
    alt,
    draggable,
    className: `object-contain ${className}`,
    style: { height: h, width: "auto" } as React.CSSProperties,
  };

  if (animate) {
    return (
      <motion.img
        {...imgProps}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      />
    );
  }

  return <img {...imgProps} />;
}
