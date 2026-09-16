"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from "@/app/actions/friends";

interface Friend {
  id: string;
  email: string;
  name?: string;
  tag?: string | null;
  image?: string | null;
}

interface FriendRequestItem {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderTag?: string | null;
  senderImage?: string | null;
  createdAt: string;
}

interface FriendsClientProps {
  sessionUser?: {
    name?: string | null;
    email?: string | null;
    id?: string;
    tag?: string | null;
    image?: string | null;
  };
  initialFriends?: Friend[];
  initialRequests?: FriendRequestItem[];
  unreadNotifications?: number;
}

export function FriendsClient({
  sessionUser,
  initialFriends = [],
  initialRequests = [],
  unreadNotifications = 0,
}: FriendsClientProps) {
  // Tab state: "friends" or "requests"
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");

  // Real friends and requests synced with database
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [friendRequests, setFriendRequests] =
    useState<FriendRequestItem[]>(initialRequests);

  // Add friend by email or @tag form state
  const [isAdding, setIsAdding] = useState(false);
  const [friendInput, setFriendInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const query = friendInput.trim();
    if (!query) {
      setInputError("Please enter an email address or @user_tag.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await sendFriendRequest(query);
      if (res.error) {
        setInputError(res.error);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(res.message || `Friend request sent to ${query}!`);
      setFriendInput("");
      setIsAdding(false);
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Error sending request:", err);
      setInputError("Failed to send friend request. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      const res = await acceptFriendRequest(requestId);
      if (res.error) {
        setInputError(res.error);
        return;
      }

      const acceptedReq = friendRequests.find((r) => r.id === requestId);
      if (acceptedReq) {
        setFriends((prev) => [
          ...prev,
          {
            id: acceptedReq.senderId,
            name: acceptedReq.senderName,
            email: acceptedReq.senderEmail,
            tag: acceptedReq.senderTag,
            image: acceptedReq.senderImage,
          },
        ]);
        setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      }

      setSuccessMessage(res.message || "Friend request accepted!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Error accepting request:", err);
      setInputError("Failed to accept friend request.");
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      const res = await declineFriendRequest(requestId);
      if (res.error) {
        setInputError(res.error);
        return;
      }
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error declining request:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-24 md:pb-12">
      {/* Universal App Header with Top Navigation Bar */}
      <AppHeader
        sessionUser={sessionUser}
        unreadNotifications={unreadNotifications}
        pendingRequests={friendRequests.length}
        activeTab="friends"
      />

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Title & Add Friend Action */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Friends
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Connect and build habits together
            </p>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                setInputError("");
                setSuccessMessage("");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Add Friend</span>
            </button>
          )}
        </div>

        {/* Tab switch buttons */}
        <div className="relative mb-6 flex rounded-xl bg-zinc-900/90 border border-zinc-800 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab("friends");
              setIsAdding(false);
              setInputError("");
            }}
            className={`flex-1 rounded-lg py-2.5 transition-all duration-200 text-center ${
              activeTab === "friends"
                ? "bg-zinc-800 text-white shadow-sm font-semibold border border-zinc-700/60"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Friends {friends.length > 0 && `(${friends.length})`}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("requests");
              setIsAdding(false);
              setInputError("");
            }}
            className={`flex-1 rounded-lg py-2.5 transition-all duration-200 text-center flex items-center justify-center gap-2 ${
              activeTab === "requests"
                ? "bg-zinc-800 text-white shadow-sm font-semibold border border-zinc-700/60"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Friend Requests</span>
            {friendRequests.length > 0 && (
              <span className="rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold px-2 py-0.5">
                {friendRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Feedback Alert Messages */}
        {successMessage && (
          <div className="mb-5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {inputError && (
          <div className="mb-5 rounded-xl bg-rose-950/40 border border-rose-800/50 p-3.5 text-xs text-rose-300 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{inputError}</span>
          </div>
        )}

        {/* TAB 1: FRIENDS */}
        {activeTab === "friends" && (
          <div>
            {/* Friends list: Clicking anywhere on the box takes user to /profile/[id]; messaging icon opens /friends/[id] */}
            {friends.length > 0 && (
              <ul className="space-y-3 mb-6">
                {friends.map((friend) => (
                  <li
                    key={friend.id}
                    className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800/50 hover:border-zinc-700/80 transition-all duration-200"
                  >
                    {/* Primary clickable card: clicking anywhere takes you to their profile */}
                    <Link
                      href={`/profile/${friend.id}`}
                      className="flex items-center gap-3.5 flex-1 min-w-0"
                      title={`View ${friend.name || "friend"}'s profile`}
                    >
                      {/* Avatar */}
                      {friend.image ? (
                        <img
                          src={friend.image}
                          alt={friend.name || "Friend avatar"}
                          className="h-11 w-11 rounded-full object-cover border border-zinc-700 shrink-0 group-hover:border-indigo-500/60 transition-colors"
                        />
                      ) : (
                        <div
                          className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                        >
                          {(friend.name || friend.email).charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Name & Tag */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {friend.name || friend.email}
                          </p>
                          {friend.tag && (
                            <span className="text-xs font-mono font-medium text-indigo-400 shrink-0">
                              {friend.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{friend.email}</p>
                      </div>
                    </Link>

                    {/* Dedicated Messaging Icon Button (Replaces the arrow) */}
                    <Link
                      href={`/friends/${friend.id}`}
                      className="ml-3 p-2.5 rounded-xl bg-zinc-800/80 hover:bg-indigo-600 text-zinc-400 hover:text-white border border-zinc-700/60 hover:border-indigo-500/40 transition-all shadow-sm active:scale-95 shrink-0 flex items-center justify-center"
                      title={`Open messages and shared activities with ${friend.name || "friend"}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state if user has no friends */}
            {friends.length === 0 && !isAdding && (
              <div className="text-center py-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-8 space-y-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/70 flex items-center justify-center mx-auto text-zinc-400">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">No friends yet</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
                    Add friends using their email address or unique @username to track habits and stay accountable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add your first friend</span>
                </button>
              </div>
            )}

            {/* Collapsible Add Friend Form */}
            {isAdding && (
              <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-5 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Send Friend Request</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setInputError("");
                      setFriendInput("");
                    }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    ✕ Cancel
                  </button>
                </div>
                <form onSubmit={handleSendFriendRequest} className="space-y-3">
                  <input
                    type="text"
                    value={friendInput}
                    onChange={(e) => setFriendInput(e.target.value)}
                    placeholder="Enter email or @user_tag..."
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setInputError("");
                        setFriendInput("");
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/25 disabled:opacity-50"
                    >
                      {isSubmitting ? "Sending..." : "Send Request"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FRIEND REQUESTS */}
        {activeTab === "requests" && (
          <div>
            {friendRequests.length > 0 ? (
              <ul className="space-y-3">
                {friendRequests.map((req) => (
                  <li
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/profile/${req.senderId}`}
                        className="shrink-0 hover:opacity-80 transition"
                      >
                        {req.senderImage ? (
                          <img
                            src={req.senderImage}
                            alt={req.senderName}
                            className="h-10 w-10 rounded-full object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {req.senderName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/profile/${req.senderId}`}
                          className="text-sm font-semibold text-white hover:text-indigo-400 transition truncate block"
                        >
                          {req.senderName}
                        </Link>
                        {req.senderTag && (
                          <span className="text-xs font-mono text-indigo-400">
                            {req.senderTag}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleAccept(req.id)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 transition shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(req.id)}
                        className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold px-3 py-2 transition active:scale-95 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Decline</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/70 flex items-center justify-center mx-auto text-zinc-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">No pending requests</h3>
                <p className="text-xs text-zinc-500">
                  When someone sends you a friend request, it will show up here.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Universal Sticky Frosted Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab="friends"
        unreadNotifications={unreadNotifications}
        pendingRequests={friendRequests.length}
      />
    </div>
  );
}
