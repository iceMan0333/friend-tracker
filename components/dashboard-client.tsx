"use client";

import React, { useState } from "react";
import Link from "next/link";
import { punchInActivity, acceptActivityProposal, declineActivityProposal } from "@/app/actions/activities";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";

export interface DashboardActivity {
  id: number;
  title: string;
  startDate: string;
  endDate?: string | null;
  frequency: string;
  frequencyCount?: number | null;
  friend: {
    id: number;
    name: string;
    tag?: string | null;
    image?: string | null;
  };
  hasUserPunchedToday: boolean;
  userPunchedAt?: string | null;
  hasFriendPunchedToday: boolean;
  friendPunchedAt?: string | null;
  userWeekCount: number;
  friendWeekCount: number;
  isGoalReached: boolean;
}

export interface DashboardFriend {
  id: number;
  name: string;
  email: string;
  tag?: string | null;
  image?: string | null;
  hasCompletedToday: boolean;
  sharedHabitsCount: number;
}

export interface DashboardPendingProposal {
  id: number;
  title: string;
  frequency: string;
  frequencyCount?: number | null;
  creator: {
    id: number;
    name: string;
    tag?: string | null;
    image?: string | null;
  };
  createdAt: string;
}

export interface DashboardClientProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    tag?: string | null;
    image?: string | null;
    bio?: string | null;
  };
  initialActivities: DashboardActivity[];
  friends: DashboardFriend[];
  pendingProposals?: DashboardPendingProposal[];
  stats: {
    totalActivities: number;
    completedTodayCount: number;
    remainingTodayCount: number;
    pendingProposalsCount: number;
    pendingFriendRequestsCount: number;
    unreadNotificationsCount: number;
  };
}

