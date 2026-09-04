"use client";

import { useEffect, useState, useRef } from "react";

const originalPersonas = [
  {
    title: "Freelancers",
    description:
      "Receive USDT from global clients and spend locally on rent, utilities, and daily needs in Rwanda.",
  },
  {
    title: "Remote Workers",
    description:
      "Convert your stablecoin salary into Rwandan Francs for bills, transport, and family support instantly.",
  },
  {
    title: "Diaspora Remitters",
    description:
      "Send value back home instantly. Your family receives RWF directly on their mobile money account.",
  },
  {
    title: "Tourists & Visitors",
    description:
      "Hold secure USDT for travel expenses and pay local merchants or peers through Mobile Money on the fly.",
  },
  {
    title: "Crypto Traders",
    description:
      "Bridge your trading profits and P2P spreads directly into spendable mobile money without waiting for exchange withdrawals.",
  },
  {
    title: "Digital Nomads",
    description:
      "Travel globally, earn in digital assets, and pay local bills effortlessly without local bank accounts.",
  },
];

export function Personas() {
  const N = originalPersonas.length;
  // Duplicate list to create a seamless infinite circular loop
  const extendedPersonas = [
    ...originalPersonas,
    ...originalPersonas,
    ...originalPersonas,
  ];

  const [activeIndex, setActiveIndex] = useState(N);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null);

  // Only recreate interval when hover pause state changes
  useEffect(() => {
    if (!isPaused) {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
      }
      autoRotateTimer.current = setInterval(() => {
        setTransitionEnabled(true);
        setActiveIndex((prev) => prev + 1);
      }, 3200);
    } else {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
        autoRotateTimer.current = null;
      }
    }
    return () => {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
        autoRotateTimer.current = null;
      }
    };
  }, [isPaused]);

  const handleTransitionEnd = () => {
    // Seamless jump to center set when landing on left/right boundary copies
    if (activeIndex >= N * 2) {
      setTransitionEnabled(false);
      setActiveIndex(activeIndex - N);
    } else if (activeIndex < N) {
      setTransitionEnabled(false);
      setActiveIndex(activeIndex + N);
    }
  };

  const handleDotClick = (index: number) => {
    setTransitionEnabled(true);
    setActiveIndex(N + index);

    // Reset interval timer on manual select
    if (!isPaused) {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
      }
      autoRotateTimer.current = setInterval(() => {
        setTransitionEnabled(true);
        setActiveIndex((prev) => prev + 1);
      }, 3200);
    }
  };

  const cardWidth = 320; // px
  const gap = 24; // px (gap-6)

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="text-left px-4">
          <p className="text-sm font-medium uppercase tracking-wider text-niko-teal">
            Who It&apos;s For
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            For anyone earning in digital assets
          </h2>
          <p className="mt-4 max-w-2xl text-niko-muted leading-relaxed">
            Whether you work remotely, freelance globally, or support family
            abroad, NikoPay turns stablecoins into real purchasing power.
          </p>
        </div>
      </div>

      {/* Spotlight Infinite Carousel Container - Hover events restricted directly to the slider wrapper */}
      <div
        className="relative mt-16 w-full py-4 select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Ambient Blur Edge Shadows */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-20 w-12 sm:w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-12 sm:w-32 bg-gradient-to-l from-background to-transparent" />

        {/* Translating Slider List */}
        <div className="mx-auto max-w-full overflow-visible">
          <div
            className="flex gap-6 w-max"
            onTransitionEnd={handleTransitionEnd}
            style={{
              transform: `translateX(calc(50vw - ${activeIndex * (cardWidth + gap)}px - ${cardWidth / 2}px))`,
              transition: transitionEnabled
                ? "transform 700ms cubic-bezier(0.25, 1, 0.5, 1)"
                : "none",
            }}
          >
            {extendedPersonas.map((persona, i) => {
              const originalIndex = i % N;
              const isActive = i === activeIndex;

              return (
                <article
                  key={`${persona.title}-${i}`}
                  onClick={() => handleDotClick(originalIndex)}
                  className={`w-[320px] rounded-md border p-6 sm:p-7 flex flex-col justify-between transition-all duration-700 cursor-pointer ${
                    isActive
                      ? "border-niko-teal bg-niko-teal/5 text-foreground scale-100 blur-none opacity-100 shadow-[0_0_30px_rgba(0,212,200,0.08)] z-10"
                      : "border-niko-border/20 bg-niko-surface/20 text-niko-muted scale-90 blur-[1.5px] opacity-25 hover:opacity-40 z-0"
                  }`}
                >
                  <div>
                    {/* Index Tag */}
                    <span
                      className={`font-mono text-xs font-bold mb-3 block transition-colors duration-500 ${
                        isActive ? "text-niko-teal" : "text-niko-muted/30"
                      }`}
                    >
                      0{originalIndex + 1}
                    </span>

                    {/* Title */}
                    <h3
                      className={`text-base font-extrabold transition-colors duration-500 flex items-center justify-between gap-2 ${
                        isActive ? "text-niko-teal-bright" : "text-niko-muted"
                      }`}
                    >
                      <span>{persona.title}</span>
                      {isActive && (
                        <span className="text-niko-teal animate-pulse text-sm font-normal">
                          &bull; Active
                        </span>
                      )}
                    </h3>

                    {/* Description */}
                    <p
                      className={`mt-3.5 text-xs leading-relaxed transition-colors duration-500 ${
                        isActive
                          ? "text-foreground/90 font-medium"
                          : "text-niko-muted/45"
                      }`}
                    >
                      {persona.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* Carousel Dot Indicators */}
      <div className="mt-8 flex justify-center items-center gap-2">
        {originalPersonas.map((_, index) => {
          const activeOriginalIndex = activeIndex % N;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDotClick(index)}
              className={`h-2 transition-all duration-500 rounded-full ${
                index === activeOriginalIndex
                  ? "w-6 bg-niko-teal"
                  : "w-2 bg-niko-border/60 hover:bg-niko-border"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          );
        })}
      </div>
    </section>
  );
}
