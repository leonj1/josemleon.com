import React from "react";
import Reveal from "./Reveal";

export default function BioSection() {
  return (
    <section className="border-b hairline">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
          {/* Sticky section label */}
          <div className="md:col-span-3">
            <Reveal>
              <div className="md:sticky md:top-28 flex items-center gap-4">
                <span className="font-mono text-[11px] tracking-[0.35em] uppercase text-gold">
                  01 — About
                </span>
                <span className="h-px flex-1 bg-ivory/10 md:hidden" />
              </div>
            </Reveal>
          </div>

          {/* Editorial body */}
          <div className="md:col-span-9 max-w-2xl space-y-8">
            <Reveal>
              <p className="font-serif text-lg md:text-xl leading-[1.85] text-ivory/85">
                <span
                  className="float-left font-serif text-6xl md:text-7xl font-light leading-[0.8] mr-4 mt-1.5 text-gold-bright"
                  style={{ fontVariantLigatures: "none" }}
                >
                  B
                </span>
                y day, I&rsquo;m a Senior Vice President at Blackstone, where I
                lead the AI engineering organization and security foundational
                services. Over the past four years, I&rsquo;ve scaled our
                platform from 1,000 to 250,000 requests per second while
                maintaining 99.99% availability&mdash;infrastructure that
                underpins every transaction and model the firm relies on.
              </p>
            </Reveal>

            <Reveal delay={80}>
              <p className="font-serif text-lg md:text-xl leading-[1.85] text-ivory/85">
                Before Blackstone, I spent time at Google, Bloomberg, and nearly
                a decade at Goldman Sachs, building and leading teams that solve
                hard distributed systems problems.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <p className="font-serif text-lg md:text-xl leading-[1.85] text-ivory/85">
                By night (and weekend, and whenever I can steal a few hours),
                I&rsquo;m deep in the AI agent space&mdash;experimenting with
                multi-agent frameworks, building tools for autonomous software
                development, and exploring how we make AI systems that actually
                learn and improve.{" "}
                <a
                  href="https://github.com/leonj1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-bright underline decoration-gold/40 decoration-1 underline-offset-4 hover:decoration-gold-bright transition-colors"
                >
                  My GitHub
                </a>{" "}
                is a workshop of projects like agent training systems, episodic
                memory for coding agents, and frameworks for agentic quality
                engineering.
              </p>
            </Reveal>

            <Reveal delay={160}>
              <blockquote className="border-l-2 border-gold pl-8 py-2 mt-12">
                <p className="font-serif italic text-2xl md:text-3xl leading-snug text-ivory">
                  &ldquo;I believe in making small changes and iterating
                  quickly. The best systems&mdash;and teams&mdash;are built that
                  way.&rdquo;
                </p>
              </blockquote>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
