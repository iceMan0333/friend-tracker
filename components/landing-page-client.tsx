"use client";

import React from "react";
import { Navbar } from "./navbar";
import { HeroSection } from "./hero-section";
import { Footer } from "./footer";

interface LandingPageClientProps {
  userCount?: number;
}

export function LandingPageClient({ userCount }: LandingPageClientProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content: Single Primary Hero & Auth Hub */}
      <main className="flex-1 flex flex-col justify-center">
        <HeroSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
