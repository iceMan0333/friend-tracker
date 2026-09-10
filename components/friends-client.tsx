"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogoIcon } from "./icons";
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
}

export function FriendsClient({
  sessionUser,
  initialFriends = [],
  initialRequests = [],
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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-900 bg-[#0a0a0a]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <LogoIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">
            Friend Tracker
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {sessionUser && (
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Logged in as{" "}
              <span className="text-zinc-200 font-medium">
                {sessionUser.name || sessionUser.email}
              </span>
            </span>
          )}
          <Link
            href="/profile"
            className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800"
          >
            <span>Profile</span>
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-6">
          Friends
        </h1>

        {/* Tab switch buttons in segmented box (styled like log in and register options) */}
        <div className="relative mb-8 flex rounded-xl bg-zinc-900/90 border border-zinc-800 p-1 text-sm font-medium">
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
          <div className="mb-5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 p-3 text-xs text-emerald-300">
            {successMessage}
          </div>
        )}

        {inputError && (
          <div className="mb-5 rounded-lg bg-rose-950/40 border border-rose-800/50 p-3 text-xs text-rose-300">
            {inputError}
          </div>
        )}

        {/* TAB 1: FRIENDS */}
        {activeTab === "friends" && (
          <div>
            {/* Friends list (only shown if user has friends; no cross off option) */}
            {friends.length > 0 && (
              <ul className="space-y-3 mb-5">
                {friends.map((friend) => (
                  <li
                    key={friend.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/profile/${friend.id}`}
                        title={`View ${friend.name || friend.tag || "friend"}'s profile`}
                        className="shrink-0 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
                      >
                        {friend.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={friend.image}
                            alt={friend.name || "Friend avatar"}
                            className="h-10 w-10 rounded-full object-cover border border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-full bg-zinc-600 border border-zinc-500/30 shadow-inner shrink-0"
                            title="Default gray avatar"
                          />
                        )}
                      </Link>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">
                            {friend.name || friend.email}
                          </p>
                          {friend.tag && (
                            <span className="text-xs font-mono font-medium text-indigo-400">
                              {friend.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{friend.email}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* + add new friend option at the bottom */}
            {isAdding ? (
              <form
                onSubmit={handleSendFriendRequest}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 space-y-3"
              >
                <div>
                  <label
                    htmlFor="friend-input"
                    className="block text-xs font-semibold text-zinc-300 mb-1.5"
                  >
                    Add Friend by Email or User Tag (@tag)
                  </label>
                  <input
                    id="friend-input"
                    type="text"
                    autoFocus
                    required
                    disabled={isSubmitting}
                    value={friendInput}
                    onChange={(e) => {
                      setFriendInput(e.target.value);
                      if (inputError) setInputError("");
                    }}
                    placeholder="e.g. @alex or friend@example.com"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    {isSubmitting ? "Sending..." : "Send Friend Request"}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsAdding(false);
                      setFriendInput("");
                      setInputError("");
                    }}
                    className="rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    setInputError("");
                  }}
                  className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-2 flex items-center gap-1.5 focus:outline-none"
                >
                  <span>+ add new friend</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FRIEND REQUESTS */}
        {activeTab === "requests" && (
          <div>
            {friendRequests.length === 0 ? (
              <p className="text-zinc-400 text-sm py-2">
                you have no friend requests.
              </p>
            ) : (
              <ul className="space-y-3">
                {friendRequests.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/profile/${req.senderId}`}
                        title={`View ${req.senderName || req.senderTag || "user"}'s profile`}
                        className="shrink-0 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
                      >
                        {req.senderImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={req.senderImage}
                            alt={req.senderName || "Sender avatar"}
                            className="h-10 w-10 rounded-full object-cover border border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-full bg-zinc-600 border border-zinc-500/30 shadow-inner shrink-0"
                            title="Default gray avatar"
                          />
                        )}
                      </Link>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">
                            {req.senderName || req.senderEmail}
                          </p>
                          {req.senderTag && (
                            <span className="text-xs font-mono font-medium text-indigo-400">
                              {req.senderTag}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{req.senderEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAccept(req.id)}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 text-xs font-semibold transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(req.id)}
                        className="rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-3.5 py-1.5 text-xs font-semibold transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
