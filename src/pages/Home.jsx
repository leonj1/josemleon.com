import React from "react";
import SiteNav from "@/components/landing/SiteNav";
import HeroSection from "@/components/landing/HeroSection";
import CredentialsBar from "@/components/landing/CredentialsBar";
import StatsStrip from "@/components/landing/StatsStrip";
import BioSection from "@/components/landing/BioSection";
import GitHubChart from "@/components/landing/GitHubChart";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="grain min-h-screen bg-ink text-ivory">
      <SiteNav />
      <HeroSection />
      <CredentialsBar />
      <StatsStrip />
      <BioSection />
      <GitHubChart />
      <LandingFooter />
    </div>
  );
}
