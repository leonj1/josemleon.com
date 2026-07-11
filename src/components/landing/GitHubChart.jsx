import React from "react";

export default function GitHubChart() {
  return (
    <section className="py-12 md:py-16 border-t border-stone-200">
      <div className="max-w-3xl mx-auto px-6">
        <div className="fade-in-up flex flex-col items-center">
          <img
            src="https://ghchart.rshah.org/409ba5/leonj1"
            alt="GitHub Contributions"
            className="w-full max-w-2xl"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>
    </section>
  );
}
