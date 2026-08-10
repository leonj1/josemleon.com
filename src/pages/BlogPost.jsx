import React from "react";
import { Link, useParams } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { getPostBySlug } from "@/lib/blog-data";
import PageNotFound from "@/lib/PageNotFound";

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <PageNotFound />;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      <header className="border-b border-black/10">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <Link
                to="/Blog"
                className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors mb-3 font-sans text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Writing
              </Link>
              <h1 className="fade-in-up font-serif text-4xl md:text-5xl font-bold text-stone-950 mb-2">
                {post.title}
              </h1>
              <time className="font-sans text-sm tracking-wide uppercase text-stone-400">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
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

      <main className="max-w-3xl mx-auto px-6 py-12">
        <article className="prose prose-stone prose-lg max-w-none">
          <p className="font-serif text-lg text-stone-600 leading-relaxed">
            {post.excerpt}
          </p>

          {post.body && Array.isArray(post.body) && (
            <ol className="mt-8 space-y-3 list-decimal list-inside">
              {post.body.map((item, i) => (
                <li key={i} className="font-serif text-stone-700 text-lg">
                  {item}
                </li>
              ))}
            </ol>
          )}

          {post.body && typeof post.body === "string" && (
            <div className="mt-8 font-serif text-lg text-stone-700 leading-relaxed whitespace-pre-line">
              {post.body}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
