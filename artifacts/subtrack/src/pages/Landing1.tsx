"use client"

import type React from "react"
import { motion, useInView } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Bell,
  Calendar,
  LayoutDashboard,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  TrendingUp,
} from "lucide-react"

/* GitHub brand mark (lucide dropped brand icons) */
function Github({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Theme (self-contained, no next-themes dependency)                  */
/* ------------------------------------------------------------------ */

type Theme = "light" | "dark"

function useTheme() {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("traqqy-theme") as Theme | null
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    const initial: Theme = stored ?? (prefersDark ? "dark" : "light")
    setTheme(initial)
    document.documentElement.classList.toggle("dark", initial === "dark")
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      document.documentElement.classList.toggle("dark", next === "dark")
      localStorage.setItem("traqqy-theme", next)
      return next
    })
  }, [])

  return { theme, toggle, mounted }
}

function ThemeToggle({ theme, toggle, mounted }: ReturnType<typeof useTheme>) {
  const isDark = theme === "dark"
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200/80 bg-white/60 text-zinc-600 transition-colors hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      {mounted && (
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="h-4.5 w-4.5" aria-hidden="true" />
          ) : (
            <Moon className="h-4.5 w-4.5" aria-hidden="true" />
          )}
        </motion.span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const easeOut = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut, delay: i * 0.08 },
  }),
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

const GITHUB_URL = "https://github.com/MananAgrawal29/Traqqy";

const PRIVACY_URL = "https://YOUR-BLOGGER-URL";

const SIGN_IN_ROUTE = "/sign-in";

const SIGN_UP_ROUTE = "/sign-up";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Privacy", href: "PRIVACY_URL" },
  { label: "GitHub", href: GITHUB_URL },
]

function Nav({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOut }}
      className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/70"
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="/logo-icon.svg" className="flex items-center gap-2" aria-label="Traqqy home">
          <img
  src="/logo-icon.svg"
  alt="Traqqy"
  className="h-8 w-8"
  draggable={false}
/>
            
          
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Traqqy</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle {...theme} />
          <a
            href={SIGN_IN_ROUTE}
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 sm:inline-flex dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Sign In
          </a>
          <a
            href={SIGN_UP_ROUTE}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </nav>
    </motion.header>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard preview (hand-built, no stock imagery)                   */
/* ------------------------------------------------------------------ */

const previewSubs = [
  { name: "Netflix", plan: "Premium", price: "₹649", slug: "netflix"},
  { name: "Spotify", plan: "Family", price: "₹179", slug: "spotify"},
  {name: "Crunchyroll", plan: "Fan", price: "₹99", slug: "crunchyroll"},
  {name: "Google One", plan: "100 GB", price: "₹130", slug: "google-one"},
]

