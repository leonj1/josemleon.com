import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "./Reveal";

export default function HeroSection() {
  return (
    <section className="hero-glow relative pt-36 pb-20 md:pt-48 md:pb-28 border-b hairline overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <Reveal>
          <div className="flex items-center gap-4 mb-10">
            <img
              src="https://avatars.githubusercontent.com/u/5171829?v=4&s=160"
              alt="Jose Leon"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full ring-1 ring-gold/50 ring-offset-4 ring-offset-ink"
            />
            <p className="font-mono text-[11px] md:text-xs tracking-[0.35em] uppercase text-smoke">
              New York City
              <span className="text-gold mx-3">·</span>
              AI Engineering
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="font-serif font-light text-ivory tracking-tight leading-[0.95] text-[clamp(3.5rem,10vw,8.5rem)]">
            Jose M.{" "}
            <span className="italic font-normal text-gold-bright">Leon</span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-10 md:mt-12 max-w-2xl">
            <div className="h-px w-16 bg-gold mb-8" />
            <p className="font-serif text-xl md:text-2xl text-ivory/80 leading-relaxed">
              Engineering leader building AI systems at institutional scale —{" "}
              <span className="italic text-smoke">
                by day at Blackstone, by night in the agent workshop.
              </span>
            </p>
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-12 flex flex-wrap items-center gap-8">
            <Link
              to="/projects"
              className="group inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase text-gold-bright hover:text-ivory transition-colors"
            >
              View projects
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/Blog"
              className="group inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase text-smoke hover:text-ivory transition-colors"
            >
              Read the writing
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
