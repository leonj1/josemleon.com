import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${
        scrolled
          ? "bg-ink/80 backdrop-blur-md border-b hairline"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="font-serif text-lg tracking-wide text-ivory hover:text-gold-bright transition-colors"
        >
          J<span className="text-gold">·</span>L
        </Link>

        <div className="flex items-center gap-6 md:gap-8">
          <Link
            to="/Blog"
            className="link-draw font-mono text-[11px] tracking-[0.2em] uppercase text-smoke hover:text-ivory transition-colors"
          >
            Writing
          </Link>
          <Link
            to="/projects"
            className="link-draw font-mono text-[11px] tracking-[0.2em] uppercase text-smoke hover:text-ivory transition-colors"
          >
            Projects
          </Link>
          <span className="hidden sm:block h-4 w-px bg-ivory/10" />
          <a
            href="https://github.com/leonj1/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="hidden sm:block text-smoke hover:text-gold-bright transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="https://www.linkedin.com/in/josemleon/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="hidden sm:block text-smoke hover:text-gold-bright transition-colors"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href="mailto:leonj1@gmail.com"
            className="hidden md:inline-flex items-center border border-gold/40 hover:border-gold hover:bg-gold/10 text-gold-bright font-mono text-[11px] tracking-[0.2em] uppercase px-4 py-2 transition-all duration-300"
          >
            Get in touch
          </a>
        </div>
      </div>
    </nav>
  );
}
