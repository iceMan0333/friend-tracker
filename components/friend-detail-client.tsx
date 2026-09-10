"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogoIcon } from "./icons";
import {
  proposeActivity,
  acceptActivityProposal,
  declineActivityProposal,
  getSharedActivities,
} from "@/app/actions/activities";
import { sendMessage, getDirectMessages } from "@/app/actions/messages";

interface UserSummary {
  id: string;
  name: string;
  email: string;
  tag?: string | null;
  image?: string | null;
  bio?: string | null;
}

interface ActivityItem {
  id: number;
  title: string;
  creatorId: number;
  receiverId: number;
  startDate: string;
  endDate?: string | null;
  frequency: string;
  frequencyCount?: number | null;
  status: string;
  createdAt: string;
  creator: { id: number; name: string; tag?: string | null; image?: string | null };
  receiver: { id: number; name: string; tag?: string | null; image?: string | null };
}

interface MessageItem {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName: string;
}

interface FriendDetailClientProps {
  sessionUser: UserSummary;
  friend: UserSummary;
  initialActivities?: ActivityItem[];
  initialMessages?: MessageItem[];
}

export function FriendDetailClient({
  sessionUser,
  friend,
  initialActivities = [],
  initialMessages = [],
}: FriendDetailClientProps) {
  // Activities state
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<
    "DAILY" | "WEEKLY" | "X_TIMES_A_WEEK" | "MONTHLY"
  >("DAILY");
  const [frequencyCount, setFrequencyCount] = useState(3);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activitySuccess, setActivitySuccess] = useState("");

  // Chat state
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Periodic polling for live chat and activity status updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [msgsRes, actsRes] = await Promise.all([
          getDirectMessages(friend.id),
          getSharedActivities(friend.id),
        ]);

        if (msgsRes.success && msgsRes.messages) {
          setMessages(msgsRes.messages);
        }
        if (actsRes.success && actsRes.activities) {
          setActivities(actsRes.activities);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [friend.id]);

  // Handle proposing a new activity
  const handleProposeActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivityError("");
    setActivitySuccess("");
    setIsSubmittingProposal(true);

    if (!activityTitle.trim()) {
      setActivityError("Please enter an activity name.");
      setIsSubmittingProposal(false);
      return;
    }

    try {
      const res = await proposeActivity({
        friendId: friend.id,
        title: activityTitle,
        startDate,
        endDate: endDate ? endDate : undefined,
        frequency,
        frequencyCount: frequency === "X_TIMES_A_WEEK" ? frequencyCount : undefined,
      });

      if (res.error) {
        setActivityError(res.error);
      } else if (res.activity) {
        setActivities((prev) => [res.activity!, ...prev]);
        setActivitySuccess(`Activity proposal sent to ${friend.name}!`);
        setActivityTitle("");
        setEndDate("");
        setFrequency("DAILY");
        setIsAddingActivity(false);
        setTimeout(() => setActivitySuccess(""), 4000);
      }
    } catch (err) {
      console.error("Error submitting proposal:", err);
      setActivityError("Failed to send proposal. Please try again.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Handle accepting proposal
  const handleAcceptProposal = async (activityId: number) => {
    try {
      const res = await acceptActivityProposal(activityId);
      if (res.error) {
        setActivityError(res.error);
        return;
      }
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, status: "ACCEPTED" } : a))
      );
      setActivitySuccess(res.message || "Activity accepted!");
      setTimeout(() => setActivitySuccess(""), 4000);
    } catch (err) {
      console.error("Error accepting proposal:", err);
      setActivityError("Failed to accept proposal.");
    }
  };

  // Handle declining or cancelling proposal
  const handleDeclineProposal = async (activityId: number) => {
    try {
      const res = await declineActivityProposal(activityId);
      if (res.error) {
        setActivityError(res.error);
        return;
      }
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      setActivitySuccess(res.message || "Proposal removed.");
      setTimeout(() => setActivitySuccess(""), 4000);
    } catch (err) {
      console.error("Error removing proposal:", err);
      setActivityError("Failed to remove proposal.");
    }
  };

  // Handle sending chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || isSendingMessage) return;

    setIsSendingMessage(true);
    setMessageText("");

    try {
      const res = await sendMessage(friend.id, text);
      if (res.error) {
        console.error(res.error);
      } else if (res.message) {
        setMessages((prev) => [...prev, res.message!]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const pendingActivities = activities.filter((a) => a.status === "PENDING");
  const acceptedActivities = activities.filter((a) => a.status === "ACCEPTED");

  const formatFrequencyLabel = (freq: string, count?: number | null) => {
    switch (freq) {
      case "DAILY":
        return "Daily";
      case "WEEKLY":
        return "Weekly";
      case "X_TIMES_A_WEEK":
        return `${count || 2}x a week`;
      case "MONTHLY":
        return "Monthly";
      default:
        return freq;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-[#0a0a0a]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/friends"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>← Friends</span>
          </Link>
          <span className="text-zinc-800">|</span>

          {/* Both Users' Profile Pictures at the top */}
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              {/* Current User Avatar */}
              {sessionUser.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sessionUser.image}
                  alt={sessionUser.name || "Your avatar"}
                  className="h-10 w-10 rounded-full object-cover border-2 border-indigo-500 shadow-md shrink-0"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-full bg-zinc-600 border border-zinc-500/30 shadow-inner shrink-0"
                  title="Your avatar"
                />
              )}

              {/* Friend Avatar */}
              <Link
                href={`/profile/${friend.id}`}
                title={`View ${friend.name}'s profile`}
                className="hover:scale-105 transition-transform"
              >
                {friend.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.image}
                    alt={friend.name || "Friend avatar"}
                    className="h-10 w-10 rounded-full object-cover border-2 border-violet-500 shadow-md shrink-0"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-full bg-zinc-600 border border-zinc-500/30 shadow-inner shrink-0"
                    title="Friend avatar"
                  />
                )}
              </Link>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                  {friend.name}
                </span>
                {friend.tag && (
                  <span className="text-xs font-mono font-medium text-indigo-400">
                    {friend.tag}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Shared Accountability & Tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content: Split Two-Column Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Alerts */}
        {activitySuccess && (
          <div className="mb-6 rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-3 text-xs text-emerald-300">
            {activitySuccess}
          </div>
        )}
        {activityError && (
          <div className="mb-6 rounded-xl bg-rose-950/40 border border-rose-800/60 p-3 text-xs text-rose-300">
            {activityError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT COLUMN: ACTIVITIES ================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Header: Activities with + Icon */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Activities
                </h2>
                {activities.length > 0 && (
                  <span className="text-xs font-semibold text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                    {activities.length}
                  </span>
                )}
              </div>

              {/* + Icon Button to Add Activity */}
              <button
                type="button"
                onClick={() => {
                  setIsAddingActivity(!isAddingActivity);
                  setActivityError("");
                }}
                title="Add Activity"
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-md transition-all active:scale-95"
              >
                +
              </button>
            </div>

            {/* Modal / Slide-down Proposal Form */}
            {isAddingActivity && (
              <form
                onSubmit={handleProposeActivity}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Propose an Activity
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingActivity(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                {/* Activity Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Activity Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    placeholder="e.g. Gym Workout, Read 20 Pages, Coding Practice"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Dates: Start Date & Optional Finish Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Starting Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Finish Date <span className="text-zinc-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Frequency Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Frequency
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { key: "DAILY", label: "Daily" },
                        { key: "WEEKLY", label: "Weekly" },
                        { key: "X_TIMES_A_WEEK", label: "X times a week" },
                        { key: "MONTHLY", label: "Monthly" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFrequency(f.key)}
                        className={`rounded-lg py-2 px-3 text-xs font-medium border text-center transition-all ${
                          frequency === f.key
                            ? "bg-indigo-600/30 border-indigo-500 text-white font-semibold"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {frequency === "X_TIMES_A_WEEK" && (
                    <div className="mt-3 flex items-center gap-3 bg-zinc-800/60 p-3 rounded-lg border border-zinc-700/60">
                      <span className="text-xs text-zinc-300">Times per week:</span>
                      <div className="flex items-center gap-2">
                        {[2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setFrequencyCount(num)}
                            className={`h-7 w-7 rounded-md text-xs font-bold transition-colors ${
                              frequencyCount === num
                                ? "bg-indigo-600 text-white"
                                : "bg-zinc-700 text-zinc-300 hover:text-white"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingProposal}
                    className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 text-xs shadow-md transition-colors"
                  >
                    {isSubmittingProposal ? "Sending Proposal..." : "Send Activity Proposal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingActivity(false)}
                    className="rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* If no activities at all: show "no shared activities" */}
            {activities.length === 0 && !isAddingActivity && (
              <div className="rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/30 p-12 text-center">
                <p className="text-sm font-medium text-zinc-400">
                  no shared activities
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Click the + button above to propose your first activity together.
                </p>
              </div>
            )}

            {/* 1. Pending Activities Section (Top of the list) */}
            {pendingActivities.length > 0 && (
              <div className="space-y-3">
                {/* "pending activity" text on top of it that only appears when there is a pending activity */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    pending activity
                  </span>
                </div>

                <div className="space-y-3">
                  {pendingActivities.map((act) => {
                    const isReceiver =
                      act.receiverId === parseInt(sessionUser.id, 10);
                    return (
                      <div
                        key={act.id}
                        className="rounded-2xl border border-amber-500/30 bg-zinc-900/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-white">
                            {act.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-300 font-medium">
                              {formatFrequencyLabel(act.frequency, act.frequencyCount)}
                            </span>
                            <span>•</span>
                            <span>Starts: {new Date(act.startDate).toLocaleDateString()}</span>
                            {act.endDate && (
                              <>
                                <span>•</span>
                                <span>Finishes: {new Date(act.endDate).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 pt-0.5">
                            {isReceiver
                              ? `Proposed by ${act.creator.name}`
                              : `Waiting for ${friend.name} to accept...`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isReceiver ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptProposal(act.id)}
                                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 transition-colors shadow-sm"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeclineProposal(act.id)}
                                className="rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs px-3.5 py-2 transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeclineProposal(act.id)}
                              className="rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 font-semibold text-xs px-3 py-1.5 transition-colors"
                            >
                              Cancel Proposal
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Active (Accepted) Activities Section */}
            {acceptedActivities.length > 0 && (
              <div className="space-y-3 pt-2">
                {pendingActivities.length > 0 && (
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Active Activities
                  </h3>
                )}
                <div className="space-y-3">
                  {acceptedActivities.map((act) => (
                    <div
                      key={act.id}
                      className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-4 sm:p-5 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-white">
                          {act.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span className="rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 font-medium">
                            {formatFrequencyLabel(act.frequency, act.frequencyCount)}
                          </span>
                          <span>•</span>
                          <span>Started: {new Date(act.startDate).toLocaleDateString()}</span>
                          {act.endDate && (
                            <>
                              <span>•</span>
                              <span>Finishes: {new Date(act.endDate).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: CHAT BOX ================= */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 flex flex-col h-[580px] shadow-xl overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Friend Mini Avatar */}
                  {friend.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={friend.image}
                      alt={friend.name}
                      className="h-8 w-8 rounded-full object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-zinc-600 border border-zinc-500/30" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Chat with {friend.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500">
                      Direct Accountability Chat
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs text-zinc-400">
                      No messages yet.
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Send a message to cheer on {friend.name}!
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSelf = m.senderId === parseInt(sessionUser.id, 10);
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2 text-xs max-w-[82%] break-words shadow-sm ${
                            isSelf
                              ? "bg-indigo-600 text-white rounded-tr-sm"
                              : "bg-zinc-800 text-zinc-200 border border-zinc-700/60 rounded-tl-sm"
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-800/80 bg-zinc-900/90 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || isSendingMessage}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
