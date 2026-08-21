import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { projects } from "@/lib/projects-data";
import SiteNav from "@/components/landing/SiteNav";
import Reveal from "@/components/landing/Reveal";

export default function Projects() {
  return (
    <div className="grain min-h-screen bg-ink text-ivory">
      <SiteNav />

      {/* Header */}
      <header className="hero-glow pt-36 pb-12 md:pt-44 md:pb-16 border-b hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
              The Workshop
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-serif font-light text-5xl md:text-7xl text-ivory tracking-tight">
              Projects<span className="text-gold">.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="font-serif italic text-lg md:text-xl text-smoke mt-6">
              Coding projects, documented.
            </p>
          </Reveal>
        </div>
      </header>

      {/* Project list */}
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-3xl">
          {projects.map((project, i) => (
            <Reveal key={project.slug} delay={i * 80}>
              <article
                className={`py-10 ${i > 0 ? "border-t hairline" : "pt-0"}`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <h2 className="font-serif font-light text-3xl md:text-4xl text-ivory mb-4 leading-tight">
                      <Link
                        to={`/projects/${project.slug}`}
                        className="hover:text-gold-bright transition-colors duration-300"
                      >
                        {project.title}
                      </Link>
                    </h2>
                    <p className="font-serif text-lg text-ivory/70 leading-relaxed mb-5">
                      {project.description}
                    </p>
                    <Link
                      to={`/projects/${project.slug}`}
                      className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-gold-bright hover:text-ivory transition-colors"
                    >
                      Read the guide
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group shrink-0 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-smoke hover:text-ivory transition-colors mt-2"
                    title="View repository"
                  >
                    <span className="hidden sm:inline">Repo</span>
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </main>
    </div>
  );
}
