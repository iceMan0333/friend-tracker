"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogoIcon, CalendarIcon, CheckCircleIcon, XIcon } from "./icons";
import {
  proposeActivity,
  acceptActivityProposal,
  declineActivityProposal,
  getSharedActivities,
  punchInActivity,
  getActivityCalendarData,
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
  frequency: string; // "DAILY" | "X_TIMES_A_WEEK"
  frequencyCount?: number | null;
  status: string; // "PENDING" | "ACCEPTED"
  createdAt: string;
  creator: { id: number; name: string; tag?: string | null; image?: string | null };
  receiver: { id: number; name: string; tag?: string | null; image?: string | null };
  hasUserPunchedToday?: boolean;
  userPunchedAt?: string | null;
  hasFriendPunchedToday?: boolean;
  friendPunchedAt?: string | null;
  userWeekCount?: number;
  friendWeekCount?: number;
  isGoalReached?: boolean;
}

interface MessageItem {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  senderName: string;
}

interface CalendarModalData {
  activityId: number;
  title: string;
  startDate: string;
  frequency: string;
  frequencyCount?: number | null;
  target: number;
  punchMap: Record<
    string,
    {
      userPunched: boolean;
      userTime?: string;
      friendPunched: boolean;
      friendTime?: string;
    }
  >;
  weekCounts: Record<string, { userCount: number; friendCount: number }>;
}

interface FriendDetailClientProps {
  sessionUser: UserSummary;
  friend: UserSummary;
  initialActivities?: ActivityItem[];
  initialMessages?: MessageItem[];
}

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to format timestamp deterministically into 12-hour time (e.g. "8:45 AM")
function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Helper to format date string deterministically (e.g. "Sep 10, 2026")
function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// Helper to get Monday of the week for a YYYY-MM-DD string
function getMondayOfDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return getLocalDateString(monday);
}

