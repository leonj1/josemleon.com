import React from "react";
import { motion } from "framer-motion";

export default function LandingFooter() {
  return (
    <footer className="border-t border-stone-200 py-10 md:py-14">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="font-serif text-sm text-stone-400 tracking-wide">
            RPI Computer Science &middot; New York City
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-[1px] w-8 bg-stone-200" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-stone-300 font-sans">
              ∎
            </span>
            <div className="h-[1px] w-8 bg-stone-200" />
          </div>
        </motion.div>
      </div>
    </footer>
  );
}