import React from "react";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative pt-16 pb-12 md:pt-28 md:pb-20 border-b border-black/10">
      <div className="max-w-3xl mx-auto px-6">
        {/* Dateline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xs tracking-[0.25em] uppercase text-stone-400 mb-8 font-sans"
        >
          New York City &middot; Profile
        </motion.p>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-stone-950 leading-[0.95]"
        >
          Jose M. Leon
        </motion.h1>

        {/* Thin rule */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.6, ease: "easeInOut" }}
          className="origin-left h-[2px] bg-stone-950 mt-6 mb-6 w-16"
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="font-serif text-xl md:text-2xl text-stone-600 italic leading-relaxed"
        >
          Engineering leader. AI builder. Systems thinker.
        </motion.p>
      </div>
    </section>
  );
}