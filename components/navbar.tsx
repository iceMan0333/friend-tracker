import React from "react";
import Link from "next/link";
import { LogoIcon } from "./icons";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/70 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-zinc-900 dark:text-zinc-50 transition-transform active:scale-98"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
            <LogoIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-violet-600 dark:group-hover:from-indigo-400 dark:group-hover:to-violet-400 transition-all">
              Friend Tracker
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Shared Accountability
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
