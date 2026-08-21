import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { categories, blogPosts } from "@/lib/blog-data";
import SiteNav from "@/components/landing/SiteNav";
import Reveal from "@/components/landing/Reveal";

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("Technical");

  return (
    <div className="grain min-h-screen bg-ink text-ivory">
      <SiteNav />

      {/* Header */}
      <header className="hero-glow pt-36 pb-12 md:pt-44 md:pb-16 border-b hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <Reveal>
            <p className="font-mono text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
              The Journal
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-serif font-light text-5xl md:text-7xl text-ivory tracking-tight">
              Writing<span className="text-gold">.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="font-serif italic text-lg md:text-xl text-smoke mt-6">
              Thoughts on technology, leadership, and life.
            </p>
          </Reveal>
        </div>
      </header>

      {/* Category Navigation */}
      <nav className="border-b hairline bg-coal/60 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="flex gap-8 md:gap-10 py-5">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`font-mono text-[11px] tracking-[0.25em] uppercase transition-colors ${
                  activeCategory === category
                    ? "text-gold-bright border-b border-gold pb-1"
                    : "text-smoke hover:text-ivory pb-1 border-b border-transparent"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Blog Posts */}
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-3xl">
          {blogPosts[activeCategory].map((post, i) => (
            <Reveal key={post.slug} delay={i * 80}>
              <article
                className={`py-10 ${i > 0 ? "border-t hairline" : "pt-0"}`}
              >
                <time className="font-mono text-[10px] tracking-[0.25em] uppercase text-smoke">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <h2 className="font-serif font-light text-3xl md:text-4xl text-ivory mt-3 mb-4 leading-tight">
                  <Link
                    to={`/Blog/${post.slug}`}
                    className="hover:text-gold-bright transition-colors duration-300"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="font-serif text-lg text-ivory/70 leading-relaxed mb-5">
                  {post.excerpt}
                </p>
                <Link
                  to={`/Blog/${post.slug}`}
                  className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-gold-bright hover:text-ivory transition-colors"
                >
                  Read
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </main>
    </div>
  );
}
