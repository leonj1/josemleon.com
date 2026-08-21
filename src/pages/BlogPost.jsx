import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPostBySlug } from "@/lib/blog-data";
import PageNotFound from "@/lib/PageNotFound";
import SiteNav from "@/components/landing/SiteNav";
import Reveal from "@/components/landing/Reveal";

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <PageNotFound />;
  }

  return (
    <div className="grain min-h-screen bg-ink text-ivory">
      <SiteNav />

      <header className="hero-glow pt-36 pb-12 md:pt-44 md:pb-16 border-b hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <Reveal>
            <Link
              to="/Blog"
              className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-smoke hover:text-ivory transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              Back to Writing
            </Link>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-serif font-light text-4xl md:text-6xl text-ivory tracking-tight leading-tight mb-6 max-w-4xl">
              {post.title}
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <time className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold">
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </Reveal>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <article className="max-w-3xl">
          <Reveal>
            <p className="font-serif text-xl md:text-2xl italic text-ivory/70 leading-relaxed border-l-2 border-gold pl-8">
              {post.excerpt}
            </p>
          </Reveal>

          {post.body && Array.isArray(post.body) && (
            <Reveal delay={100}>
              <ol className="mt-12 space-y-5">
                {post.body.map((item, i) => (
                  <li key={i} className="flex gap-5 items-baseline">
                    <span className="font-serif italic text-gold-bright text-xl shrink-0 w-8 text-right">
                      {i + 1}
                    </span>
                    <span className="font-serif text-lg md:text-xl text-ivory/85 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}

          {post.body && typeof post.body === "string" && (
            <Reveal delay={100}>
              <div className="mt-12 font-serif text-lg md:text-xl text-ivory/85 leading-[1.85] whitespace-pre-line">
                {post.body}
              </div>
            </Reveal>
          )}
        </article>
      </main>
    </div>
  );
}