function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
      {/* window bar */}
      <div className="mb-4 flex items-center gap-1.5 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="ml-3 text-xs font-medium text-zinc-400 dark:text-zinc-500">traqqy · overview</span>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Monthly", value: "₹2,902" },
          { label: "Active", value: "12" },
          { label: "Due soon", value: "3" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{s.value}</p>
          </div>
        ))}
      </div>

      {/* mini chart */}
      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-end justify-between gap-2">
          {[40, 62, 48, 78, 56, 90, 70].map((h, i) => (
            <motion.span
              key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: easeOut, delay: 0.3 + i * 0.06 }}
              className="w-full rounded-sm bg-rose-500/80 dark:bg-rose-500"
              style={{ minHeight: 6 }}
            />
          ))}
        </div>
      </div>

      {/* subscription list */}
      <div className="mt-3 space-y-1.5">
        {previewSubs.map((sub) => (
          <div
            key={sub.name}
            className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-950"
          >
            <div className="flex items-center gap-3.5">
              <span
  className="h-7 w-7 shrink-0 bg-zinc-900 dark:bg-white"
  style={{
    maskImage: `url(/logos/${sub.slug}.svg)`,
    WebkitMaskImage: `url(/logos/${sub.slug}.svg)`,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskSize: "contain",
    WebkitMaskSize: "contain",
  }}
/>
              <div>
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{sub.name}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{sub.plan}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{sub.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-16 sm:px-6 sm:pt-40 lg:pb-24">
      {/* subtle top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(37,99,235,0.10),transparent_70%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-8">
        <div>
          <motion.a
            href="#"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            Privacy-first by design
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.06 }}
            className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50"
          >
            Finally, a subscription tracker that isn&apos;t another subscription.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.14 }}
            className="mt-5 max-w-md text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400"
          >
            Track subscriptions, recurring payments, and recharge plans — all in one calm, private place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.22 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href={SIGN_UP_ROUTE}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-600/25 transition-all hover:bg-rose-500 hover:shadow-md hover:shadow-rose-600/30 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={GITHUB_URL}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-all hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: easeOut, delay: 0.2 }}
          className="relative"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features (bento grid)                                              */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Track every recurring payment in one place.",
    span: "sm:col-span-2",
  },
  { icon: Calendar, title: "Calendar", desc: "Know exactly when subscriptions renew." },
  { icon: TrendingUp, title: "Analytics", desc: "Understand where your money goes." },
  { icon: Bell, title: "Reminders", desc: "Never miss another renewal." },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    desc: "No bank access. No email scanning. No SMS reading.",
    span: "sm:col-span-2",
  },
  { icon: Smartphone, title: "Recharge Tracking", desc: "Track mobile recharge plans alongside subscriptions." },
]

function Features() {
  return (
    <section id="features" className="px-5 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Features</p>
          <h2 className="mt-2 max-w-xl text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Everything you need to stay on top of spending.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.title} delay={i} className={f.span ?? ""}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                  className="group h-full rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.desc}</p>
                </motion.div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Privacy                                                            */
/* ------------------------------------------------------------------ */

const privacyCards = [
  { icon: Lock, title: "No Bank Access", desc: "We never connect to your bank or read balances." },
  { icon: Mail, title: "No Email Scanning", desc: "Your inbox stays private and untouched." },
  { icon: MessageSquare, title: "No SMS Reading", desc: "We don't read your messages. Ever." },
]

function Privacy() {
  return (
    <section id="privacy" className="border-y border-zinc-200 bg-zinc-50 px-5 py-20 sm:px-6 lg:py-28 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shadow-rose-600/25">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Your data stays yours.
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Traqqy works entirely from what you enter. No invasive permissions, no hidden tracking.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {privacyCards.map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={i} className="text-center">
                <div className="flex flex-col items-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">{c.title}</h3>
                  <p className="mt-1.5 max-w-[15rem] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{c.desc}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Supported services marquee                                         */
/* ------------------------------------------------------------------ */

type Service = { name: string; slug?: string; abbr?: string }

/* Logos sourced from theSVG.org (review each brand's trademark before use). */
const servicesRowOne: Service[] = [
  { name: "Netflix", slug: "netflix" },
  { name: "Spotify", slug: "spotify" },
  { name: "YouTube Premium", slug: "youtube-music" },
  { name: "Prime Video", slug: "prime-video" },
  { name: "Disney+", slug: "disney-plus" },
  { name: "Apple TV+", slug: "apple-tv" },
  { name: "Apple Music", slug: "apple-music" },
  { name: "Apple One", slug: "apple" },
  { name: "ChatGPT", slug: "openai-chatgpt" },
  { name: "Claude", slug: "claude" },
  { name: "Gemini", slug: "gemini" },
  { name: "GitHub Copilot", slug: "github-copilot" },
  { name: "Perplexity", slug: "perplexity" },
  { name: "Notion", slug: "notion" },
  { name: "Canva", slug: "canva" },
]

const servicesRowTwo: Service[] = [
  { name: "Adobe CC", slug: "adobe" },
  { name: "Microsoft 365", slug: "microsoft" },
  { name: "Google One", slug: "google-one" },
  { name: "Dropbox", slug: "dropbox" },
  { name: "Figma", slug: "figma" },
  { name: "Jio", slug: "jio" },
  { name: "Airtel", slug: "airtel" },
  { name: "Vi", abbr: "Vi" },
  { name: "BSNL", abbr: "BSNL" },
  { name: "Xbox Game Pass", slug: "xbox" },
  { name: "PlayStation Plus", slug: "playstation" },
  { name: "Switch Online", slug: "nintendo-switch" },
  { name: "Crunchyroll", slug: "crunchyroll" },
  { name: "Duolingo", slug: "duolingo" },
  { name: "LinkedIn Premium", slug: "linkedin" },
]

function LogoMark({ service }: { service: Service }) {
  if (service.slug) {
    return (
      <span
        aria-hidden="true"
        className="h-8 w-8 shrink-0 bg-zinc-800 transition-colors duration-300 group-hover/card:bg-zinc-950 dark:bg-zinc-300 dark:group-hover/card:bg-white"
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
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 items-center text-xl font-bold tracking-tight text-zinc-800 transition-colors duration-300 group-hover/card:text-zinc-950 dark:text-zinc-300 dark:group-hover/card:text-white"
    >
      {service.abbr}
    </span>
  )
}

function LogoCard({ service }: { service: Service }) {
  return (
    <div className="group/card flex w-36 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-950/5 dark:border-zinc-800/80 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:shadow-black/40">
      <LogoMark service={service} />
      <span className="w-full truncate text-center text-xs font-medium text-zinc-600 transition-colors duration-300 group-hover/card:text-zinc-950 dark:text-zinc-400 dark:group-hover/card:text-zinc-50">
        {service.name}
      </span>
    </div>
  )
}

function MarqueeRow({ items, reverse }: { items: Service[]; reverse?: boolean }) {
  const loop = [...items, ...items]
  return (
    <div className="group flex">
      <div
        className={`flex w-max gap-4 py-2 group-hover:[animation-play-state:paused] ${
          reverse
            ? "animate-[traqqy-marquee-rev_60s_linear_infinite]"
            : "animate-[traqqy-marquee_60s_linear_infinite]"
        }`}
      >
        {loop.map((service, i) => (
          <LogoCard key={`${service.name}-${i}`} service={service} />
        ))}
      </div>
    </div>
  )
}

function Marquee() {
  return (
    <section className="overflow-hidden py-16 sm:py-20">
      <Reveal className="mx-auto mb-10 max-w-6xl px-5 text-center sm:px-6">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Track the services you already use
        </p>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
          30+ subscriptions, one dashboard
        </h2>
      </Reveal>

      <div className="relative">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-32 dark:from-zinc-950" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-32 dark:from-zinc-950" />

        <div className="flex flex-col gap-4 px-2">
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
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard showcase (large placeholder)                             */
/* ------------------------------------------------------------------ */

function Showcase({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <section className="px-5 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            A calm, focused workspace.
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Everything at a glance, without the clutter.
          </p>
        </Reveal>

        <Reveal>
          <div className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-2 shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 dark:shadow-black/40">
            <img
  src={theme.theme === "dark" ? "/dashboard-dark.png" : "/dashboard-light.png"}
  alt="Traqqy Dashboard"
  className="w-full rounded-xl p-2"
/>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  return (
    <section className="px-5 py-20 sm:px-6 lg:py-28">
      <Reveal className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white px-6 py-14 text-center shadow-sm sm:px-12 dark:border-zinc-800 dark:bg-zinc-900">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(37,99,235,0.12),transparent_70%)]"
          />
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Take control of your recurring payments.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Start tracking subscriptions and recharge plans without giving away your privacy.
          </p>
          <div className="mt-8">
            <a
              href={SIGN_UP_ROUTE}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-rose-600/25 transition-all hover:bg-rose-500 hover:shadow-md active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-zinc-200 px-1 py-1 sm:px-1 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
         
            <img
  src="/logo-icon.svg"
  alt="Traqqy"
  className="h-8 w-8"
  draggable={false}
/>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Traqqy</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href= {GITHUB_URL}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            GitHub
          </a>
          <a
            href="#"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Privacy
          </a>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-500">Made with ❤️ by Manan Agrawal</p>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const theme = useTheme()
  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <Nav theme={theme} />
      <main>
        <Hero />
        <Features />
        <Privacy />
        <Marquee />
        <Showcase theme={theme} />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
