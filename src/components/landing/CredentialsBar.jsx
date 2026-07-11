import React from "react";

const credentials = [
  { label: "Blackstone", role: "SVP, AI Engineering" },
  { label: "Google", role: "Engineering" },
  { label: "Goldman Sachs", role: "~10 years" },
  { label: "Bloomberg", role: "Engineering" },
];

export default function CredentialsBar() {
  return (
    <section className="border-y border-stone-200 bg-stone-50/50">
      <div className="max-w-4xl mx-auto px-6 py-8 md:py-10">
        <div className="fade-in grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {credentials.map((c) => (
            <div key={c.label} className="fade-in-up text-center">
              <p className="font-serif text-lg md:text-xl font-semibold text-stone-900">
                {c.label}
              </p>
              <p className="text-xs tracking-wide uppercase text-stone-400 mt-1 font-sans">
                {c.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
