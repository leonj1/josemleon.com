import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowRight, ExternalLink } from "lucide-react";
import { projects } from "@/lib/projects-data";

export default function Projects() {
  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="fade-in-up font-serif text-4xl md:text-5xl font-bold text-stone-950 mb-2">
                Projects
              </h1>
              <p className="fade-in font-serif text-lg text-stone-500">
                Coding projects, documented
              </p>
            </div>
            <Link
              to="/"
              className="text-stone-400 hover:text-stone-600 transition-colors mt-2"
            >
              <Home className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Project list */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {projects.map((project) => (
            <article
              key={project.slug}
              className="fade-in-up border-b border-stone-200 pb-8"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 mb-2">
                    <Link
                      to={`/projects/${project.slug}`}
                      className="hover:text-stone-600 transition-colors"
                    >
                      {project.title}
                    </Link>
                  </h2>
                  <p className="font-serif text-lg text-stone-600 leading-relaxed mb-4">
                    {project.description}
                  </p>
                  <Link
                    to={`/projects/${project.slug}`}
                    className="inline-flex items-center gap-1 font-sans text-sm text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    Read the guide
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 font-sans text-sm text-stone-400 hover:text-stone-600 transition-colors mt-1"
                  title="View repository"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">repo</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
