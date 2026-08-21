import React from "react";
import { Github, Linkedin } from "lucide-react";
import Reveal from "./Reveal";

export default function LandingFooter() {
  return (
    <footer>
      {/* Contact call-to-action */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-36 text-center">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-gold mb-8">
            03 — Contact
          </p>
        </Reveal>
        <Reveal delay={100}>
          <a
            href="mailto:leonj1@gmail.com"
            className="group inline-block font-serif font-light text-[clamp(2.5rem,7vw,5.5rem)] leading-none text-ivory hover:text-gold-bright transition-colors duration-500"
          >
            Say <span className="italic">hello</span>
            <span className="text-gold">.</span>
          </a>
        </Reveal>
        <Reveal delay={200}>
          <p className="font-mono text-xs tracking-[0.2em] text-smoke mt-8">
            leonj1@gmail.com
          </p>
        </Reveal>
      </div>

      {/* Bottom bar */}
      <div className="border-t hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-smoke">
            RPI Computer Science
            <span className="text-gold mx-3">·</span>
            New York City
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/leonj1/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-smoke hover:text-gold-bright transition-colors"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/josemleon/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-smoke hover:text-gold-bright transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
          <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-smoke/60">
            © {new Date().getFullYear()} Jose M. Leon
          </p>
        </div>
      </div>
    </footer>
  );
}
