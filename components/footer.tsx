import React from "react";
import { LogoIcon } from "./icons";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <LogoIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-zinc-900 dark:text-white">
              Punchly
            </span>
          </div>

          <div>
            <a
              href="https://github.com/iceMan0333/friend-tracker"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Punchly. All rights reserved.</p>
          <p>
            Portfolio project created by{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Samin Yasar Ishraq
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
