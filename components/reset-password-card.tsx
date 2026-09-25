"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { verifyResetToken, resetPasswordWithToken } from "@/app/actions/auth";
import { EyeIcon, EyeOffIcon, ArrowRightIcon, SparklesIcon, CheckCircleIcon } from "./icons";

interface ResetPasswordCardProps {
  token?: string;
}

export function ResetPasswordCard({ token }: ResetPasswordCardProps) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    let isMounted = true;
    async function checkToken() {
      if (!token) {
        setIsVerifying(false);
        setTokenError("No reset token was found in the URL. Please request a new link.");
        return;
      }

      try {
        const res = await verifyResetToken(token);
        if (!isMounted) return;

        if (res.valid) {
          setTokenValid(true);
          setTokenEmail(res.email || null);
        } else {
          setTokenError(res.error || "This reset link is invalid or has expired.");
        }
      } catch (err) {
        if (!isMounted) return;
        setTokenError("Failed to verify reset link. Please check your connection.");
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    }

    checkToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Password requirement checkers
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setStatusMessage(null);

    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSymbol) {
      setStatusMessage({
        type: "error",
        text: "Please ensure your new password meets all security criteria.",
      });
      return;
    }

    if (!passwordsMatch) {
      setStatusMessage({
        type: "error",
        text: "Passwords do not match. Please re-enter your new password.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordWithToken({
        token,
        newPassword,
      });

      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        setIsSuccess(true);
        setStatusMessage({
          type: "success",
          text: res.message || "Password reset successfully!",
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/95 p-6 sm:p-8 shadow-xl shadow-indigo-950/5 backdrop-blur-xl transition-all">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-3xl" />

        {/* Loading verification state */}
        {isVerifying ? (
          <div className="text-center py-10 space-y-3">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-indigo-600 border-r-transparent" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Verifying your reset link...
            </p>
          </div>
        ) : !tokenValid ? (
          /* Invalid / Expired Token State */
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <SparklesIcon className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Reset Link Expired or Invalid
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                {tokenError || "This password reset token has already been used or has expired."}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                <span>Request a New Reset Link</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          /* Success State */
          <div className="text-center py-6 space-y-4 animate-in fade-in">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                Password Reset Complete!
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Your account password has been updated. You can now sign in with your new password.
              </p>
            </div>

            <div className="pt-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all w-full"
              >
                <span>Sign In to Punchly</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Valid Token Reset Form */
          <div>
            <div className="mb-6 text-center">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Create New Password
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                {tokenEmail ? (
                  <>
                    Setting a new password for{" "}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{tokenEmail}</span>
                  </>
                ) : (
                  "Please choose a strong, secure password for your account."
                )}
              </p>
            </div>

            {statusMessage && (
              <div
                className={`mb-4 rounded-lg p-3 text-xs sm:text-sm transition-all flex items-start gap-2 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50"
                }`}
                role="status"
              >
                <SparklesIcon className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>

              {/* Security requirements checklist */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 space-y-1.5 text-[11px]">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                  Password Requirements:
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-500 font-medium" : "text-zinc-400"}`}>
                    <span>{hasMinLength ? "✓" : "○"}</span>
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-500 font-medium" : "text-zinc-400"}`}>
                    <span>{hasUppercase ? "✓" : "○"}</span>
                    <span>1 uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-500 font-medium" : "text-zinc-400"}`}>
                    <span>{hasNumber ? "✓" : "○"}</span>
                    <span>1 number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSymbol ? "text-emerald-500 font-medium" : "text-zinc-400"}`}>
                    <span>{hasSymbol ? "✓" : "○"}</span>
                    <span>1 special character</span>
                  </div>
                </div>

                {confirmPassword && (
                  <div className={`pt-1 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}`}>
                    <span>{passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !hasMinLength || !hasUppercase || !hasNumber || !hasSymbol || !passwordsMatch}
                className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
