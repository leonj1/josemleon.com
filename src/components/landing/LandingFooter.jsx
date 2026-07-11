import React from "react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-stone-200 py-10 md:py-14">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div className="fade-in">
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
        </div>
      </div>
    </footer>
  );
}
