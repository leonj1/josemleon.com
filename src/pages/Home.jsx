import React from "react";
import { Linkedin, Github } from "lucide-react";
import { Link } from "react-router-dom";
import BioSection from "@/components/landing/BioSection";
import CredentialsBar from "@/components/landing/CredentialsBar";
import GitHubChart from "@/components/landing/GitHubChart";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      {/* Masthead */}
      <header className="border-b border-black/10">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col items-center justify-center">
          <img 
            src="https://avatars.githubusercontent.com/u/5171829?v=4" 
            alt="Jose Leon"
            className="w-20 h-20 rounded-full mb-3"
          />
          <span
            className="font-serif text-[11px] md:text-xs tracking-[0.4em] uppercase text-stone-400"
          >
            Jose Leon Personal Portfolio
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-serif text-[9px] md:text-[10px] text-stone-400">
              leonj1@gmail.com
            </span>
            <a 
              href="https://www.linkedin.com/in/josemleon/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <Linkedin className="w-3 h-3" />
            </a>
            <a 
              href="https://github.com/leonj1/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <Github className="w-3 h-3" />
            </a>
            <Link 
              to="/Blog"
              className="font-serif text-[9px] md:text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
            >
              blog
            </Link>
          </div>
        </div>
      </header>

      <CredentialsBar />
      <BioSection />
      <GitHubChart />
      <LandingFooter />
    </div>
  );
}