import React from "react";
import { ArrowUpRight } from "lucide-react";
import Reveal from "./Reveal";

export default function GitHubChart() {
  return (
    <section className="border-b hairline">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
          <div className="md:col-span-3">
            <Reveal>
              <div className="md:sticky md:top-28 flex items-center gap-4">
                <span className="font-mono text-[11px] tracking-[0.35em] uppercase text-gold">
                  02 — Open Source
                </span>
                <span className="h-px flex-1 bg-ivory/10 md:hidden" />
              </div>
            </Reveal>
          </div>

          <div className="md:col-span-9">
            <Reveal>
              <h2 className="font-serif font-light text-3xl md:text-4xl text-ivory leading-tight mb-8">
                The nights-and-weekends{" "}
                <span className="italic text-gold-bright">workshop</span>.
              </h2>
            </Reveal>

            <Reveal delay={100}>
              <div className="bg-parchment p-6 md:p-8">
                <img
                  src="https://ghchart.rshah.org/8a6f3e/leonj1"
                  alt="GitHub contributions over the last year"
                  loading="lazy"
                  width={663}
                  height={104}
                  className="w-full h-auto"
                  style={{ imageRendering: "crisp-edges" }}
                />
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink/10">
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink/50">
                    Contributions · Last 12 months
                  </p>
                  <a
                    href="https://github.com/leonj1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-ink/70 hover:text-ink transition-colors"
                  >
                    github.com/leonj1
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