export function FriendDetailClient({
  sessionUser,
  friend,
  initialActivities = [],
  initialMessages = [],
}: FriendDetailClientProps) {
  const todayStr = getLocalDateString();

  // Activities state
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<"DAILY" | "X_TIMES_A_WEEK">("DAILY");
  const [frequencyCount, setFrequencyCount] = useState(3);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activitySuccess, setActivitySuccess] = useState("");

  // Punch-in processing state
  const [punchingInId, setPunchingInId] = useState<number | null>(null);

  // Calendar modal state
  const [calendarModal, setCalendarModal] = useState<CalendarModalData | null>(null);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedYellowDate, setSelectedYellowDate] = useState<{
    dateStr: string;
    info: string;
  } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Periodic polling for activities and chat
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [msgsRes, actsRes] = await Promise.all([
          getDirectMessages(friend.id),
          getSharedActivities(friend.id, getLocalDateString()),
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

  // Handle proposing activity with minimum frequency
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
        frequencyCount: frequency === "X_TIMES_A_WEEK" ? frequencyCount : 7,
      });

      if (res.error) {
        setActivityError(res.error);
      } else if (res.activity) {
        setActivities((prev) => [res.activity!, ...prev]);
        setActivitySuccess(`Activity proposal sent to ${friend.name}!`);
        setActivityTitle("");
        setEndDate("");
        setFrequency("DAILY");
        setFrequencyCount(3);
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
      // Refresh activities to populate current punch-in state
      const refreshed = await getSharedActivities(friend.id, getLocalDateString());
      if (refreshed.activities) {
        setActivities(refreshed.activities);
      }
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

  // Handle punch-in for today
  const handlePunchIn = async (activityId: number) => {
    setPunchingInId(activityId);
    setActivityError("");
    const clientDate = getLocalDateString();

    try {
      const res = await punchInActivity({ activityId, clientDate });
      if (res.error) {
        setActivityError(res.error);
      } else {
        // Refresh activities to update punch-in and goal reached status
        const refreshed = await getSharedActivities(friend.id, clientDate);
        if (refreshed.activities) {
          setActivities(refreshed.activities);
        }
        setActivitySuccess("Punched in successfully for today!");
        setTimeout(() => setActivitySuccess(""), 4000);
      }
    } catch (err) {
      console.error("Punch in error:", err);
      setActivityError("Failed to punch in. Please try again.");
    } finally {
      setPunchingInId(null);
    }
  };

  // Open Calendar Modal
  const handleOpenCalendar = async (activityId: number) => {
    setIsLoadingCalendar(true);
    setSelectedYellowDate(null);
    setCalendarMonth(new Date());

    try {
      const res = await getActivityCalendarData(activityId);
      if (res.success && res.activity) {
        setCalendarModal({
          activityId: res.activity.id,
          title: res.activity.title,
          startDate: res.activity.startDate,
          frequency: res.activity.frequency,
          frequencyCount: res.activity.frequencyCount,
          target: res.target,
          punchMap: res.punchMap,
          weekCounts: res.weekCounts,
        });
      }
    } catch (err) {
      console.error("Error loading calendar:", err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Handle chat sending
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

  // ================= Calendar Rendering Helpers =================
  const renderCalendarDays = () => {
    if (!calendarModal) return null;

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth(); // 0-indexed

    // First day of month & number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Day of week offset: Monday is 0, Sunday is 6
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const today = getLocalDateString();
    const activityStart = calendarModal.startDate;

    const days = [];

    // Empty placeholder cells before 1st of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 sm:h-12" />);
    }

    // Days 1..totalDays
    for (let day = 1; day <= totalDays; day++) {
      const currentMonthStr = String(month + 1).padStart(2, "0");
      const currentDayStr = String(day).padStart(2, "0");
      const dateStr = `${year}-${currentMonthStr}-${currentDayStr}`;

      const punchData = calendarModal.punchMap[dateStr];
      const userPunched = punchData?.userPunched || false;
      const friendPunched = punchData?.friendPunched || false;

      const isBeforeStart = dateStr < activityStart;
      const isFuture = dateStr > today;

      // Color logic:
      // Default: "plain"
      let dayType: "green" | "yellow" | "red" | "plain" = "plain";
      let yellowDetails = "";

      if (!isBeforeStart && !isFuture) {
        if (userPunched && friendPunched) {
          // Both users punched in -> Green
          dayType = "green";
        } else if (userPunched || friendPunched) {
          // Exactly one user punched in -> Yellow
          dayType = "yellow";
          if (userPunched) {
            yellowDetails = `${sessionUser.name} punched in at ${formatTimeOnly(
              punchData.userTime
            )} • ${friend.name} missed`;
          } else {
            yellowDetails = `${friend.name} punched in at ${formatTimeOnly(
              punchData.friendTime
            )} • ${sessionUser.name} missed`;
          }
        } else {
          // Neither punched in:
          // Check if for that week, the minimum frequency was reached by both users
          const mondayStr = getMondayOfDate(dateStr);
          const weekCount = calendarModal.weekCounts[mondayStr] || {
            userCount: 0,
            friendCount: 0,
          };

          const target = calendarModal.target;
          const weekGoalMet =
            weekCount.userCount >= target && weekCount.friendCount >= target;

          if (weekGoalMet) {
            // "if for a week the minimum frequency is reached by both users the days where neither users punched in will not be highlighted and just show plain white date."
            dayType = "plain";
          } else {
            // Missed day -> Red
            dayType = "red";
          }
        }
      }

      // Styles based on dayType
      let cellClass =
        "h-10 sm:h-12 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all ";

      if (dayType === "green") {
        cellClass +=
          "bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400";
      } else if (dayType === "yellow") {
        cellClass +=
          "bg-amber-500 text-black shadow-sm ring-1 ring-amber-400 cursor-pointer hover:scale-105 active:scale-95";
      } else if (dayType === "red") {
        cellClass += "bg-rose-600 text-white shadow-sm ring-1 ring-rose-500";
      } else {
        // Plain white date style
        cellClass +=
          "text-white bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800";
      }

      days.push(
        <button
          key={dateStr}
          type="button"
          disabled={dayType !== "yellow"}
          onClick={() => {
            if (dayType === "yellow") {
              setSelectedYellowDate({
                dateStr,
                info: yellowDetails,
              });
            }
          }}
          title={
            dayType === "yellow"
              ? yellowDetails
              : dayType === "green"
              ? "Both punched in"
              : dayType === "red"
              ? "Missed day"
              : ""
          }
          className={cellClass}
        >
          {day}
        </button>
      );
    }

    return days;
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

          {/* Both Users' Profile Pictures at top */}
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              {/* User Avatar */}
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
                Shared Accountability & Activities
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

            {/* Proposal Form (Asking for Minimum Frequency: Daily or X times per week) */}
            {isAddingActivity && (
              <form
                onSubmit={handleProposeActivity}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 space-y-4 shadow-xl"
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
                    placeholder="e.g. Morning Workout, Daily Reading..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Minimum Frequency */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Minimum Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFrequency("DAILY")}
                      className={`rounded-xl py-2.5 px-3 text-xs font-semibold border text-center transition-all ${
                        frequency === "DAILY"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequency("X_TIMES_A_WEEK")}
                      className={`rounded-xl py-2.5 px-3 text-xs font-semibold border text-center transition-all ${
                        frequency === "X_TIMES_A_WEEK"
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                    >
                      X Times per Week
                    </button>
                  </div>

                  {frequency === "X_TIMES_A_WEEK" && (
                    <div className="mt-3 flex items-center justify-between bg-zinc-800/80 p-3 rounded-xl border border-zinc-700">
                      <span className="text-xs text-zinc-300">Minimum times per week:</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setFrequencyCount(num)}
                            className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                              frequencyCount === num
                                ? "bg-indigo-600 text-white shadow-sm"
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

                {/* Dates: Start & Optional Finish */}
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

                {/* Submit / Cancel */}
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

            {/* Empty state: "no shared activities" */}
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
                {/* "pending activity" label on top that only appears when there is a pending activity */}
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
                              {act.frequency === "DAILY"
                                ? "Daily"
                                : `${act.frequencyCount || 3}x a week`}
                            </span>
                            <span>•</span>
                            <span suppressHydrationWarning>
                              Starts: {formatDateOnly(act.startDate)}
                            </span>
                            {act.endDate && (
                              <>
                                <span>•</span>
                                <span suppressHydrationWarning>
                                  Finishes: {formatDateOnly(act.endDate)}
                                </span>
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

            {/* 2. Active Activities Section */}
            {acceptedActivities.length > 0 && (
              <div className="space-y-4 pt-2">
                {pendingActivities.length > 0 && (
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Active Activities
                  </h3>
                )}

                <div className="space-y-4">
                  {acceptedActivities.map((act) => {
                    const isGreen = Boolean(act.isGoalReached);

                    return (
                      <div
                        key={act.id}
                        className={`rounded-2xl p-5 border transition-all duration-300 ${
                          isGreen
                            ? "bg-emerald-950/25 border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                            : "bg-zinc-900/70 border-zinc-800/90 shadow-sm"
                        }`}
                      >
                        {/* Top row: Title + Calendar Icon + Goal Reached Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-bold text-lg text-white tracking-tight">
                              {act.title}
                            </h4>

                            {/* Calendar icon button next to activity */}
                            <button
                              type="button"
                              onClick={() => handleOpenCalendar(act.id)}
                              title="View Activity Calendar"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                              <CalendarIcon className="h-4 w-4 text-indigo-400" />
                            </button>

                            {/* Frequency badge */}
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {act.frequency === "DAILY"
                                ? "Daily Goal"
                                : `Min ${act.frequencyCount}x / week`}
                            </span>
                          </div>

                          {/* Green Goal Reached Indicator */}
                          {isGreen && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full shrink-0 shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Goal Reached!
                            </span>
                          )}
                        </div>

                        {/* Mid row: Friend's punch in status for today with exact time */}
                        <div className="mb-4 rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                act.hasFriendPunchedToday
                                  ? "bg-emerald-400"
                                  : "bg-zinc-600"
                              }`}
                            />
                            {act.hasFriendPunchedToday ? (
                              <p className="text-zinc-200">
                                <span className="font-semibold text-emerald-300">
                                  {friend.name}
                                </span>{" "}
                                punched in today at{" "}
                                <span className="font-mono text-emerald-400 font-medium" suppressHydrationWarning>
                                  {formatTimeOnly(act.friendPunchedAt)}
                                </span>
                              </p>
                            ) : (
                              <p className="text-zinc-400">
                                <span className="font-medium text-zinc-300">
                                  {friend.name}
                                </span>{" "}
                                hasn&apos;t punched in today
                              </p>
                            )}
                          </div>

                          {act.frequency === "X_TIMES_A_WEEK" && (
                            <span className="text-[11px] text-zinc-400">
                              Week progress:{" "}
                              <span className="text-indigo-300 font-semibold">
                                You ({act.userWeekCount || 0}/{act.frequencyCount})
                              </span>{" "}
                              •{" "}
                              <span className="text-violet-300 font-semibold">
                                {friend.name} ({act.friendWeekCount || 0}/
                                {act.frequencyCount})
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Bottom row: User's punch in button */}
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <div className="text-xs text-zinc-400">
                            {act.hasUserPunchedToday ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                <CheckCircleIcon className="h-4 w-4" />
                                <span>
                                  You punched in today at{" "}
                                  <span className="font-mono" suppressHydrationWarning>
                                    {formatTimeOnly(act.userPunchedAt)}
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400">
                                Resets daily. Ready to complete today?
                              </span>
                            )}
                          </div>

                          {/* Punch in button (Always available each day even if goal exceeded) */}
                          <button
                            type="button"
                            disabled={
                              act.hasUserPunchedToday || punchingInId === act.id
                            }
                            onClick={() => handlePunchIn(act.id)}
                            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                              act.hasUserPunchedToday
                                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 cursor-pointer"
                            }`}
                          >
                            {punchingInId === act.id ? (
                              "Punching In..."
                            ) : act.hasUserPunchedToday ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                                <span>Punched In</span>
                              </>
                            ) : (
                              "Punch In"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: CHAT BOX ================= */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 flex flex-col h-[600px] shadow-xl overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
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
                    <p className="text-xs text-zinc-400">No messages yet.</p>
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
                        className={`flex flex-col ${
                          isSelf ? "items-end" : "items-start"
                        }`}
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
                        <span
                          className="text-[10px] text-zinc-500 mt-1 px-1"
                          suppressHydrationWarning
                        >
                          {formatTimeOnly(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Message Input */}
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

      {/* ================= CALENDAR VIEW MODAL ================= */}
      {calendarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {calendarModal.title}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {calendarModal.frequency === "DAILY"
                    ? "Minimum Frequency: Daily"
                    : `Minimum Frequency: ${calendarModal.frequencyCount} times per week`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCalendarModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between border-y border-zinc-800/80 py-2.5 px-1">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1
                    )
                  )
                }
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                ← Prev
              </button>

              <span className="text-sm font-bold text-white" suppressHydrationWarning>
                {calendarMonth.toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                      1
                    )
                  )
                }
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Next →
              </button>
            </div>

            {/* Calendar Day Labels */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-zinc-500 uppercase">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {renderCalendarDays()}
            </div>

            {/* Yellow date detail inspection popup */}
            {selectedYellowDate && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs flex items-center justify-between gap-2">
                <div className="text-amber-300">
                  <span className="font-bold">{selectedYellowDate.dateStr}: </span>
                  {selectedYellowDate.info}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedYellowDate(null)}
                  className="text-amber-400 hover:text-white text-xs font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Legend */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Both punched in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span>One punched in (click for info)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-600" />
                <span>Both missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-zinc-700 border border-zinc-500" />
                <span>Rest day (goal met)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
