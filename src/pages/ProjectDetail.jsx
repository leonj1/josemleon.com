import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getProjectBySlug } from "@/lib/projects-data";
import PageNotFound from "@/lib/PageNotFound";
import SiteNav from "@/components/landing/SiteNav";
import Reveal from "@/components/landing/Reveal";

function InlineText({ text }) {
  const parts = text.split("`");
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="font-mono text-[0.85em] bg-ivory/5 border hairline rounded px-1.5 py-0.5 text-gold-bright"
      >
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function Block({ block }) {
  switch (block.type) {
    case "p":
      return (
        <p className="font-serif text-lg text-ivory/80 leading-[1.85]">
          <InlineText text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3 className="font-serif text-xl md:text-2xl text-ivory mt-10 mb-3">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="space-y-3">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-4 font-serif text-lg text-ivory/80 leading-relaxed"
            >
              <span className="text-gold shrink-0 mt-0.5">·</span>
              <span>
                <InlineText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="mt-4 mb-4 overflow-x-auto bg-coal border hairline p-5 text-sm leading-relaxed text-ivory/90 font-mono">
          <code>{block.code}</code>
        </pre>
      );
    case "table":
      return (
        <div className="mt-4 mb-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gold/30">
                {block.headers.map((header) => (
                  <th
                    key={header}
                    className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold py-3 pr-4 font-medium"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b hairline">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="font-serif text-ivory/80 py-3 pr-4 text-base align-top"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) {
    return <PageNotFound />;
  }

  return (
    <div className="grain min-h-screen bg-ink text-ivory">
      <SiteNav />

      <header className="hero-glow pt-36 pb-12 md:pt-44 md:pb-16 border-b hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <Reveal>
            <div className="flex items-center justify-between gap-6 mb-8">
              <Link
                to="/projects"
                className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-smoke hover:text-ivory transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                Back to Projects
              </Link>
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-gold-bright hover:text-ivory transition-colors"
                >
                  Repo
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              )}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-serif font-light text-4xl md:text-6xl text-ivory tracking-tight leading-tight mb-6">
              {project.title}
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="font-serif italic text-lg md:text-xl text-smoke max-w-3xl">
              {project.tagline}
            </p>
          </Reveal>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <article className="max-w-3xl">
          <Reveal>
            <p className="font-serif text-xl md:text-2xl italic text-ivory/70 leading-relaxed border-l-2 border-gold pl-8 mb-14">
              {project.summary}
            </p>
          </Reveal>

          {project.sections.map((section) => (
            <Reveal key={section.heading}>
              <section className="mb-14">
                <div className="flex items-center gap-5 mb-7">
                  <h2 className="font-serif font-light text-2xl md:text-3xl text-ivory whitespace-nowrap">
                    {section.heading}
                  </h2>
                  <span className="h-px flex-1 bg-ivory/10" />
                </div>
                <div className="space-y-5">
                  {section.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </article>
      </main>
    </div>
  );
}
