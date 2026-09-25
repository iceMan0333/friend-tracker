import React from "react";
import Link from "next/link";
import { ResetPasswordCard } from "@/components/reset-password-card";
import { LogoIcon } from "@/components/icons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password — Punchly",
  description: "Reset your Punchly account password.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12 relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/15 blur-[120px]"
        aria-hidden="true"
      />

      <div className="w-full max-w-md mb-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-zinc-900 dark:text-white group mb-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <LogoIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            Punchly
          </span>
        </Link>
      </div>

      <ResetPasswordCard token={token} />

      <div className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <Link
          href="/"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline underline-offset-4"
        >
          ← Back to home page
        </Link>
      </div>
    </div>
  );
}
