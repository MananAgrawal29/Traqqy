"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

// ── Hand-drawn doodle SVG elements ─────────────────────────────────────────
// These are inline SVGs styled to look like pen sketches.

export function DoodleCircle({
  className = "",
  color = "currentColor",
  size = 40,
  strokeWidth = 1.5,
}: {
  className?: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 4C28.84 4 36 11.16 36 20C36 28.84 28.84 36 20 36C11.16 36 4 28.84 4 20C4 11.16 11.16 4 20 4Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="3 2"
        opacity="0.4"
      />
    </svg>
  );
}

export function DoodleArrow({
  className = "",
  color = "currentColor",
  width = 60,
  height = 24,
}: {
  className?: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 18C12 16 20 10 30 12C40 14 48 8 56 6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M50 4L56 6L52 10"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function DoodleLoop({
  className = "",
  color = "currentColor",
  size = 32,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 4C22 4 28 8 28 14C28 20 22 24 16 24C10 24 4 20 4 14C4 8 10 4 16 4Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="4 3"
        opacity="0.3"
      />
      <path
        d="M16 24V28"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

export function DoodleStar({
  className = "",
  color = "currentColor",
  size = 20,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8L10 2Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}

export function DoodleCheck({
  className = "",
  color = "currentColor",
  size = 20,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 10L8 14L16 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}

export function DoodleRupee({
  className = "",
  color = "currentColor",
  size = 18,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <text
        x="2"
        y="14"
        fontSize="14"
        fontFamily="serif"
        fill={color}
        opacity="0.25"
      >
        ₹
      </text>
    </svg>
  );
}

export function DoodleCalendar({
  className = "",
  color = "currentColor",
  size = 24,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth={1.2}
        opacity="0.3"
      />
      <path
        d="M3 9H21"
        stroke={color}
        strokeWidth={1.2}
        opacity="0.3"
      />
      <path
        d="M8 3V6"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M16 3V6"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity="0.3"
      />
      <circle cx="9" cy="14" r="1" fill={color}        opacity="0.35" />
      <circle cx="12" cy="14" r="1" fill={color}        opacity="0.35" />
      <circle cx="15" cy="14" r="1" fill={color}        opacity="0.35" />
    </svg>
  );
}

// ── Animated sparkle ───────────────────────────────────────────────────────

export function Sparkle({
  className = "",
  color = "hsl(38 90% 55%)",
  size = 16,
  delay = 0,
}: {
  className?: string;
  color?: string;
  size?: number;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0, rotate: -30 }}
      animate={
        inView
          ? { opacity: [0, 1, 0.6, 1], scale: [0, 1.2, 0.9, 1], rotate: [-30, 10, -5, 0] }
          : {}
      }
      transition={{ duration: 0.6, ease, delay, times: [0, 0.3, 0.7, 1] }}
    >
      <path
        d="M8 1L9.5 6L14.5 8L9.5 10L8 15L6.5 10L1.5 8L6.5 6L8 1Z"
        fill={color}
      />
    </motion.svg>
  );
}

// ── Ambient glow ───────────────────────────────────────────────────────────

export function AmbientGlow({
  className = "",
  color = "hsl(38 90% 55%)",
  intensity = 0.12,
  size = 300,
}: {
  className?: string;
  color?: string;
  intensity?: number;
  size?: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: intensity,
        filter: "blur(60px)",
      }}
    />
  );
}

// ── Animated glow ring (for product preview emphasis) ──────────────────────

export function GlowRing({
  className = "",
  color = "hsl(38 90% 55%)",
}: {
  className?: string;
  color?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={`pointer-events-none absolute inset-0 rounded-2xl ${className}`}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 1.2, ease }}
      style={{
        boxShadow: `0 0 60px -12px ${color}33, 0 0 120px -24px ${color}22`,
      }}
    />
  );
}

// ── Floating doodle cluster (positions multiple doodles) ───────────────────

export function FloatingDoodles({
  className = "",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <div ref={ref} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1.5, ease }}
        className="relative w-full h-full"
      >
        <DoodleRupee className="absolute top-[15%] left-[8%]" color={color} size={16} />
        <DoodleRupee className="absolute top-[25%] right-[12%]" color={color} size={12} />
        <DoodleStar className="absolute top-[10%] right-[20%]" color={color} size={14} />
        <DoodleStar className="absolute bottom-[20%] left-[15%]" color={color} size={10} />
        <DoodleLoop className="absolute bottom-[15%] right-[8%]" color={color} size={20} />
        <DoodleCheck className="absolute top-[40%] left-[5%]" color={color} size={14} />
      </motion.div>
    </div>
  );
}
