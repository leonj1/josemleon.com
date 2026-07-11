import React from "react";

export default function HeroSection() {
  return (
    <section className="relative pt-16 pb-12 md:pt-28 md:pb-20 border-b border-black/10">
      <div className="max-w-3xl mx-auto px-6">
        {/* Dateline */}
        <p className="fade-in text-xs tracking-[0.25em] uppercase text-stone-400 mb-8 font-sans">
          New York City &middot; Profile
        </p>

        {/* Name */}
        <h1 className="fade-in-up font-serif text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-stone-950 leading-[0.95]">
          Jose M. Leon
        </h1>

        {/* Thin rule */}
        <div className="fade-in h-[2px] bg-stone-950 mt-6 mb-6 w-16" />

        {/* Tagline */}
        <p className="fade-in-up font-serif text-xl md:text-2xl text-stone-600 italic leading-relaxed">
          Engineering leader. AI builder. Systems thinker.
        </p>
      </div>
    </section>
  );
}
