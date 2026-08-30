"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "niko-first-visit-surprise";

const BEATS = [
  {
    text: "Guess who the most beautiful girl is on planet earth??",
    emoji: "👀",
  },
  { text: "Babyy prin", emoji: "🎉" },
  { text: "hyd mama??", emoji: "💛" },
] as const;

const BEAT_MS = 2200;
// Extra hold so the last line lands instead of blinking away.
const FINAL_HOLD_MS = 2800;
const CONFETTI_COLORS = [
  "#00d4c8",
  "#00f2ff",
  "#fcd34d",
  "#ff6ba9",
  "#a78bfa",
  "#ffffff",
];

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
  color: string;
  round: boolean;
};

export function FirstVisitSurprise() {
  const [beat, setBeat] = useState(-1);
  const [leaving, setLeaving] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => setBeat(-1), 500);
  }, []);

  useEffect(() => {
    if (readSeen()) {
      return;
    }
    markSeen();

    const pieces = buildConfetti(prefersReducedMotion() ? 0 : 44);
    const timers = [
      window.setTimeout(() => {
        setConfetti(pieces);
        setBeat(0);
      }, 0),
    ];

    for (let index = 1; index < BEATS.length; index += 1) {
      timers.push(window.setTimeout(() => setBeat(index), index * BEAT_MS));
    }
    timers.push(
      window.setTimeout(dismiss, (BEATS.length - 1) * BEAT_MS + FINAL_HOLD_MS),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [dismiss]);

  useEffect(() => {
    if (beat < 0) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beat, dismiss]);

  if (beat < 0) {
    return null;
  }

  const current = BEATS[Math.min(beat, BEATS.length - 1)];

  return (
    <button
      type="button"
      aria-label="Dismiss"
      onClick={dismiss}
      className={`fixed inset-0 z-[999] flex cursor-default items-center justify-center overflow-hidden bg-niko-surface/80 px-6 backdrop-blur-md ${
        leaving ? "animate-surprise-out" : "animate-surprise-in"
      }`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {confetti.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-[-12%] block animate-confetti-fall"
            style={{
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size * (piece.round ? 1 : 1.6),
              background: piece.color,
              borderRadius: piece.round ? "9999px" : "2px",
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              ["--confetti-drift" as string]: `${piece.drift}px`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-xl text-center">
        <p
          key={beat}
          className="animate-surprise-pop text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl"
        >
          <span className="niko-gradient-text">{current.text}</span>{" "}
          <span className="inline-block animate-surprise-wiggle">
            {current.emoji}
          </span>
        </p>

        <div className="mt-8 flex items-center justify-center gap-2">
          {BEATS.map((item, index) => (
            <span
              key={item.text}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index <= beat ? "w-8 bg-niko-teal" : "w-3 bg-niko-teal/25"
              }`}
            />
          ))}
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-niko-muted">
          tap anywhere to skip
        </p>
      </div>
    </button>
  );
}

// Golden-ratio scatter: spreads pieces more evenly than random and keeps the
// burst identical on every render.
function buildConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: frac(index * 0.6180339887) * 100,
    delay: frac(index * 0.7548776662) * 2.2,
    duration: 2.8 + frac(index * 0.4142135624) * 2.4,
    drift: (frac(index * 0.3247179572) - 0.5) * 220,
    size: 6 + frac(index * 0.8090169944) * 8,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    round: index % 2 === 0,
  }));
}

function frac(value: number): number {
  return value - Math.floor(value);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // private mode: the surprise simply replays next visit
  }
}
