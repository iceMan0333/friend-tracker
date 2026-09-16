"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { NotificationItem, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/actions/notifications";
import { acceptActivityProposal, declineActivityProposal } from "@/app/actions/activities";

interface NotificationsClientProps {
  sessionUser: {
    id: number;
    name: string;
    tag?: string | null;
    image?: string | null;
  };
  initialNotifications: NotificationItem[];
  unreadCount: number;
  pendingFriendRequestsCount: number;
}

export function NotificationsClient({
  sessionUser,
  initialNotifications,
  unreadCount: initialUnreadCount,
  pendingFriendRequestsCount,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await markNotificationAsRead(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptProposal = async (notification: NotificationItem) => {
    if (!notification.activityId) return;
    setProcessingId(notification.id);
    setActionSuccessMsg(null);

    try {
      const res = await acceptActivityProposal(notification.activityId);
      if (res.success) {
        setActionSuccessMsg(res.message || "Proposal accepted!");
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true, type: "ACTIVITY_ACCEPTED_DONE" } : n
          )
        );
        setTimeout(() => setActionSuccessMsg(null), 4000);
      } else {
        alert(res.error || "Failed to accept proposal.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong accepting proposal.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineProposal = async (notification: NotificationItem) => {
    if (!notification.activityId) return;
    setProcessingId(notification.id);

    try {
      const res = await declineActivityProposal(notification.activityId);
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      } else {
        alert(res.error || "Failed to decline proposal.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong declining proposal.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ACTIVITY_PROPOSAL":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          </div>
        );
      case "ACTIVITY_ACCEPTED":
      case "ACTIVITY_ACCEPTED_DONE":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "FRIEND_REQUEST":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "FRIEND_ACCEPTED":
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col font-sans pb-24 md:pb-12">
      <AppHeader
        sessionUser={sessionUser}
        unreadNotifications={unreadCount}
        pendingRequests={pendingFriendRequestsCount}
        activeTab="notifications"
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Banner Alert if any success message */}
        {actionSuccessMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-300">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{actionSuccessMsg}</span>
          </div>
        )}

        {/* Page Title & Mark All Read */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-600 text-white rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">Stay updated on shared habits and friends</p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 hover:text-white border border-zinc-700/60 transition active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7m-4 6l4 4L23 7" />
              </svg>
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={"px-4 py-1.5 rounded-full text-xs font-semibold transition-all " + (
              filter === "all"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={"px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 " + (
              filter === "unread"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-500">
              <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-200">All caught up!</h3>
              <p className="text-sm text-zinc-500 mt-1">
                {filter === "unread"
                  ? "No unread notifications at the moment."
                  : "You do not have any notifications yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              // An activity proposal is truly pending only if the activity status is PENDING and not yet accepted/declined
              const isProposal = n.type === "ACTIVITY_PROPOSAL" && n.activity?.status === "PENDING";
              const isAcceptedDone = n.type === "ACTIVITY_ACCEPTED_DONE" || (n.type === "ACTIVITY_PROPOSAL" && n.activity?.status === "ACCEPTED");
              const isNoLongerAvailable = n.type === "ACTIVITY_PROPOSAL" && (!n.activity || n.activity.status === "DECLINED");

              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={"relative p-4 rounded-2xl border transition-all " + (
                    n.isRead
                      ? "bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700/60"
                      : "bg-zinc-900/90 border-indigo-500/30 shadow-sm shadow-indigo-950/20 hover:border-indigo-500/50"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Actor Avatar / Icon */}
                    {n.actor?.image ? (
                      <img
                        src={n.actor.image}
                        alt={n.actor.name}
                        className="w-10 h-10 rounded-xl object-cover border border-zinc-700 shrink-0"
                      />
                    ) : (
                      getNotificationIcon(n.type)
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-white">{n.title}</span>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20 shrink-0" />
                          )}
                        </div>
                        <span
                          suppressHydrationWarning
                          className="text-[11px] text-zinc-500 shrink-0 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(n.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{n.message}</p>

                      {/* Special Action UI for Activity Proposals */}
                      {isProposal && (
                        <div className="mt-3 p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2.5">
                          {n.activity && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Proposed Habit:</span>
                              <span className="font-medium text-white">{n.activity.title}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              disabled={processingId === n.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptProposal(n);
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Accept Habit</span>
                            </button>
                            <button
                              disabled={processingId === n.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeclineProposal(n);
                              }}
                              className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* State if proposal was accepted */}
                      {isAcceptedDone && (
                        <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg w-fit">
                          <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Habit accepted & active</span>
                        </div>
                      )}

                      {/* State if proposal is no longer available or was declined */}
                      {isNoLongerAvailable && !isAcceptedDone && (
                        <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1.5 italic">
                          <span>Proposal has ended or was declined</span>
                        </div>
                      )}

                      {/* Standard navigation link for other types */}
                      {!isProposal && !isAcceptedDone && n.link && (
                        <div className="mt-2">
                          <Link
                            href={n.link}
                            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
                          >
                            <span>View details</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav
        activeTab="notifications"
        unreadNotifications={unreadCount}
        pendingRequests={pendingFriendRequestsCount}
      />
    </div>
  );
}
