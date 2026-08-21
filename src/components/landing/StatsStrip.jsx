import React, { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

const stats = [
  { target: 250, suffix: "K", unit: "req/sec", label: "Platform Scale" },
  { target: 99.99, decimals: 2, suffix: "%", unit: "", label: "Availability" },
  { target: 250, suffix: "×", unit: "", label: "Growth in 4 Years" },
];

function CountUp({ target, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }
    let frame;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const duration = 1600;
        const startTime = performance.now();
        const tick = (now) => {
          const t = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 4);
          setValue(target * eased);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <span ref={ref}>
      {value.toFixed(decimals)}
      <span className="text-gold-bright">{suffix}</span>
    </span>
  );
}

export default function StatsStrip() {
  return (
    <section className="border-b hairline">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {stats.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 100}
              className={`text-center ${i > 0 ? "md:border-l hairline" : ""}`}
            >
              <p className="font-serif font-light text-5xl md:text-6xl lg:text-7xl text-ivory tracking-tight">
                <CountUp
                  target={s.target}
                  decimals={s.decimals}
                  suffix={s.suffix}
                />
                {s.unit && (
                  <span className="font-mono text-sm md:text-base text-smoke ml-2 tracking-normal">
                    {s.unit}
                  </span>
                )}
              </p>
              <p className="font-mono text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-smoke mt-4">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
