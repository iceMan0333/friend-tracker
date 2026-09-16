"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { CalendarIcon, CheckCircleIcon, XIcon } from "./icons";
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
  frequency: string;
  frequencyCount?: number | null;
  status: string;
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
  unreadNotifications?: number;
  pendingRequests?: number;
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

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
  unreadNotifications = 0,
  pendingRequests = 0,
}: FriendDetailClientProps) {
  const todayStr = getLocalDateString();

  // Mode on mobile: "chat" or "habits"
  const [mobileTab, setMobileTab] = useState<"chat" | "habits">("chat");

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

  // Floating Activities Bar state (collapsible)
  const [isFloatingActivitiesExpanded, setIsFloatingActivitiesExpanded] = useState(true);

  // Red Pending Proposals Floating Hover Card state
  const [showProposalsHover, setShowProposalsHover] = useState(false);

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
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(messages.length);

  // Scoped Auto-Scroll (ONLY inside the chat messages div, NEVER scrolling the window!)
  useEffect(() => {
    if (!chatMessagesContainerRef.current) return;
    const isNew = messages.length > prevMessagesCountRef.current;
    if (isNew || prevMessagesCountRef.current === 0) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
    prevMessagesCountRef.current = messages.length;
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

  // Propose activity handler
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

  // Accept proposal
  const handleAcceptProposal = async (activityId: number) => {
    try {
      const res = await acceptActivityProposal(activityId);
      if (res.error) {
        setActivityError(res.error);
        return;
      }
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

  // Decline proposal
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

  // Punch in
  const handlePunchIn = async (activityId: number) => {
    setPunchingInId(activityId);
    setActivityError("");
    const clientDate = getLocalDateString();

    try {
      const res = await punchInActivity({ activityId, clientDate });
      if (res.error) {
        setActivityError(res.error);
      } else {
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

  // Nudge friend action
  const handleNudgeFriend = async (activityTitle: string) => {
    const nudgeText = `Hey! Friendly reminder to punch in for ${activityTitle} today! 💪`;
    setIsSendingMessage(true);
    try {
      const res = await sendMessage(friend.id, nudgeText);
      if (res.message) {
        setMessages((prev) => [...prev, res.message!]);
        setActivitySuccess(`Nudge sent to ${friend.name}!`);
        setTimeout(() => setActivitySuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Open calendar
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

  // Send chat message
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

  // Activities needing punch in today by user
  const uncompletedTodayActivities = acceptedActivities.filter((a) => !a.hasUserPunchedToday);

  // Calendar render days
  const renderCalendarDays = () => {
    if (!calendarModal) return null;

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const today = getLocalDateString();
    const activityStart = calendarModal.startDate;
    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 sm:h-12" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const currentMonthStr = String(month + 1).padStart(2, "0");
      const currentDayStr = String(day).padStart(2, "0");
      const dateStr = `${year}-${currentMonthStr}-${currentDayStr}`;

      const punchData = calendarModal.punchMap[dateStr];
      const userPunched = punchData?.userPunched || false;
      const friendPunched = punchData?.friendPunched || false;

      const isBeforeStart = dateStr < activityStart;
      const isFuture = dateStr > today;

      let dayType: "green" | "yellow" | "red" | "plain" = "plain";
      let yellowDetails = "";

      if (!isBeforeStart && !isFuture) {
        if (userPunched && friendPunched) {
          dayType = "green";
        } else if (userPunched || friendPunched) {
          dayType = "yellow";
          if (userPunched) {
            yellowDetails = `${sessionUser.name} punched in at ${formatTimeOnly(punchData.userTime)} • ${friend.name} missed`;
          } else {
            yellowDetails = `${friend.name} punched in at ${formatTimeOnly(punchData.friendTime)} • ${sessionUser.name} missed`;
          }
        } else {
          const mondayStr = getMondayOfDate(dateStr);
          const weekCount = calendarModal.weekCounts[mondayStr] || { userCount: 0, friendCount: 0 };
          const target = calendarModal.target;
          const weekGoalMet = weekCount.userCount >= target && weekCount.friendCount >= target;

          if (weekGoalMet) {
            dayType = "plain";
          } else {
            dayType = "red";
          }
        }
      }

      let cellClass = "h-10 sm:h-12 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all ";

      if (dayType === "green") {
        cellClass += "bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400";
      } else if (dayType === "yellow") {
        cellClass += "bg-amber-500 text-black shadow-sm ring-1 ring-amber-400 cursor-pointer hover:scale-105 active:scale-95";
      } else if (dayType === "red") {
        cellClass += "bg-rose-600 text-white shadow-sm ring-1 ring-rose-500";
      } else {
        cellClass += "text-white bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800";
      }

      days.push(
        <button
          key={dateStr}
          type="button"
          disabled={dayType !== "yellow"}
          onClick={() => {
            if (dayType === "yellow") {
              setSelectedYellowDate({ dateStr, info: yellowDetails });
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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-20 md:pb-8">
      {/* Universal Top Navigation Header */}
      <AppHeader
        sessionUser={sessionUser}
        unreadNotifications={unreadNotifications}
        pendingRequests={pendingRequests}
        activeTab="messages"
      />

      {/* Friend Subheader Bar */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back Link & Friend Profile Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/friends"
              className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition active:scale-95 shrink-0"
              title="Back to Friends"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            <Link
              href={`/profile/${friend.id}`}
              className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition"
              title={`View ${friend.name}'s profile`}
            >
              <div className="relative shrink-0">
                {friend.image ? (
                  <img
                    src={friend.image}
                    alt={friend.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-sm sm:text-base text-white group-hover:text-indigo-300 transition truncate">
                    {friend.name}
                  </span>
                  {friend.tag && (
                    <span className="text-xs font-mono text-indigo-400 hidden sm:inline truncate">
                      {friend.tag}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {acceptedActivities.length} shared habit{acceptedActivities.length !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          </div>

          {/* Right Actions: Red Pending Proposals Button & Mobile Tab Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* RED PENDING PROPOSALS ICON: Only shows when there are pending proposals */}
            {pendingActivities.length > 0 && (
              <button
                type="button"
                onClick={() => setShowProposalsHover(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 shadow-lg shadow-rose-500/20 hover:bg-rose-500/30 transition active:scale-95 animate-pulse"
                title="View Pending Proposals"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                <span>{pendingActivities.length} Proposal{pendingActivities.length > 1 ? "s" : ""}</span>
              </button>
            )}

            {/* Mobile Segmented View Toggle (Chat vs Habits) */}
            <div className="flex lg:hidden bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMobileTab("chat")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  mobileTab === "chat"
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("habits")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  mobileTab === "habits"
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Habits</span>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded-full text-zinc-300">
                  {acceptedActivities.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col">
        {/* Status Alerts */}
        {activitySuccess && (
          <div className="mb-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 p-3 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{activitySuccess}</span>
          </div>
        )}
        {activityError && (
          <div className="mb-4 rounded-xl bg-rose-950/50 border border-rose-500/40 p-3 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{activityError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
          {/* ================= LEFT: HABITS & CALENDAR (Visible on desktop or when mobileTab === 'habits') ================= */}
          <div className={`lg:col-span-6 space-y-5 ${mobileTab === "habits" ? "block" : "hidden lg:block"}`}>
            {/* Header: Habits with Add button */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Shared Habits
                </h2>
                <span className="text-xs font-semibold text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                  {acceptedActivities.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAddingActivity(!isAddingActivity);
                  setActivityError("");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition active:scale-95 shadow-md shadow-indigo-600/20"
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>Propose Habit</span>
              </button>
            </div>

            {/* Propose Habit Form */}
            {isAddingActivity && (
              <form
                onSubmit={handleProposeActivity}
                className="rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-4 sm:p-5 space-y-4 shadow-xl animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Propose an Activity</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingActivity(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    ✕ Cancel
                  </button>
                </div>

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
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Minimum Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFrequency("DAILY")}
                      className={`rounded-xl p-3 border text-left transition-all ${
                        frequency === "DAILY"
                          ? "border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50"
                          : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="font-semibold text-xs block">Daily</span>
                      <span className="text-[11px] text-zinc-500">Every single day</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFrequency("X_TIMES_A_WEEK")}
                      className={`rounded-xl p-3 border text-left transition-all ${
                        frequency === "X_TIMES_A_WEEK"
                          ? "border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50"
                          : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="font-semibold text-xs block">Times per Week</span>
                      <span className="text-[11px] text-zinc-500">Flexible target</span>
                    </button>
                  </div>
                </div>

                {frequency === "X_TIMES_A_WEEK" && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Target Days per Week: {frequencyCount}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={frequencyCount}
                      onChange={(e) => setFrequencyCount(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingActivity(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProposal}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isSubmittingProposal ? "Proposing..." : "Send Proposal"}
                  </button>
                </div>
              </form>
            )}

            {/* List of Accepted Habits */}
            {acceptedActivities.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <CalendarIcon className="w-6 h-6 opacity-40" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">No active habits yet</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Propose your first shared habit to track progress, cheer each other on, and build daily consistency!
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingActivity(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  Propose a Habit
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {acceptedActivities.map((act) => {
                  const isGoalMet = Boolean(act.isGoalReached);

                  return (
                    <div
                      key={act.id}
                      className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
                        isGoalMet
                          ? "bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                          : "bg-zinc-900/60 border-zinc-800/80"
                      }`}
                    >
                      {/* Top: Title, Frequency & Calendar Icon */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base sm:text-lg text-white">{act.title}</h4>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {act.frequency === "DAILY" ? "Daily Goal" : `Min ${act.frequencyCount}x / week`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isGoalMet && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                              Goal Reached!
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenCalendar(act.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Inspect Habit Calendar"
                          >
                            <CalendarIcon className="h-4 w-4 text-indigo-400" />
                          </button>
                        </div>
                      </div>

                      {/* Friend Status & Weekly Counts */}
                      <div className="mb-3 rounded-xl bg-zinc-950/70 p-2.5 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              act.hasFriendPunchedToday ? "bg-emerald-400" : "bg-zinc-600"
                            }`}
                          />
                          {act.hasFriendPunchedToday ? (
                            <p className="text-zinc-200">
                              <span className="font-semibold text-emerald-300">{friend.name}</span> punched in today at{" "}
                              <span className="font-mono text-emerald-400" suppressHydrationWarning>
                                {formatTimeOnly(act.friendPunchedAt)}
                              </span>
                            </p>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="text-zinc-400">
                                <span className="font-medium text-zinc-300">{friend.name}</span> hasn&apos;t punched in today
                              </p>
                              <button
                                type="button"
                                onClick={() => handleNudgeFriend(act.title)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition active:scale-95"
                                title="Send reminder message in chat"
                              >
                                <span>⚡ Nudge</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {act.frequency === "X_TIMES_A_WEEK" && (
                          <span className="text-[11px] text-zinc-400">
                            Week: <span className="text-indigo-300 font-medium">You ({act.userWeekCount || 0}/{act.frequencyCount})</span> •{" "}
                            <span className="text-violet-300 font-medium">{friend.name} ({act.friendWeekCount || 0}/{act.frequencyCount})</span>
                          </span>
                        )}
                      </div>

                      {/* Bottom: Punch In Action */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-zinc-400">
                          {act.hasUserPunchedToday ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              <span>Punched in at {formatTimeOnly(act.userPunchedAt)}</span>
                            </span>
                          ) : (
                            "Resets daily. Punch in when completed."
                          )}
                        </span>

                        <button
                          type="button"
                          disabled={act.hasUserPunchedToday || punchingInId === act.id}
                          onClick={() => handlePunchIn(act.id)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                            act.hasUserPunchedToday
                              ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 cursor-pointer shadow-indigo-600/20"
                          }`}
                        >
                          {punchingInId === act.id ? (
                            "Punching In..."
                          ) : act.hasUserPunchedToday ? (
                            <>
                              <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Done Today</span>
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
            )}
          </div>

          {/* ================= RIGHT: CHAT BOX & FLOATING ACTIVITIES ================= */}
          <div className={`lg:col-span-6 flex flex-col ${mobileTab === "chat" ? "block" : "hidden lg:block"}`}>
            {/* Chat Container Box */}
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/70 flex flex-col h-[calc(100dvh-175px)] sm:h-[620px] shadow-2xl relative overflow-hidden">
              
              {/* 1. FLOATING ACTIVITIES BAR OVER TOP OF CHATBOX */}
              {uncompletedTodayActivities.length > 0 ? (
                <div className="border-b border-indigo-500/30 bg-gradient-to-r from-zinc-950 via-indigo-950/30 to-zinc-950 px-3.5 py-2.5 shadow-md relative z-20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-white tracking-tight">
                        Today&apos;s Habits ({uncompletedTodayActivities.length} to do)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFloatingActivitiesExpanded(!isFloatingActivitiesExpanded)}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition"
                    >
                      <span>{isFloatingActivitiesExpanded ? "Hide" : "Show"}</span>
                      <span>{isFloatingActivitiesExpanded ? "▲" : "▼"}</span>
                    </button>
                  </div>

                  {isFloatingActivitiesExpanded && (
                    <div className="space-y-2 mt-2">
                      {uncompletedTodayActivities.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/90 shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-white truncate">
                                {act.title}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                ({act.frequency === "DAILY" ? "Daily" : `${act.frequencyCount}x/wk`})
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {act.hasFriendPunchedToday ? (
                                <span className="text-emerald-400 font-medium">
                                  {friend.name} punched at {formatTimeOnly(act.friendPunchedAt)}
                                </span>
                              ) : (
                                <span className="text-zinc-500">
                                  {friend.name} waiting for punch-in
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!act.hasFriendPunchedToday && (
                              <button
                                type="button"
                                onClick={() => handleNudgeFriend(act.title)}
                                className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition active:scale-95"
                                title="Nudge friend in chat"
                              >
                                ⚡ Nudge
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={punchingInId === act.id}
                              onClick={() => handlePunchIn(act.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition"
                            >
                              {punchingInId === act.id ? "..." : "Punch In"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : acceptedActivities.length > 0 ? (
                /* Sleek, collapsed completed indicator */
                <div className="border-b border-zinc-800/80 bg-zinc-950/60 px-3.5 py-2 flex items-center justify-between text-xs text-emerald-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All habits completed for today! 🎉</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileTab("habits")}
                    className="text-[11px] text-zinc-400 hover:text-white underline"
                  >
                    View habits
                  </button>
                </div>
              ) : null}

              {/* 2. CHAT MESSAGES SCROLL CONTAINER (Internal Scroll Only!) */}
              <div
                ref={chatMessagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-2 text-zinc-500">
                      <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-xs text-zinc-300 font-medium">No messages yet.</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Say hi to {friend.name} and stay on track together!
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
                          className={`rounded-2xl px-4 py-2 text-xs max-w-[84%] break-words shadow-sm ${
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
              </div>

              {/* 3. DOCKED MESSAGE INPUT (Docked at bottom of chat) */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-800/80 bg-zinc-950/95 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || isSendingMessage}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 transition active:scale-95 shadow-md shadow-indigo-600/20"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ================= FLOATING HOVER CARD FOR PENDING PROPOSALS ================= */}
      {showProposalsHover && pendingActivities.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header with explicit CLOSE [✕] button */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Pending Proposals ({pendingActivities.length})
                </h3>
              </div>

              {/* Cross button so user can close without accepting or declining */}
              <button
                type="button"
                onClick={() => setShowProposalsHover(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition active:scale-95"
                title="Close without accepting or declining"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* List of pending proposals */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingActivities.map((act) => {
                const isReceiver = act.receiverId === parseInt(sessionUser.id, 10);

                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-white">{act.title}</h4>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                          {act.frequency === "DAILY" ? "Daily" : `${act.frequencyCount}x / wk`}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {isReceiver ? `Proposed by ${act.creator.name}` : `Waiting for ${friend.name} to accept...`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {isReceiver ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleAcceptProposal(act.id);
                              if (pendingActivities.length <= 1) setShowProposalsHover(false);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-600/20 active:scale-95"
                          >
                            Accept Habit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeclineProposal(act.id);
                              if (pendingActivities.length <= 1) setShowProposalsHover(false);
                            }}
                            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition active:scale-95"
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handleDeclineProposal(act.id);
                            if (pendingActivities.length <= 1) setShowProposalsHover(false);
                          }}
                          className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 text-xs font-semibold transition active:scale-95"
                        >
                          Cancel Proposal
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer close button */}
            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowProposalsHover(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CALENDAR MODAL ================= */}
      {calendarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between border-y border-zinc-800 py-2.5 px-1">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                  )
                }
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                ← Prev
              </button>

              <span className="text-sm font-bold text-white" suppressHydrationWarning>
                {calendarMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                  )
                }
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                Next →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-zinc-500 uppercase">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {renderCalendarDays()}
            </div>

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

            <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Both punched in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span>One punched in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-600" />
                <span>Missed day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-zinc-700 border border-zinc-500" />
                <span>Rest day (goal met)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab="messages"
        unreadNotifications={unreadNotifications}
        pendingRequests={pendingRequests}
      />
    </div>
  );
}
