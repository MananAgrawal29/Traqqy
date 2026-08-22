"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════════════════
   WALLET SCROLL ANIMATION
   Apple-style frame-by-frame scroll-scrubbed sequence.
   Money leaves wallet → subscriptions → accumulation → organization → ₹1,792
   Fully reversible on scroll-up.
   ═══════════════════════════════════════════════════════════════════════════ */

const subs = [
  { name: "Netflix", amount: 649, logo: "/logos/netflix.svg" },
  { name: "Spotify", amount: 119, logo: "/logos/spotify.svg" },
  { name: "YouTube", amount: 149, logo: "/logos/youtube-music.svg" },
  { name: "Notion", amount: 800, logo: "/logos/notion.svg" },
  { name: "iCloud+", amount: 75, logo: "/logos/apple.svg" },
];

const cats = [
  { name: "Entertainment", amount: 798, color: "#E50914" },
  { name: "Productivity", amount: 800, color: "#9333EA" },
  { name: "Music", amount: 119, color: "#1DB954" },
  { name: "Cloud", amount: 75, color: "#3693F5" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN ANIMATION COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function WalletAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  // Refs for animated elements
  const walletFlapRef = useRef<HTMLDivElement>(null);
  const walletBodyRef = useRef<HTMLDivElement>(null);
  const moneyContainerRef = useRef<HTMLDivElement>(null);
  const moneyNoteRefs = useRef<(HTMLDivElement | null)[]>([]);
  const subCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLDivElement>(null);
  const payoffRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          pin: stickyRef.current,
          anticipatePin: 1,
        },
      });

      /*
       * PHASE TIMING (spread across 0 → 1):
       *
       * 0.00 – 0.12  : Wallet opens, money notes emerge
       * 0.10 – 0.35  : Money notes fly to subscription positions
       * 0.30 – 0.50  : Subscription cards fade in with logos
       * 0.48 – 0.58  : Cards compress, connectors appear then fade
       * 0.56 – 0.64  : Cards fade, total ₹1,792 emerges
       * 0.64 – 0.78  : Total fades, category bars fill in
       * 0.78 – 0.88  : Categories fade, "Traqqy makes sense of it"
       * 0.88 – 1.00  : Payoff fades, smooth exit
       */

      // ── PHASE 1: Wallet opens ──
      tl.to(walletFlapRef.current, {
        rotateX: -160,
        duration: 0.12,
        ease: "power2.inOut",
      }, 0);

      // Wallet fades out as we move past the cards phase
      const walletContainer = walletFlapRef.current?.parentElement?.parentElement;
      if (walletContainer) {
        tl.to(walletContainer, {
          opacity: 0,
          scale: 0.9,
          duration: 0.1,
          ease: "power2.in",
        }, 0.42);
      }

      // ── PHASE 2: Money notes emerge from wallet ──
      moneyNoteRefs.current.forEach((note, i) => {
        if (!note) return;

        // Start inside wallet, then fly outward and downward
        const targetX = (i - 2) * 80; // spread horizontally
        const targetY = 120 + i * 30; // move downward

        tl.fromTo(note, {
          opacity: 0,
          x: 0,
          y: 0,
          scale: 0.5,
          rotation: 0,
        }, {
          opacity: 1,
          x: targetX,
          y: targetY,
          scale: 1,
          rotation: (i - 2) * 4,
          duration: 0.18,
          ease: "power2.out",
        }, 0.02 + i * 0.02);

        // Note fades as it "arrives" at the subscription
        tl.to(note, {
          opacity: 0,
          scale: 0.3,
          duration: 0.08,
          ease: "power2.in",
        }, 0.20 + i * 0.02);
      });

      // ── PHASE 3: Subscription cards appear ──
      subCardRefs.current.forEach((card, i) => {
        if (!card) return;
        const yBase = -100 + i * 56;

        tl.fromTo(card, {
          opacity: 0,
          x: (i % 2 === 0 ? -15 : 15),
          y: yBase + 10,
        }, {
          opacity: 1,
          x: 0,
          y: yBase,
          duration: 0.1,
          ease: "power3.out",
        }, 0.22 + i * 0.025);
      });

      // ── PHASE 4: Cards compress, then fade ──
      tl.to(subCardRefs.current, {
        y: "-=8",
        stagger: 0.008,
        duration: 0.08,
        ease: "power2.inOut",
      }, 0.48);

      tl.to(subCardRefs.current, {
        opacity: 0,
        scale: 0.95,
        stagger: 0.008,
        duration: 0.06,
        ease: "power2.in",
      }, 0.54);

      // ── PHASE 5: Total emerges ──
      tl.fromTo(totalRef.current, {
        opacity: 0,
        y: 15,
        scale: 0.92,
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.08,
        ease: "power3.out",
      }, 0.56);

      // Total fades
      tl.to(totalRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.06,
        ease: "power2.in",
      }, 0.64);

      // ── PHASE 6: Category bars fill in ──
      tl.fromTo(categoriesRef.current, {
        opacity: 0,
      }, {
        opacity: 1,
        duration: 0.06,
        ease: "power2.out",
      }, 0.66);

      const catBars = categoriesRef.current?.querySelectorAll(".cat-bar") ?? [];
      const catFills = categoriesRef.current?.querySelectorAll(".cat-fill") ?? [];

      catBars.forEach((bar, i) => {
        tl.fromTo(bar, { opacity: 0, x: -6 }, {
          opacity: 1, x: 0, duration: 0.05, ease: "power2.out",
        }, 0.66 + i * 0.02);
      });

      catFills.forEach((fill, i) => {
        tl.to(fill, {
          width: `${(cats[i].amount / 800) * 100}%`,
          duration: 0.08,
          ease: "power2.out",
        }, 0.68 + i * 0.02);
      });

      // Check mark
      tl.fromTo(checkRef.current, {
        opacity: 0, scale: 0,
      }, {
        opacity: 0.4, scale: 1, duration: 0.05, ease: "back.out(3)",
      }, 0.76);

      // ── PHASE 7: Categories fade, payoff ──
      tl.to([categoriesRef.current, checkRef.current], {
        opacity: 0, duration: 0.05, ease: "power2.in",
      }, 0.80);

      tl.fromTo(payoffRef.current, {
        opacity: 0, y: 15,
      }, {
        opacity: 1, y: 0, duration: 0.08, ease: "power2.out",
      }, 0.82);

      // ── PHASE 8: Exit ──
      tl.to(payoffRef.current, {
        opacity: 0, y: -15, duration: 0.1, ease: "power2.in",
      }, 0.92);

    }, containerRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  // ── Reduced motion fallback ──
  if (prefersReduced) {
    return (
      <section className="px-5 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-sm font-semibold text-primary mb-2">The problem</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
            You have more subscriptions than you think.
          </h2>
          <div className="space-y-2 mb-8">
            {subs.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.08] overflow-hidden">
                    <img src={s.logo} alt="" className="h-4 w-4 object-contain" draggable={false} />
                  </span>
                  <span className="text-sm font-medium text-zinc-200">{s.name}</span>
                </div>
                <span className="text-sm font-semibold font-mono text-zinc-300">₹{s.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <p className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-primary dark:text-amber-400">₹1,792<span className="text-sm text-zinc-500 ml-2">/ month</span></p>
          <p className="mt-4 text-sm text-zinc-500">But you never see the whole picture.</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="relative" style={{ height: "350vh" }}>
      <div ref={stickyRef} className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(217,130,30,0.04),transparent_70%)] pointer-events-none" />

        <div className="relative w-full max-w-2xl mx-auto px-5" style={{ height: "72vh" }}>

          {/* ── SECTION LABEL ── */}
          <div className="absolute top-[2%] left-0 right-0 text-center z-30">
            <p className="text-sm sm:text-base font-semibold text-primary dark:text-amber-500">The problem</p>
            <h2 className="mt-1.5 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              You have more subscriptions than you think.
            </h2>
          </div>

          {/* ── WALLET ── */}
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-20">
            <div className="relative w-48 h-36 sm:w-64 sm:h-48 mx-auto">
              {/* Wallet body */}
              <div ref={walletBodyRef} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-28 sm:h-36 rounded-2xl bg-gradient-to-b from-zinc-700 to-zinc-800 dark:from-zinc-700 dark:to-zinc-800 border border-white/[0.08] shadow-xl shadow-black/30 overflow-hidden">
                <div className="absolute top-4 left-5 right-5 h-px bg-white/[0.06]" />
                <div className="absolute top-5 left-6 right-6 h-7 sm:h-8 rounded-lg bg-white/[0.04] border border-white/[0.04]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(217,130,30,0.05),transparent_60%)]" />
              </div>
              {/* Wallet flap */}
              <div ref={walletFlapRef} className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 w-[104%] h-14 sm:h-16 rounded-t-2xl bg-gradient-to-b from-zinc-600 to-zinc-700 dark:from-zinc-600 dark:to-zinc-700 border border-white/[0.08] border-b-0 shadow-lg shadow-black/20 origin-bottom">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full bg-primary/40 border border-primary/20" />
              </div>
              {/* Ambient glow */}
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(217,130,30,0.08),transparent_70%)] blur-xl" />
            </div>
          </div>

          {/* ── MONEY NOTES — start at wallet, fly outward ── */}
          <div ref={moneyContainerRef} className="absolute top-[22%] left-1/2 -translate-x-1/2 z-25">
            {subs.map((s, i) => (
              <div
                key={s.name}
                ref={(el) => { moneyNoteRefs.current[i] = el; }}
                className="absolute flex items-center justify-center rounded-lg font-bold font-mono shadow-lg pointer-events-none"
                style={{
                  width: 60 + (s.amount / 100) * 2,
                  height: 26,
                  background: "linear-gradient(135deg, hsl(38 90% 50%) 0%, hsl(38 75% 40%) 100%)",
                  color: "hsl(24 10% 6%)",
                  fontSize: "11px",
                  opacity: 0,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                ₹{s.amount}
              </div>
            ))}
          </div>

          {/* ── SUBSCRIPTION CARDS ── */}
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-full max-w-md z-20">
            {subs.map((s, i) => (
              <div
                key={s.name}
                ref={(el) => { subCardRefs.current[i] = el; }}
                className="absolute left-0 right-0 flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.06] px-4 sm:px-5 py-3 sm:py-3.5"
                style={{ opacity: 0, top: 0 }}
              >
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] overflow-hidden">
                  <img src={s.logo} alt="" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" draggable={false} />
                </span>
                <span className="text-sm sm:text-base font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap">{s.name}</span>
                <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-500 dark:text-zinc-400 ml-auto whitespace-nowrap">₹{s.amount}</span>
              </div>
            ))}
          </div>

          {/* ── TOTAL ₹1,792 ── */}
          <div ref={totalRef} className="absolute top-[44%] left-1/2 -translate-x-1/2 text-center z-20" style={{ opacity: 0 }}>
            <span className="text-4xl sm:text-6xl lg:text-7xl font-bold font-mono tracking-tight text-amber-700 dark:text-amber-400">₹1,792</span>
            <span className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 ml-2">/ month</span>
          </div>

          {/* ── CATEGORY BARS ── */}
          <div ref={categoriesRef} className="absolute top-[38%] left-1/2 -translate-x-1/2 w-full max-w-md space-y-4 z-20" style={{ opacity: 0 }}>
            {cats.map((cat) => (
              <div key={cat.name} className="cat-bar flex items-center gap-2 sm:gap-3" style={{ opacity: 0 }}>
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-500 w-20 sm:w-24 text-right shrink-0 font-medium">{cat.name}</span>
                <div className="flex-1 h-2 sm:h-2.5 bg-zinc-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="cat-fill h-full rounded-full" style={{ width: 0, backgroundColor: cat.color }} />
                </div>
                <span className="text-xs sm:text-sm font-mono font-semibold text-zinc-600 dark:text-zinc-400 w-14 sm:w-16 text-right">₹{cat.amount}</span>
              </div>
            ))}
          </div>

          {/* ── CHECK MARK ── */}
          <div ref={checkRef} className="absolute top-[58%] left-1/2 -translate-x-1/2 z-20" style={{ opacity: 0 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="hsl(38 90% 55%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* ── PAYOFF TEXT ── */}
          <div ref={payoffRef} className="absolute top-[42%] left-1/2 -translate-x-1/2 text-center w-full z-20" style={{ opacity: 0 }}>
            <p className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Traqqy makes sense of it.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              One clear picture. Every subscription. Every renewal.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
