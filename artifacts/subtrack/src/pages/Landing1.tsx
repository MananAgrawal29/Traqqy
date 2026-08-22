"use client";

import type React from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
  useMotionValueEvent,
} from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Mail, MessageSquare, Moon, ShieldCheck, Sun } from "lucide-react";
import {
  Sparkle,
  AmbientGlow,
  GlowRing,
  DoodleCircle,
  DoodleStar,
  DoodleRupee,
  DoodleArrow,
  DoodleCalendar,
  DoodleCheck,
} from "@/components/doodles";
import WalletAnimation from "@/components/WalletAnimation";

/* ═══════════════════════════════════════════════════════════════════════════
   THEME (syncs with app ThemeProvider)
   ═══════════════════════════════════════════════════════════════════════════ */

type Theme = "light" | "dark";

function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("subtrack-theme") || localStorage.getItem("traqqy-theme")) as Theme | null;
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = stored ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("subtrack-theme", next);
      return next;
    });
  }, []);

  return { theme, toggle, mounted };
}

function ThemeToggle({ theme, toggle, mounted }: ReturnType<typeof useTheme>) {
  const isDark = theme === "dark";
  return (
    <button type="button" onClick={toggle} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 dark:text-zinc-400 text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5">
      {mounted && (
        <motion.span key={theme} initial={{ opacity: 0, rotate: -90, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex items-center justify-center">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATION HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const ease = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

function Reveal({ children, className, delay = 0, amount = 0.2 }: {
  children: React.ReactNode; className?: string; delay?: number; amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease, delay }}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION DIVIDER — visual connector between sections
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionDivider({ doodle = "dot" }: { doodle?: "dot" | "line" | "star" | "rupee" }) {
  return (
    <div className="flex justify-center py-4" aria-hidden="true">
      <Reveal>
        {doodle === "dot" && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        )}
        {doodle === "line" && (
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        )}
        {doodle === "star" && (
          <DoodleStar size={14} color="hsl(38 90% 55%)" />
        )}
        {doodle === "rupee" && (
          <DoodleRupee size={14} color="hsl(38 90% 55%)" />
        )}
      </Reveal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */

const GITHUB_URL = "https://github.com/MananAgrawal29/Traqqy";
const SIGN_UP = "/sign-up";
const SIGN_IN = "/sign-in";

function Nav({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 100], [0, 0.95]);
  const [bgVal, setBgVal] = useState(0);
  useMotionValueEvent(bg, "change", (v) => setBgVal(v));
  const isDark = theme.theme === "dark";

  return (
    <motion.header className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{ backgroundColor: isDark ? `rgba(9,9,11,${bgVal})` : `rgba(255,255,255,${bgVal})`, backdropFilter: `blur(${Math.min(bgVal * 20, 16)}px)` }}>
      <div className="absolute inset-0 border-b border-zinc-200/60 dark:border-white/[0.06]" style={{ opacity: bgVal }} />
      <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 group">
          <motion.img src="/logo-icon.svg" alt="Traqqy" className="h-7 w-7" whileHover={{ scale: 1.08, rotate: -4 }} transition={spring} draggable={false} />
          <span className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Traqqy</span>
        </a>
        <div className="hidden items-center gap-1 md:flex">
          {[{ l: "Features", h: "#features" }, { l: "GitHub", h: GITHUB_URL }].map((n) => (
            <a key={n.l} href={n.h} className="rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">{n.l}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle {...theme} />
          <a href={SIGN_IN} className="hidden rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 sm:inline-flex">Sign In</a>
          <motion.a href={SIGN_UP} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-shadow hover:shadow-md hover:shadow-primary/30">
            Get Started <span className="text-primary-foreground/60">→</span>
          </motion.a>
        </div>
      </nav>
    </motion.header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAPTER 1: HERO — Clean, confident, typographic
   ═══════════════════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-36 pb-16 sm:px-6 sm:pt-44 lg:pb-20">
      <AmbientGlow className="top-[-80px] left-1/2 -translate-x-1/2" size={600} intensity={0.06} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-[radial-gradient(50%_100%_at_50%_0%,rgba(217,130,30,0.06),transparent_70%)]" />

      <div className="mx-auto max-w-3xl text-center relative">
        {/* Dense scattered doodles — subtle visual texture across the hero */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ delay: 1.5, duration: 1 }} className="absolute top-[10%] left-[5%]"><DoodleRupee size={18} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 1.8, duration: 1 }} className="absolute top-[15%] right-[12%]"><DoodleStar size={16} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} transition={{ delay: 2, duration: 1 }} className="absolute top-[25%] left-[18%]"><DoodleCalendar size={20} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 2.2, duration: 1 }} className="absolute top-[30%] right-[5%]"><DoodleArrow width={50} height={20} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} transition={{ delay: 1.6, duration: 1 }} className="absolute top-[45%] left-[3%]"><DoodleCircle size={22} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 2.4, duration: 1 }} className="absolute top-[50%] right-[18%]"><DoodleRupee size={14} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 1.9, duration: 1 }} className="absolute top-[60%] left-[12%]"><DoodleStar size={12} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 2.1, duration: 1 }} className="absolute top-[65%] right-[8%]"><DoodleCheck size={16} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} transition={{ delay: 2.3, duration: 1 }} className="absolute top-[75%] left-[20%]"><DoodleArrow width={40} height={16} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ delay: 2.5, duration: 1 }} className="absolute top-[80%] right-[15%]"><DoodleCalendar size={16} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 1.7, duration: 1 }} className="absolute top-[40%] left-[8%]"><DoodleStar size={14} /></motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ delay: 2.6, duration: 1 }} className="absolute top-[55%] right-[3%]"><DoodleRupee size={16} /></motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary relative z-10">
          <Sparkle size={10} delay={0.5} /> Privacy-first by design
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.08 }}
          className="mt-7 text-balance text-[2.5rem] font-bold leading-[1.06] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl lg:text-[3.75rem] relative z-10">
          Finally, a subscription tracker that isn&apos;t another subscription.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.16 }}
          className="mt-5 mx-auto max-w-lg text-pretty text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg relative z-10">
          You have more subscriptions than you think. Traqqy brings them all into one clear picture.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.24 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center relative z-10">
          <motion.a href={SIGN_UP} whileHover={{ scale: 1.03, boxShadow: "0 8px 30px -4px hsl(38 90% 55% / 0.35)" }}
            whileTap={{ scale: 0.97 }} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25">
            Get Started — it&apos;s free <span className="ml-0.5">→</span>
          </motion.a>
          <motion.a href={GITHUB_URL} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" /></svg>
            GitHub
          </motion.a>
        </motion.div>

        {/* Scroll hint */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 flex flex-col items-center gap-2 text-zinc-400 dark:text-zinc-600">
          <span className="text-xs font-medium tracking-wide uppercase">See the problem</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none"><path d="M8 4v12M4 12l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE MARQUEE — Two-row infinite scroll with actual SVG logos
   ═══════════════════════════════════════════════════════════════════════════ */

type Service = { name: string; slug?: string; abbr?: string };

const servicesRowOne: Service[] = [
  { name: "Netflix", slug: "netflix" },
  { name: "Spotify", slug: "spotify" },
  { name: "YouTube Premium", slug: "youtube-music" },
  { name: "Prime Video", slug: "prime-video" },
  { name: "Disney+", slug: "disney-plus" },
  { name: "Apple TV+", slug: "apple-tv" },
  { name: "Apple Music", slug: "apple-music" },
  { name: "ChatGPT", slug: "openai-chatgpt" },
  { name: "Claude", slug: "claude" },
  { name: "Gemini", slug: "gemini" },
  { name: "GitHub Copilot", slug: "github-copilot" },
  { name: "Perplexity", slug: "perplexity" },
  { name: "Notion", slug: "notion" },
  { name: "Canva", slug: "canva" },
];

const servicesRowTwo: Service[] = [
  { name: "Adobe CC", slug: "adobe" },
  { name: "Microsoft 365", slug: "microsoft" },
  { name: "Google One", slug: "google-one" },
  { name: "Dropbox", slug: "dropbox" },
  { name: "Figma", slug: "figma" },
  { name: "Jio", slug: "jio" },
  { name: "Airtel", slug: "airtel" },
  { name: "Xbox Game Pass", slug: "xbox" },
  { name: "PlayStation Plus", slug: "playstation" },
  { name: "Switch Online", slug: "nintendo-switch" },
  { name: "Crunchyroll", slug: "crunchyroll" },
  { name: "Duolingo", slug: "duolingo" },
  { name: "LinkedIn Premium", slug: "linkedin" },
];

function MarqueeLogoMark({ service }: { service: Service }) {
  if (service.slug) {
    return (
      <span
        aria-hidden="true"
        className="h-7 w-7 shrink-0 transition-colors duration-300 bg-zinc-400 dark:bg-white/60"
        style={{
          maskImage: `url(/logos/${service.slug}.svg)`,
          WebkitMaskImage: `url(/logos/${service.slug}.svg)`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
      />
    );
  }
  return (
    <span aria-hidden="true" className="flex h-7 items-center text-sm font-bold text-zinc-400 dark:text-white/60">
      {service.abbr}
    </span>
  );
}

function MarqueeCard({ service }: { service: Service }) {
  return (
    <div className="group/card flex w-32 shrink-0 flex-col items-center justify-center gap-2.5 rounded-xl border border-zinc-200/60 bg-white/60 px-3 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white/80 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
      <MarqueeLogoMark service={service} />
      <span className="w-full truncate text-center text-[10px] font-medium text-zinc-500 transition-colors group-hover/card:text-zinc-900 dark:text-zinc-400 dark:group-hover/card:text-zinc-200">
        {service.name}
      </span>
    </div>
  );
}

function MarqueeRow({ items, reverse }: { items: Service[]; reverse?: boolean }) {
  const loop = [...items, ...items];
  return (
    <div className="group flex">
      <div
        className={`flex w-max gap-3 py-1 group-hover:[animation-play-state:paused] ${
          reverse
            ? "animate-[traqqy-marquee-rev_60s_linear_infinite]"
            : "animate-[traqqy-marquee_60s_linear_infinite]"
        }`}
      >
        {loop.map((service, i) => (
          <MarqueeCard key={`${service.name}-${i}`} service={service} />
        ))}
      </div>
    </div>
  );
}

function ServiceMarquee() {
  return (
    <section className="overflow-hidden py-12 sm:py-16 relative">
      {/* Doodle accents */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <DoodleStar className="absolute top-[10%] left-[5%] text-primary/20 hidden lg:block" size={18} />
        <DoodleRupee className="absolute top-[20%] right-[8%] text-primary/15 hidden lg:block" size={16} />
        <DoodleCalendar className="absolute bottom-[15%] left-[10%] text-primary/15 hidden lg:block" size={18} />
        <DoodleArrow className="absolute bottom-[25%] right-[5%] text-primary/15 hidden lg:block" width={45} height={18} />
        <DoodleCheck className="absolute top-[50%] left-[3%] text-primary/10 hidden lg:block" size={14} />
        <DoodleCircle className="absolute top-[40%] right-[12%] text-primary/10 hidden lg:block" size={20} />
      </div>
      <Reveal className="mx-auto mb-8 max-w-6xl px-5 text-center sm:px-6">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Track the services you already use
               </p>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          30+ subscriptions, one dashboard
        </h2>
      </Reveal>

      <div className="relative">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-50 to-transparent sm:w-32 dark:from-zinc-950" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-zinc-50 to-transparent sm:w-32 dark:from-zinc-950" />

        <div className="flex flex-col gap-3 px-2">
          <MarqueeRow items={servicesRowOne} />
          <MarqueeRow items={servicesRowTwo} reverse />
        </div>
      </div>

      <style>{`
        @keyframes traqqy-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes traqqy-marquee-rev {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAPTER 2: THE SIGNATURE TRANSFORMATION
   Scattered payments → accumulate → categories emerge → total → Traqqy clarity
   Cards appear IMMEDIATELY from phase 0 with staggered entrance.
   No dead zone.
   ═══════════════════════════════════════════════════════════════════════════ */

const subs = [
  { name: "Netflix", amount: 649, slug: "netflix" },
  { name: "Spotify", amount: 119, slug: "spotify" },
  { name: "YouTube Premium", amount: 149, slug: "youtube-music" },
  { name: "Notion", amount: 800, slug: "notion" },
  { name: "iCloud+", amount: 75, slug: "apple" },
];

const cats = [
  { name: "Entertainment", amount: 798, color: "#E50914" },
  { name: "Productivity", amount: 800, color: "#9333EA" },
  { name: "Music", amount: 119, color: "#1DB954" },
  { name: "Cloud", amount: 75, color: "#3693F5" },
];

function TransformationSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  /* Tighter phase mapping — cards appear immediately, less dead space */
  const phase = useTransform(scrollYProgress, [0, 0.06, 0.22, 0.38, 0.55, 0.72, 1], [0, 1, 2, 3, 4, 5, 6]);

  const [currentPhase, setCurrentPhase] = useState(0);
  useMotionValueEvent(phase, "change", (v) => setCurrentPhase(Math.round(v)));

  return (
    <section ref={sectionRef} className="relative" style={{ height: "280vh" }}>
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <AmbientGlow className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={600} intensity={currentPhase >= 3 ? 0.08 : 0.03} />

        <div className="mx-auto max-w-lg w-full px-5 relative">
          {/* Phase label — fades when total appears */}
          <motion.div className="text-center mb-6"
            animate={{ opacity: currentPhase <= 2 ? 1 : 0, y: currentPhase <= 2 ? 0 : -20 }}
            transition={{ duration: 0.4 }}>
            <p className="text-sm font-semibold text-primary dark:text-amber-500 inline-flex items-center gap-2">
              <DoodleCircle color="hsl(38 90% 55%)" size={20} /> The problem
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              You have more subscriptions than you think.
            </h2>
          </motion.div>

          {/* Payment cards — staggered entrance from the start, no dead zone */}
          <div className="space-y-2 relative">
            {subs.map((p, i) => {
              const isEntering = currentPhase >= 1;
              const isAccumulating = currentPhase >= 2;
              const isCategory = currentPhase >= 4;

              return (
                <motion.div key={p.name}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30, filter: "blur(4px)" }}
                  animate={{
                    opacity: isEntering ? (isCategory ? 0 : 1) : 0,
                    x: isAccumulating ? 0 : (i % 2 === 0 ? -30 : 30),
                    y: isAccumulating ? 0 : 0,
                    scale: isAccumulating ? 0.92 : 1,
                    filter: isEntering ? "blur(0px)" : "blur(4px)",
                  }}
                  transition={{ duration: 0.5, ease, delay: isEntering && !isAccumulating ? i * 0.12 : 0 }}
                  className="flex items-center justify-between rounded-xl bg-white/[0.04] dark:bg-white/[0.04] border border-white/[0.06] px-4 py-3 relative group"
                >
                  <div className="flex items-center gap-3">
                    <motion.span whileHover={{ scale: 1.1, rotate: -5 }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] shadow-sm overflow-hidden">
                      <img src={`/logos/${p.slug}.svg`} alt="" className="h-5 w-5 object-contain" draggable={false} />
                    </motion.span>
                    <span className="text-sm font-medium text-zinc-200">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold font-mono text-zinc-300">
                    ₹{p.amount.toLocaleString()}
                  </span>

                  {/* Doodle connector — appears during accumulation */}
                  {isAccumulating && !isCategory && (
                    <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 0.25, scaleY: 1 }}
                      transition={{ delay: 0.2 }} className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 origin-top">
                      <svg width="2" height="10"><line x1="1" y1="0" x2="1" y2="10" stroke="hsl(38 90% 55%)" strokeWidth="1" strokeDasharray="2 2" /></svg>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Total — appears after accumulation */}
          <AnimatePresence>
            {currentPhase >= 3 && currentPhase < 5 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease }} className="mt-8 text-center">
                <div className="my-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="relative inline-block">
                  <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-primary dark:text-amber-400 relative z-10">₹1,792</span>
                  <span className="text-sm text-zinc-500 ml-2 relative z-10">/ month</span>
                  <Sparkle className="absolute -top-3 -right-8" size={16} delay={0.3} />
                  <Sparkle className="absolute -bottom-2 -left-7" size={12} delay={0.6} />
                </div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  But you never see the whole picture.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category reorganization — payments become categories */}
          <AnimatePresence>
            {currentPhase >= 4 && currentPhase < 6 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }} className="mt-6">
                <div className="space-y-3">
                  {cats.map((cat, i) => (
                    <motion.div key={cat.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.1, ease }}
                      className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-24 text-right shrink-0 font-medium">{cat.name}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }}
                          animate={{ width: `${(cat.amount / 800) * 100}%` }}
                          transition={{ duration: 0.8, ease, delay: 0.3 + i * 0.1 }}
                          className="h-full rounded-full" style={{ backgroundColor: cat.color }} />
                      </div>
                      <span className="text-xs font-mono font-semibold text-zinc-400 w-14 text-right">₹{cat.amount}</span>
                    </motion.div>
                  ))}
                </div>
                {/* Check mark — information is now organized */}
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.3, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
                  className="mt-4 text-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="inline-block">
                    <path d="M5 13l4 4L19 7" stroke="hsl(38 90% 55%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transition to product — "Traqqy makes sense of it" */}
          <AnimatePresence>
            {currentPhase >= 5 && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }} className="text-center mt-8">
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Traqqy makes sense of it.
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  One clear picture. Every subscription. Every renewal.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Doodle decorations — scattered during phase 0, organized later */}
          <motion.div className="absolute -left-8 top-1/4 text-primary/30 hidden sm:block"
            animate={{ opacity: currentPhase <= 1 ? 0.6 : 0, rotate: currentPhase <= 1 ? 0 : 45 }}
            transition={{ duration: 0.6 }}>
            <DoodleRupee size={20} />
          </motion.div>
          <motion.div className="absolute -right-6 top-1/3 text-primary/30 hidden sm:block"
            animate={{ opacity: currentPhase <= 1 ? 0.5 : 0 }}
            transition={{ duration: 0.6 }}>
            <DoodleStar size={18} />
          </motion.div>
          <motion.div className="absolute -left-10 bottom-1/3 text-primary/25 hidden sm:block"
            animate={{ opacity: currentPhase <= 1 ? 0.45 : 0 }}
            transition={{ duration: 0.6 }}>
            <DoodleArrow width={50} height={20} />
          </motion.div>
          <motion.div className="absolute -right-8 bottom-1/4 text-primary/20 hidden sm:block"
            animate={{ opacity: currentPhase <= 1 ? 0.4 : 0 }}
            transition={{ duration: 0.6 }}>
            <DoodleCalendar size={20} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAPTER 3: PRODUCT PREVIEW — The actual Traqqy experience
   ═══════════════════════════════════════════════════════════════════════════ */

const previewSubs = [
  { name: "Netflix", plan: "Premium", price: "₹649", slug: "netflix", days: "Tomorrow" },
  { name: "Spotify", plan: "Family", price: "₹119", slug: "spotify", days: "5 days" },
  { name: "YouTube", plan: "Premium", price: "₹149", slug: "youtube-music", days: "12 days" },
  { name: "Notion", plan: "Plus", price: "₹800", slug: "notion", days: "18 days" },
  { name: "Canva", plan: "Pro", price: "₹399", slug: "canva", days: "22 days" },
];

function CountUp({ value, prefix = "", delay = 0 }: { value: number; prefix?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const p = Math.min((now - start) / 800, 1);
        setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
        if (p < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [inView, value, delay]);
  return <span ref={ref}>{prefix}{display.toLocaleString()}</span>;
}

function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section id="features" ref={ref} className="px-5 py-20 sm:px-6 lg:py-28 relative">
      <AmbientGlow className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10" size={500} intensity={0.05} />
      {/* Dense doodles around product preview */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <DoodleStar className="absolute top-[8%] left-[4%] text-primary/20 hidden lg:block" size={16} />
        <DoodleRupee className="absolute top-[12%] right-[6%] text-primary/15 hidden lg:block" size={18} />
        <DoodleCalendar className="absolute top-[25%] left-[2%] text-primary/15 hidden lg:block" size={16} />
        <DoodleArrow className="absolute top-[35%] right-[3%] text-primary/15 hidden lg:block" width={40} height={16} />
        <DoodleCheck className="absolute bottom-[30%] left-[5%] text-primary/10 hidden lg:block" size={14} />
        <DoodleCircle className="absolute bottom-[20%] right-[4%] text-primary/15 hidden lg:block" size={20} />
        <DoodleStar className="absolute bottom-[10%] left-[8%] text-primary/10 hidden lg:block" size={12} />
        <DoodleRupee className="absolute top-[50%] left-[3%] text-primary/10 hidden lg:block" size={14} />
      </div>

      <Reveal className="text-center mb-12">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          A calm, focused workspace.
        </h2>
        <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Everything at a glance, without the clutter.
        </p>
      </Reveal>

      <Reveal>
        <div className="mx-auto max-w-3xl relative">
          <GlowRing className="z-0" />

          {/* Dashboard chrome */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-100 dark:bg-zinc-900/80 p-1 shadow-2xl shadow-black/20 dark:shadow-black/40 relative z-10">
            <div className="mb-3 flex items-center gap-1.5 px-3 pt-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="ml-3 text-[11px] font-medium text-zinc-400 dark:text-zinc-600">traqqy · overview</span>
            </div>

            <div className="rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-white/[0.04] p-5">
              {/* Hero number */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, ease, delay: 0.2 }} className="mb-5">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-1">Monthly spend</p>
                <p className="text-3xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                  <CountUp value={1717} prefix="₹" delay={0.4} />
                </p>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { l: "Active", v: "12" },
                  { l: "Due soon", v: "3" },
                ].map((s, i) => (
                  <motion.div key={s.l} initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, ease, delay: 0.4 + i * 0.1 }}
                    className="rounded-lg border border-zinc-200/50 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.03] p-3">
                    <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{s.l}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">{s.v}</p>
                  </motion.div>
                ))}
              </div>

              {/* Chart — progressive reveal */}
              <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-lg border border-zinc-200/50 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.03] p-4 mb-4">
                <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-3">Spending trend</p>
                <div className="flex items-end justify-between gap-1.5 h-14">
                  {[40, 62, 48, 78, 56, 90, 70].map((h, i) => (
                    <motion.div key={i} initial={{ height: 0 }} animate={inView ? { height: `${h}%` } : { height: 0 }}
                      transition={{ duration: 0.7, ease, delay: 0.8 + i * 0.06 }}
                      className="w-full rounded-sm bg-gradient-to-t from-primary/40 to-primary/80 dark:from-primary/50 dark:to-primary" style={{ minHeight: 4 }} />
                  ))}
                </div>
              </motion.div>

              {/* Subscription rows — entering naturally */}
              <div className="space-y-1">
                {previewSubs.map((sub, i) => (
                  <motion.div key={sub.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.35, ease, delay: 1.1 + i * 0.08 }}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors group cursor-default">
                    <div className="flex items-center gap-3">
                      <motion.span whileHover={{ scale: 1.1 }}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.08] shadow-sm overflow-hidden">
                        <img src={`/logos/${sub.slug}.svg`} alt="" className="h-4 w-4 object-contain" draggable={false} />
                      </motion.span>
                      <div>
                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-primary transition-colors">{sub.name}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{sub.plan}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">{sub.price}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-600">in {sub.days}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Doodle annotations on the product */}
          <DoodleStar className="absolute -top-4 -right-3 text-primary/35" size={18} />
          <DoodleCalendar className="absolute bottom-4 -right-8 text-primary/25 hidden sm:block" size={22} />
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAPTER 4: CAPABILITIES — Mini visual scenes
   Each capability is a tiny animated demonstration, not a static card.
   ═══════════════════════════════════════════════════════════════════════════ */

function CapabilitySceneSee() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const items = ["Netflix", "Spotify", "YouTube", "Notion", "Canva"];
  return (
    <div ref={ref} className="space-y-1.5 mt-4">
      {items.map((name, i) => (
        <motion.div key={name}
          initial={{ opacity: 0, x: -12 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.4, ease, delay: 0.15 + i * 0.08 }}
          className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.04] last:border-0">
          <span className="text-zinc-400">{name}</span>
          <span className="font-mono text-zinc-500">₹{[649, 119, 149, 800, 399][i]}</span>
        </motion.div>
      ))}
      <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.7 }}
        className="pt-2 flex justify-between text-[10px]">
        <span className="text-zinc-500">5 active</span>
        <span className="font-mono font-semibold text-primary">₹2,116/mo</span>
      </motion.div>
    </div>
  );
}

function CapabilitySceneRenewal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div ref={ref} className="mt-4">
      <div className="relative">
        {/* Timeline */}
        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/[0.08]" />
        <div className="space-y-3">
          {[
            { name: "Netflix", days: "Tomorrow", urgent: true },
            { name: "Spotify", days: "5 days", urgent: false },
            { name: "YouTube", days: "12 days", urgent: false },
          ].map((r, i) => (
            <motion.div key={r.name}
              initial={{ opacity: 0, x: -8 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, ease, delay: 0.2 + i * 0.12 }}
              className="flex items-center gap-3 relative">
              <div className={`w-[7px] h-[7px] rounded-full shrink-0 relative z-10 ${r.urgent ? "bg-primary" : "bg-zinc-600"}`} />
              <span className="text-[11px] text-zinc-400 flex-1">{r.name}</span>
              <span className={`text-[10px] font-medium ${r.urgent ? "text-primary" : "text-zinc-500"}`}>{r.days}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CapabilitySceneDiscover() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div ref={ref} className="mt-4">
      {/* Simulated scan result */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5, ease, delay: 0.2 }}
        className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
        <div className="flex items-center gap-2 mb-2">
          <DoodleStar size={12} color="hsl(38 90% 55%)" />
          <span className="text-[10px] text-primary font-medium">Found</span>
        </div>
        <p className="text-xs text-zinc-300">Adobe Creative Cloud</p>
        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">₹1,675/mo · detected from 3 emails</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
        className="mt-2 text-[10px] text-zinc-500 text-center">
        341 emails → 2 discoveries
      </motion.div>
    </div>
  );
}

function Capabilities() {
  return (
    <section className="px-5 py-20 sm:px-6 lg:py-28 relative">
      {/* Dense doodle accents scattered around capabilities */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <DoodleCalendar className="absolute top-[8%] right-[5%] text-primary/25 hidden lg:block" size={24} />
        <DoodleCheck className="absolute top-[15%] left-[4%] text-primary/20 hidden lg:block" size={18} />
        <DoodleStar className="absolute top-[25%] right-[8%] text-primary/15 hidden lg:block" size={16} />
        <DoodleRupee className="absolute top-[35%] left-[2%] text-primary/20 hidden lg:block" size={18} />
        <DoodleArrow className="absolute top-[45%] right-[3%] text-primary/15 hidden lg:block" width={45} height={18} />
        <DoodleCircle className="absolute bottom-[35%] left-[6%] text-primary/15 hidden lg:block" size={22} />
        <DoodleCheck className="absolute bottom-[20%] left-[8%] text-primary/25 hidden lg:block" size={20} />
        <DoodleStar className="absolute bottom-[15%] right-[10%] text-primary/15 hidden lg:block" size={14} />
        <DoodleRupee className="absolute bottom-[8%] left-[12%] text-primary/10 hidden lg:block" size={16} />
        <DoodleCalendar className="absolute top-[55%] left-[3%] text-primary/10 hidden lg:block" size={16} />
      </div>

      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center mb-14">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            What Traqqy does for you.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* See everything — animated list scene */}
          <Reveal delay={0} className="rounded-xl bg-white/[0.03] dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.06] p-5 relative overflow-hidden group hover:border-primary/20 transition-colors duration-300">
            <DoodleCircle className="absolute -top-1 -right-1 text-primary/15 group-hover:text-primary/25 transition-colors duration-300" size={28} />
            <p className="text-xs font-semibold text-primary">See everything</p>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">Every subscription, every renewal.</p>
            <CapabilitySceneSee />
          </Reveal>

          {/* Know when it matters — animated timeline scene */}
          <Reveal delay={0.1} className="rounded-xl bg-white/[0.03] dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.06] p-5 relative overflow-hidden group hover:border-primary/20 transition-colors duration-300">
            <DoodleCalendar className="absolute -top-1 -right-1 text-primary/15 group-hover:text-primary/25 transition-colors duration-300" size={24} />
            <p className="text-xs font-semibold text-primary">Know when it matters</p>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">Never get surprised by a renewal.</p>
            <CapabilitySceneRenewal />
          </Reveal>

          {/* Discover what you forgot — animated discovery scene */}
          <Reveal delay={0.2} className="rounded-xl bg-white/[0.03] dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.06] p-5 relative overflow-hidden group hover:border-primary/20 transition-colors duration-300">
            <DoodleStar className="absolute -top-1 -right-1 text-primary/15 group-hover:text-primary/25 transition-colors duration-300" size={18} />
            <p className="text-xs font-semibold text-primary">Discover what you forgot</p>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">Subscriptions hiding in your inbox.</p>
            <CapabilitySceneDiscover />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAPTER 5: PRIVACY — Visual architecture
   ═══════════════════════════════════════════════════════════════════════════ */

function Privacy() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section className="px-5 py-20 sm:px-6 lg:py-28 relative">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <DoodleCheck className="absolute top-[10%] right-[8%] text-primary/20 hidden lg:block" size={22} />
        <DoodleCircle className="absolute top-[20%] left-[5%] text-primary/15 hidden lg:block" size={20} />
        <DoodleStar className="absolute top-[35%] right-[5%] text-primary/15 hidden lg:block" size={16} />
        <DoodleRupee className="absolute top-[50%] left-[3%] text-primary/10 hidden lg:block" size={14} />
        <DoodleCircle className="absolute bottom-[30%] right-[6%] text-primary/15 hidden lg:block" size={18} />
        <DoodleArrow className="absolute bottom-[20%] left-[4%] text-primary/10 hidden lg:block" width={40} height={16} />
        <DoodleCheck className="absolute bottom-[10%] right-[10%] text-primary/10 hidden lg:block" size={14} />
        <DoodleCalendar className="absolute top-[45%] left-[8%] text-primary/10 hidden lg:block" size={16} />
      </div>

      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center mb-10">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary relative">
            <ShieldCheck className="h-5 w-5" />
            <Sparkle className="absolute -top-1 -right-1" size={10} delay={0.8} />
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Your data stays yours.
          </h2>
        </Reveal>

        {/* Visual privacy architecture */}
        <Reveal delay={0.1}>
          <div ref={ref} className="rounded-xl bg-white/[0.03] dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.06] p-6 relative overflow-hidden">
            <DoodleCircle className="absolute -top-2 -right-2 text-primary/20" size={40} />
            <div className="space-y-4 relative z-10">
              {/* Bank — blocked */}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.4, ease, delay: 0.2 }}
                className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/[0.05] text-zinc-400 shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6h12M4 6V4a2 2 0 012-2h4a2 2 0 012 2v2M2 6l1.5 7h9L14 6" stroke="currentColor" strokeWidth="1.2" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-300 dark:text-zinc-300">Bank access</p>
                  <p className="text-xs text-zinc-500">Never connected. No balances read.</p>
                </div>
                <span className="text-xs text-zinc-500 font-mono">blocked</span>
              </motion.div>
              {/* SMS — blocked */}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.4, ease, delay: 0.3 }}
                className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/[0.05] text-zinc-400 shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-300 dark:text-zinc-300">SMS reading</p>
                  <p className="text-xs text-zinc-500">We don't read your messages.</p>
                </div>
                <span className="text-xs text-zinc-500 font-mono">blocked</span>
              </motion.div>
              {/* Gmail — optional */}
              <motion.div initial={{ opacity: 0, x: -10 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.4, ease, delay: 0.4 }}
                className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-300 dark:text-zinc-300">Gmail access</p>
                  <p className="text-xs text-zinc-500">Optional. Read-only. Disconnect anytime.</p>
                </div>
                <span className="text-xs text-primary font-mono">optional</span>
              </motion.div>
            </div>
            <p className="mt-5 text-center text-xs text-zinc-500">Traqqy works entirely from what you enter. Gmail is only used when you choose Auto Import.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHAPTER 6: CTA
   ═══════════════════════════════════════════════════════════════════════════ */

function FinalCTA() {
  return (
    <section className="px-5 py-20 sm:px-6 lg:py-28 relative">
      <AmbientGlow className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={400} intensity={0.06} />
      {/* Dense doodle accents around CTA */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <DoodleStar className="absolute top-[10%] left-[8%] text-primary/20 hidden lg:block" size={18} />
        <DoodleRupee className="absolute top-[15%] right-[6%] text-primary/15 hidden lg:block" size={16} />
        <DoodleCheck className="absolute top-[30%] left-[4%] text-primary/15 hidden lg:block" size={16} />
        <DoodleCalendar className="absolute top-[40%] right-[5%] text-primary/10 hidden lg:block" size={18} />
        <DoodleArrow className="absolute bottom-[35%] left-[6%] text-primary/15 hidden lg:block" width={45} height={18} />
        <DoodleCircle className="absolute bottom-[25%] right-[8%] text-primary/15 hidden lg:block" size={20} />
        <DoodleStar className="absolute bottom-[15%] left-[10%] text-primary/10 hidden lg:block" size={14} />
        <DoodleRupee className="absolute bottom-[10%] right-[12%] text-primary/10 hidden lg:block" size={14} />
      </div>
      <Reveal className="mx-auto max-w-2xl text-center relative z-10">
        <Sparkle className="mx-auto mb-4" size={20} delay={0.2} />
        <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Take control of your recurring payments.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-zinc-500 dark:text-zinc-400">
          Start tracking subscriptions and recharge plans without giving away your privacy.
        </p>
        <div className="mt-8">
          <motion.a href={SIGN_UP} whileHover={{ scale: 1.03, boxShadow: "0 8px 30px -4px hsl(38 90% 55% / 0.35)" }}
            whileTap={{ scale: 0.97 }} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25">
            Get Started — it&apos;s free <span className="ml-0.5">→</span>
          </motion.a>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer className="border-t border-zinc-200/60 dark:border-white/[0.06] px-5 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.svg" alt="Traqqy" className="h-6 w-6" draggable={false} />
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Traqqy</span>
        </div>
        <div className="flex items-center gap-6">
          <a href={GITHUB_URL} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" /></svg>
            GitHub
          </a>
          <a href="#" className="text-sm text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300">Privacy</a>
        </div>
        <p className="text-sm text-zinc-400 dark:text-zinc-600">Made with ❤️ by Manan Agrawal</p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const theme = useTheme();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased">
      <Nav theme={theme} />
      <main>
        <Hero />
        <WalletAnimation />
        <ServiceMarquee />
        <SectionDivider doodle="line" />
        <ProductPreview />
        <SectionDivider doodle="star" />
        <Capabilities />
        <SectionDivider doodle="rupee" />
        <Privacy />
        <SectionDivider doodle="line" />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
