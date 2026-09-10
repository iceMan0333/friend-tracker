"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon, ArrowRightIcon, SparklesIcon } from "./icons";

interface AuthCardProps {
  initialMode?: "login" | "register";
  redirectOnSuccess?: boolean;
}

export function AuthCard({
  initialMode = "register",
  redirectOnSuccess = false,
}: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    // Simulated auth flow navigating to friends page
    setTimeout(() => {
      setIsLoading(false);
      router.push("/friends");
    }, 400);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/95 p-6 sm:p-8 shadow-xl shadow-indigo-950/5 backdrop-blur-xl transition-all">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-3xl" />

        {/* Tab switch buttons */}
        <div className="relative mb-6 flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/70 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setStatusMessage(null);
            }}
            className={`flex-1 rounded-lg py-2 transition-all duration-200 text-center ${
              mode === "register"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white font-semibold"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStatusMessage(null);
            }}
            className={`flex-1 rounded-lg py-2 transition-all duration-200 text-center ${
              mode === "login"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white font-semibold"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Header content */}
        <div className="mb-5 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {mode === "register"
              ? "Join Your Friends on Friend Tracker"
              : "Welcome Back"}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "register"
              ? "Start tracking shared activities and celebrating streaks together."
              : "Sign in to check off today's activities and view friend updates."}
          </p>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div
            className={`mb-4 rounded-lg p-3 text-xs sm:text-sm transition-all flex items-start gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50"
                : "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50"
            }`}
            role="status"
          >
            <SparklesIcon className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Semantic Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
              >
                Full Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
          )}

          <div>
            <label
              htmlFor={mode === "register" ? "register-email" : "login-email"}
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Email Address
            </label>
            <input
              id={mode === "register" ? "register-email" : "login-email"}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={
                  mode === "register" ? "register-password" : "login-password"
                }
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"
              >
                Password
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() =>
                    setStatusMessage({
                      type: "info",
                      text: "Password reset feature will be connected in next milestone.",
                    })
                  }
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id={
                  mode === "register" ? "register-password" : "login-password"
                }
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            {mode === "register" && (
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Minimum 8 characters with at least one number or symbol.
              </p>
            )}
          </div>

          {mode === "login" ? (
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                Remember this device
              </label>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                id="pledge"
                type="checkbox"
                required
                defaultChecked
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <label htmlFor="pledge" className="cursor-pointer leading-tight">
                I agree to the friendly accountability pledge & terms.
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-70 transition-all"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
            ) : (
              <>
                <span>
                  {mode === "register" ? "Create Free Account" : "Sign In to Friend Tracker"}
                </span>
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
