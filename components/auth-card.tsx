"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { registerUser, requestPasswordReset } from "@/app/actions/auth";
import { EyeIcon, EyeOffIcon, ArrowRightIcon, SparklesIcon, CheckCircleIcon } from "./icons";

interface AuthCardProps {
  initialMode?: "login" | "register" | "forgot";
  redirectOnSuccess?: boolean;
}

export function AuthCard({
  initialMode = "register",
  redirectOnSuccess = false,
}: AuthCardProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Reset link info
  const [resetResult, setResetResult] = useState<{
    resetUrl?: string;
    resetToken?: string;
    message?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);
    setResetResult(null);

    try {
      if (mode === "forgot") {
        if (!email.trim() || !email.includes("@")) {
          setStatusMessage({ type: "error", text: "Please enter a valid email address." });
          setIsLoading(false);
          return;
        }

        const res = await requestPasswordReset(email);
        if (res.error) {
          setStatusMessage({ type: "error", text: res.error });
        } else {
          setResetResult({
            resetUrl: res.resetUrl,
            resetToken: res.resetToken,
            message: res.message,
          });
          setStatusMessage({
            type: "success",
            text: res.message || "Password reset link ready.",
          });
        }
        setIsLoading(false);
        return;
      }

      if (mode === "register") {
        if (password.length < 8) {
          setStatusMessage({ type: "error", text: "Password must be at least 8 characters long." });
          setIsLoading(false);
          return;
        }
        if (!/[A-Z]/.test(password)) {
          setStatusMessage({ type: "error", text: "Password must contain at least one uppercase letter." });
          setIsLoading(false);
          return;
        }
        if (!/[0-9]/.test(password)) {
          setStatusMessage({ type: "error", text: "Password must contain at least one number." });
          setIsLoading(false);
          return;
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
          setStatusMessage({ type: "error", text: "Password must contain at least one symbol (e.g. !@#$%^&*)." });
          setIsLoading(false);
          return;
        }

        const regResult = await registerUser({ name, email, password });
        if (regResult.error) {
          setStatusMessage({ type: "error", text: regResult.error });
          setIsLoading(false);
          return;
        }

        const signInResult = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setStatusMessage({
            type: "info",
            text: "Account registered successfully. Please sign in with your password.",
          });
          setMode("login");
          setIsLoading(false);
          return;
        }

        window.location.href = "/";
      } else {
        // Sign In Flow
        const result = await signIn("credentials", {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (result?.error) {
          setStatusMessage({
            type: "error",
            text: "Invalid email or password. Please check your credentials.",
          });
          setIsLoading(false);
          return;
        }

        window.location.href = "/";
      }
    } catch (err) {
      console.error("Auth error:", err);
      setStatusMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (resetResult?.resetUrl) {
      const fullUrl = window.location.origin + resetResult.resetUrl;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
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
              setResetResult(null);
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
              setResetResult(null);
            }}
            className={`flex-1 rounded-lg py-2 transition-all duration-200 text-center ${
              mode === "login" || mode === "forgot"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white font-semibold"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {mode === "forgot" ? "Reset Password" : "Sign In"}
          </button>
        </div>

        {/* Header content */}
        <div className="mb-5 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {mode === "register"
              ? "Join Your Friends on Punchly"
              : mode === "forgot"
              ? "Reset Your Password"
              : "Welcome Back"}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "register"
              ? "Start tracking shared activities and celebrating streaks together."
              : mode === "forgot"
              ? "Enter your account email address to generate a password reset link."
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
            {statusMessage.type === "success" ? (
              <CheckCircleIcon className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <SparklesIcon className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Reset link prepared card (in forgot mode) */}
        {mode === "forgot" && resetResult?.resetUrl && (
          <div className="mb-5 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-4 w-4 shrink-0" />
              <span>Reset Link Ready (Valid for 1 Hour)</span>
            </div>
            
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Click below to proceed to the secure password reset page:
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <Link
                href={resetResult.resetUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all text-center"
              >
                <span>Proceed to Reset Password</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Link Copied to Clipboard!</span>
                  </>
                ) : (
                  <span>📋 Copy Direct Reset Link</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Form */}
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
              htmlFor={mode === "register" ? "register-email" : mode === "forgot" ? "forgot-email" : "login-email"}
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
            >
              Email Address
            </label>
            <input
              id={mode === "register" ? "register-email" : mode === "forgot" ? "forgot-email" : "login-email"}
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

          {mode !== "forgot" && (
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
                    onClick={() => {
                      setMode("forgot");
                      setStatusMessage(null);
                      setResetResult(null);
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
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
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Must be at least 8 characters and include at least one uppercase letter, one number, and one symbol.
                </p>
              )}
            </div>
          )}

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
          ) : mode === "register" ? (
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
          ) : null}

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
                  {mode === "register"
                    ? "Create Free Account"
                    : mode === "forgot"
                    ? "Generate Reset Link"
                    : "Sign In to Punchly"}
                </span>
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          {mode === "forgot" && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setStatusMessage(null);
                  setResetResult(null);
                }}
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}
