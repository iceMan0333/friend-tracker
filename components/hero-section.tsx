"use client";

import React from "react";
import { AuthCard } from "./auth-card";

interface HeroSectionProps {
  authMode?: "login" | "register";
}

export function HeroSection({ authMode = "register" }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16 lg:py-24 flex items-center">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[550px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-violet-500/15 to-emerald-500/10 blur-[120px] dark:from-indigo-600/20 dark:via-violet-600/15"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Left Column: Headline and Subtitle */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.12]">
              Stay Connected. <br className="hidden sm:inline" />
              Build Habits. <br />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                Celebrate Shared Progress.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 max-w-xl leading-relaxed">
              Friend Tracker helps you and your friends commit to daily workouts,
              coding goals, study sessions, and reading challenges together. Track
              individual completion, keep streaks alive, and cheer each other on.
            </p>
          </div>

          {/* Right Column: Create Account / Sign In box */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none flex justify-center lg:justify-end">
            <AuthCard key={authMode} initialMode={authMode} />
          </div>
        </div>
      </div>
    </section>
  );
}
