import React from "react";
import { motion } from "framer-motion";

const stats = [
  { value: "250K", unit: "req/sec", label: "Platform Scale" },
  { value: "99.99%", unit: "", label: "Availability" },
  { value: "250×", unit: "", label: "Growth" },
];

export default function StatsStrip() {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 * i }}
              className="text-center"
            >
              <p className="font-serif text-3xl md:text-5xl font-bold text-stone-950 tracking-tight">
                {s.value}
                {s.unit && (
                  <span className="text-base md:text-lg font-normal text-stone-400 ml-1">
                    {s.unit}
                  </span>
                )}
              </p>
              <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-stone-400 mt-2 font-sans">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}