// Deterministic formatters
function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return hours + ":" + minutes + " " + ampm;
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function DashboardClient({
  currentUser,
  initialActivities = [],
  friends = [],
  pendingProposals = [],
  stats,
}: DashboardClientProps) {
  const [activities, setActivities] = useState<DashboardActivity[]>(initialActivities);
  const [proposals, setProposals] = useState<DashboardPendingProposal[]>(pendingProposals);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [punchingInId, setPunchingInId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Quick 1-tap punch in from the dashboard
  const handleQuickPunchIn = async (activityId: number) => {
    if (punchingInId !== null) return;
    setPunchingInId(activityId);

    const clientDate = getLocalDateString();
    const nowIso = new Date().toISOString();

    // Optimistic UI update
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== activityId) return act;
        const newWeekCount = act.userWeekCount + 1;
        let goalReached = act.isGoalReached;
        if (act.frequency === "DAILY") {
          goalReached = act.hasFriendPunchedToday;
        } else {
          const target = act.frequencyCount || 1;
          goalReached = newWeekCount >= target && act.friendWeekCount >= target;
        }
        return {
          ...act,
          hasUserPunchedToday: true,
          userPunchedAt: nowIso,
          userWeekCount: newWeekCount,
          isGoalReached: goalReached,
        };
      })
    );

    try {
      const res = await punchInActivity({ activityId, clientDate });
      if (res.error) {
        showToast("error", res.error);
        // Revert on error
        setActivities(initialActivities);
      } else {
        showToast("success", "Punched in for today! Great work! 🔥");
      }
    } catch {
      showToast("error", "Network error while punching in.");
      setActivities(initialActivities);
    } finally {
      setPunchingInId(null);
    }
  };

  // Accept proposal directly from banner
  const handleAcceptProposal = async (proposalId: number) => {
    try {
      const res = await acceptActivityProposal(proposalId);
      if (res.success) {
        showToast("success", "Proposal accepted! Tracking started.");
        setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      } else if (res.error) {
        showToast("error", res.error);
      }
    } catch {
      showToast("error", "Failed to accept proposal.");
    }
  };

  // Decline proposal
  const handleDeclineProposal = async (proposalId: number) => {
    try {
      const res = await declineActivityProposal(proposalId);
      if (res.success) {
        showToast("success", "Proposal declined.");
        setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      } else if (res.error) {
        showToast("error", res.error);
      }
    } catch {
      showToast("error", "Failed to decline proposal.");
    }
  };

  // Filtered activities
  const filteredActivities = activities.filter((a) => {
    if (filter === "todo") return !a.hasUserPunchedToday;
    if (filter === "done") return a.hasUserPunchedToday;
    return true;
  });

  const completedCount = activities.filter((a) => a.hasUserPunchedToday).length;
  const totalCount = activities.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white pb-20 md:pb-10 selection:bg-indigo-500 selection:text-white">
      {/* Universal Desktop & Mobile Header */}
      <AppHeader
        sessionUser={currentUser}
        unreadNotifications={stats.unreadNotificationsCount}
        pendingRequests={stats.pendingFriendRequestsCount}
      />

      {/* Main Responsive Stream */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={
              "fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border transition-all animate-in fade-in slide-in-from-top-4 " +
              (toastMessage.type === "success"
                ? "bg-emerald-900/90 text-emerald-200 border-emerald-700/80 shadow-emerald-950/50"
                : "bg-rose-900/90 text-rose-200 border-rose-700/80 shadow-rose-950/50")
            }
          >
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* 1. Pending Activity Proposals Banner (Top priority alert) */}
        {proposals.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Incoming Activity Proposals ({proposals.length})
              </h2>
            </div>

            <div className="space-y-2.5">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold ring-1 ring-zinc-600">
                      {p.creator.image ? (
                        <img src={p.creator.image} alt={p.creator.name} className="h-full w-full object-cover" />
                      ) : (
                        <span>{p.creator.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {p.creator.name}{" "}
                        <span className="text-xs text-zinc-400 font-normal">
                          proposed: <strong className="text-indigo-300 font-semibold">{p.title}</strong>
                        </span>
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {p.frequency === "DAILY" ? "Daily" : "Min " + p.frequencyCount + "x / week"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleAcceptProposal(p.id)}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-1.5 transition-colors shadow-sm active:scale-95"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineProposal(p.id)}
                      className="rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs px-3 py-1.5 transition-colors active:scale-95"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Horizontal Stories-Style Friend Rail */}
        {friends.length > 0 && (
          <section aria-label="Active Friends" className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Friends ({friends.length})
              </span>
              <Link
                href="/friends"
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all →
              </Link>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto py-1 px-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {friends.map((f) => (
                <Link
                  key={f.id}
                  href={"/friends/" + f.id}
                  className="group flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95"
                >
                  <div
                    className={
                      "relative h-14 w-14 rounded-full p-0.5 transition-all duration-300 " +
                      (f.hasCompletedToday
                        ? "ring-2 ring-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        : "ring-2 ring-zinc-700 group-hover:ring-indigo-500")
                    }
                  >
                    <div className="h-full w-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-sm font-bold text-white">
                      {f.image ? (
                        <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
                      ) : (
                        <span>{f.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {f.hasCompletedToday && (
                      <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center text-[8px] text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white max-w-[62px] truncate text-center">
                    {f.name.split(" ")[0]}
                  </span>
                </Link>
              ))}

              {/* Add friend circle button */}
              <Link
                href="/friends"
                className="flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 text-zinc-400 hover:text-zinc-200"
              >
                <div className="h-14 w-14 rounded-full border-2 border-dashed border-zinc-700 hover:border-indigo-500 flex items-center justify-center text-xl transition-colors bg-zinc-900/50">
                  +
                </div>
                <span className="text-[11px] font-medium text-zinc-400">Add</span>
              </Link>
            </div>
          </section>
        )}

        {/* 3. Welcome Header & Today's Scorecard */}
        <section className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Welcome back, {currentUser.name.split(" ")[0]} 👋
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {totalCount === 0
                  ? "You don't have any active shared activities yet."
                  : completedCount === totalCount
                  ? "🎉 Amazing! You have completed all shared habits for today!"
                  : "You have " + (totalCount - completedCount) + " habit(s) waiting for today."}
              </p>
            </div>

            {totalCount > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2">
                <span className="text-xs text-zinc-400">Today:</span>
                <span className="text-sm font-bold text-indigo-400 font-mono">
                  {completedCount}/{totalCount}
                </span>
                <span className="text-[11px] text-zinc-500">({progressPercent}%)</span>
              </div>
            )}
          </div>

          {/* Progress fill bar */}
          {totalCount > 0 && (
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: progressPercent + "%" }}
              />
            </div>
          )}
        </section>

        {/* 4. Filter Pills (Thumb-friendly row) */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={
                  "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 " +
                  (filter === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200")
                }
              >
                All ({activities.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("todo")}
                className={
                  "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 " +
                  (filter === "todo"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200")
                }
              >
                To Do ({activities.filter((a) => !a.hasUserPunchedToday).length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("done")}
                className={
                  "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 " +
                  (filter === "done"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200")
                }
              >
                Done ({activities.filter((a) => a.hasUserPunchedToday).length})
              </button>
            </div>

            <Link
              href="/friends"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors hidden sm:inline"
            >
              + Propose Activity
            </Link>
          </div>
        )}

        {/* 5. Ongoing Activity Cards List */}
        <section aria-label="Ongoing Activities" className="space-y-4">
          {activities.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 sm:p-12 text-center bg-zinc-900/30">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-500/30 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-1">No ongoing activities yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
                Start tracking shared habits with your friends! Pick a friend and propose an activity to hold each
                other accountable.
              </p>
              <Link
                href="/friends"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 transition-all shadow-md active:scale-95"
              >
                Go to Friends & Propose Activity
              </Link>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 p-8 text-center bg-zinc-900/20">
              <p className="text-xs text-zinc-400">
                {filter === "todo"
                  ? "🎉 You have completed all activities for today! No habits remaining."
                  : "You haven't completed any activities yet today."}
              </p>
            </div>
          ) : (
            filteredActivities.map((act) => {
              const isGreen = Boolean(act.isGoalReached);
              const isPendingThis = punchingInId === act.id;

              return (
                <div
                  key={act.id}
                  className={
                    "rounded-2xl p-4 sm:p-5 border transition-all duration-300 space-y-4 " +
                    (isGreen
                      ? "bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/30"
                      : "bg-zinc-900/70 border-zinc-800/80 shadow-sm")
                  }
                >
                  {/* Top row: Title + Goal Reached Badge + Friend shortcuts */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                          {act.title}
                        </h3>
                        {/* Frequency badge */}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {act.frequency === "DAILY" ? "Daily" : "Min " + act.frequencyCount + "x / week"}
                        </span>
                      </div>

                      {/* Friend indicator */}
                      <Link
                        href={"/friends/" + act.friend.id}
                        className="group flex items-center gap-1.5 mt-1 text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        <span>with</span>
                        <div className="h-4 w-4 rounded-full overflow-hidden bg-zinc-700 inline-flex items-center justify-center text-[9px] font-bold text-white">
                          {act.friend.image ? (
                            <img src={act.friend.image} alt={act.friend.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{act.friend.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-semibold text-zinc-300 group-hover:text-indigo-400 transition-colors">
                          {act.friend.name}
                        </span>
                      </Link>
                    </div>

                    {/* Right shortcuts: Chat + Calendar + Goal Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isGreen && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-600/50 px-2.5 py-0.5 rounded-full">
                          <span>✓</span> Goal Reached!
                        </span>
                      )}

                      {/* Chat link shortcut */}
                      <Link
                        href={"/friends/" + act.friend.id}
                        title={"Chat with " + act.friend.name}
                        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800/60"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </Link>

                      {/* Calendar view shortcut */}
                      <Link
                        href={"/friends/" + act.friend.id}
                        title="View monthly calendar"
                        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-zinc-800/60"
                      >
                        <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  {/* Middle row: Live Friend Status Box */}
                  <div className="rounded-xl bg-zinc-950/70 p-3 border border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "h-2.5 w-2.5 rounded-full shrink-0 " +
                          (act.hasFriendPunchedToday ? "bg-emerald-400 animate-pulse" : "bg-zinc-600")
                        }
                      />
                      {act.hasFriendPunchedToday ? (
                        <p className="text-zinc-200">
                          <span className="font-semibold text-emerald-300">{act.friend.name}</span> punched in today at{" "}
                          <span className="font-mono text-emerald-400 font-medium" suppressHydrationWarning>
                            {formatTimeOnly(act.friendPunchedAt)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-zinc-400">
                          <span className="font-medium text-zinc-300">{act.friend.name}</span> hasn&apos;t punched in today
                        </p>
                      )}
                    </div>

                    {/* Week count progress */}
                    {act.frequency === "X_TIMES_A_WEEK" && (
                      <span className="text-[11px] text-zinc-400">
                        Week:{" "}
                        <span className="text-indigo-300 font-semibold">
                          You ({act.userWeekCount}/{act.frequencyCount})
                        </span>{" "}
                        •{" "}
                        <span className="text-violet-300 font-semibold">
                          {act.friend.name} ({act.friendWeekCount}/{act.frequencyCount})
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Bottom: Mobile-First Big Punch-In Action Button */}
                  <div>
                    {act.hasUserPunchedToday ? (
                      <div className="w-full flex items-center justify-between rounded-xl bg-emerald-950/40 border border-emerald-600/40 px-4 py-2.5 text-xs text-emerald-300 font-medium">
                        <span className="flex items-center gap-2">
                          <span className="text-sm">✓</span>
                          <span>
                            You punched in today at{" "}
                            <span className="font-mono font-bold" suppressHydrationWarning>
                              {formatTimeOnly(act.userPunchedAt)}
                            </span>
                          </span>
                        </span>
                        <span className="text-[10px] text-emerald-400/80 font-normal">Resets daily</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isPendingThis}
                        onClick={() => handleQuickPunchIn(act.id)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs py-3 px-4 transition-all shadow-md hover:shadow-indigo-500/20 disabled:opacity-50"
                      >
                        {isPendingThis ? (
                          <span>Punching in...</span>
                        ) : (
                          <>
                            <span>⚡</span>
                            <span>Quick Punch In for Today</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <BottomNav
        unreadNotifications={stats.unreadNotificationsCount}
        pendingRequests={stats.pendingFriendRequestsCount}
      />
    </div>
  );
}
