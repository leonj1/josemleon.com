import React from "react";
import Reveal from "./Reveal";

const credentials = [
  { label: "Blackstone", role: "SVP, AI Engineering", tag: "Now" },
  { label: "Google", role: "Engineering", tag: "Prev" },
  { label: "Goldman Sachs", role: "~10 Years", tag: "Prev" },
  { label: "Bloomberg", role: "Engineering", tag: "Prev" },
];

export default function CredentialsBar() {
  return (
    <section className="border-b hairline bg-coal/60">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {credentials.map((c, i) => (
            <Reveal
              key={c.label}
              delay={i * 80}
              className={`py-10 md:py-12 px-2 md:px-8 ${
                i > 0 ? "md:border-l hairline" : ""
              } ${i % 2 === 1 ? "border-l hairline md:border-l" : ""} ${
                i >= 2 ? "border-t hairline md:border-t-0" : ""
              }`}
            >
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold/70 mb-3">
                {c.tag}
              </p>
              <p className="font-serif text-xl md:text-2xl text-ivory">
                {c.label}
              </p>
              <p className="font-mono text-[10px] md:text-[11px] tracking-[0.18em] uppercase text-smoke mt-2">
                {c.role}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
