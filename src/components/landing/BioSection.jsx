import React from "react";

const paragraphs = [
  {
    dropcap: true,
    text: `By day, I'm a Senior Vice President at Blackstone, where I lead the AI engineering organization and security foundational services. Over the past four years, I've scaled our platform from 1,000 to 250,000 requests per second while maintaining 99.99% availability—infrastructure that underpins every transaction and model the firm relies on.`,
  },
  {
    text: `Before Blackstone, I spent time at Google, Bloomberg, and nearly a decade at Goldman Sachs, building and leading teams that solve hard distributed systems problems.`,
  },
  {
    content: (
      <>
        By night (and weekend, and whenever I can steal a few hours), I'm deep in the AI agent space—experimenting with multi-agent frameworks, building tools for autonomous software development, and exploring how we make AI systems that actually learn and improve.{" "}
        <a
          href="https://github.com/leonj1/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-1 underline-offset-2 hover:text-stone-950 transition-colors"
        >
          My GitHub
        </a>{" "}
        is a workshop of projects like agent training systems, episodic memory for coding agents, and frameworks for agentic quality engineering.
      </>
    ),
  },
  {
    text: `I believe in making small changes and iterating quickly. The best systems—and teams—are built that way.`,
    emphasis: true,
  },
];

function DropCap({ letter }) {
  return (
    <span
      className="float-left font-serif text-6xl md:text-7xl font-bold leading-[0.8] mr-3 mt-1 text-stone-950"
      style={{ fontVariantLigatures: "none" }}
    >
      {letter}
    </span>
  );
}

export default function BioSection() {
  return (
    <section className="pb-12 md:pb-20">
      <div className="max-w-3xl mx-auto px-6">
        {/* Section label */}
        <div className="fade-in flex items-center gap-4 mb-10">
          <div className="h-[1px] flex-1 bg-stone-200" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-stone-400 font-sans whitespace-nowrap">
            About
          </span>
          <div className="h-[1px] flex-1 bg-stone-200" />
        </div>

        {/* Bio paragraphs */}
        <div className="space-y-6">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={`fade-in-up font-serif text-lg md:text-xl leading-[1.75] text-stone-700 ${
                p.emphasis
                  ? "text-stone-950 font-medium border-l-2 border-stone-950 pl-6 ml-0 md:ml-4 italic"
                  : ""
              }`}
            >
              {p.dropcap && <DropCap letter={p.text?.[0] || p.content?.props?.children?.[0]?.[0]} />}
              {p.content ? p.content : (p.dropcap ? p.text.slice(1) : p.text)}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
