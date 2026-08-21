import React from "react";
import { Link, useParams } from "react-router-dom";
import { Home, ArrowLeft, ExternalLink } from "lucide-react";
import { getProjectBySlug } from "@/lib/projects-data";
import PageNotFound from "@/lib/PageNotFound";

function InlineText({ text }) {
  const parts = text.split("`");
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="font-mono text-[0.9em] bg-stone-100 border border-stone-200 rounded px-1 py-0.5 text-stone-800"
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
        <p className="font-serif text-lg text-stone-700 leading-relaxed">
          <InlineText text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3 className="font-serif text-xl md:text-2xl font-semibold text-stone-950 mt-8 mb-3">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="space-y-2 list-disc list-inside">
          {block.items.map((item, i) => (
            <li key={i} className="font-serif text-stone-700 text-lg leading-relaxed">
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="mt-4 mb-4 overflow-x-auto rounded-lg bg-stone-900 p-4 text-sm leading-relaxed text-stone-100 font-mono">
          <code>{block.code}</code>
        </pre>
      );
    case "table":
      return (
        <div className="mt-4 mb-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-300">
                {block.headers.map((header) => (
                  <th
                    key={header}
                    className="font-sans text-xs tracking-wide uppercase text-stone-500 py-2 pr-4 font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-stone-200">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="font-serif text-stone-700 py-2 pr-4 text-base align-top"
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
    <div className="min-h-screen bg-[#f7f7f2]">
      <header className="border-b border-black/10">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors mb-3 font-sans text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
              </Link>
              <h1 className="fade-in-up font-serif text-4xl md:text-5xl font-bold text-stone-950 mb-2">
                {project.title}
              </h1>
              <p className="fade-in font-serif text-lg text-stone-500">
                {project.tagline}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-3 mt-1">
              <Link
                to="/"
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <Home className="w-5 h-5" />
              </Link>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-sans text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">repo</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <article>
          <p className="font-serif text-xl text-stone-600 leading-relaxed mb-10">
            {project.summary}
          </p>

          {project.sections.map((section) => (
            <section key={section.heading} className="mb-12">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 mb-4 border-b border-stone-200 pb-2">
                {section.heading}
              </h2>
              <div className="space-y-4">
                {section.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
