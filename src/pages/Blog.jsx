import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const categories = ["Technical", "Managerial", "Personal"];

const blogPosts = {
  Technical: [
    {
      title: "Building Scalable AI Infrastructure",
      date: "2026-01-15",
      excerpt: "Lessons learned from scaling AI platforms to 250,000 requests per second.",
    },
    {
      title: "Multi-Agent Systems in Production",
      date: "2025-12-08",
      excerpt: "Practical approaches to deploying autonomous agent frameworks.",
    },
  ],
  Managerial: [
    {
      title: "Leading Engineering Teams at Scale",
      date: "2026-01-22",
      excerpt: "Principles for building and managing high-performing engineering organizations.",
    },
  ],
  Personal: [
    {
      title: "The Iterative Mindset",
      date: "2025-11-30",
      excerpt: "Why small changes and quick iterations lead to better outcomes.",
    },
  ],
};

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("Technical");

  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="fade-in-up font-serif text-4xl md:text-5xl font-bold text-stone-950 mb-2">
                Writing
              </h1>
              <p className="fade-in font-serif text-lg text-stone-500">
                Thoughts on technology, leadership, and life
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

      {/* Category Navigation */}
      <nav className="border-b border-stone-200 bg-white/50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex gap-8 py-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`font-sans text-sm tracking-wide uppercase transition-colors pb-1 ${
                  activeCategory === category
                    ? "text-stone-950 border-b-2 border-stone-950 font-semibold"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Blog Posts */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-10">
          {blogPosts[activeCategory].map((post) => (
            <article
              key={post.title}
              className="fade-in-up border-b border-stone-200 pb-8"
            >
              <time className="text-xs tracking-wide uppercase text-stone-400 font-sans">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-950 mt-2 mb-3">
                {post.title}
              </h2>
              <p className="font-serif text-lg text-stone-600 leading-relaxed">
                {post.excerpt}
              </p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}