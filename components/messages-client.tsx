"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { ConversationSummary } from "@/app/actions/messages";

interface MessagesClientProps {
  sessionUser: {
    id: number;
    name: string;
    tag?: string | null;
    image?: string | null;
  };
  conversations: ConversationSummary[];
  unreadNotificationCount: number;
  pendingFriendRequestsCount: number;
}

export function MessagesClient({
  sessionUser,
  conversations,
  unreadNotificationCount,
  pendingFriendRequestsCount,
}: MessagesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = conversations.filter((c) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = c.friend.name.toLowerCase().includes(query);
    const tagMatch = c.friend.tag?.toLowerCase().includes(query);
    return nameMatch || (tagMatch !== undefined && tagMatch !== null && tagMatch);
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col font-sans pb-24 md:pb-12">
      <AppHeader
        sessionUser={sessionUser}
        unreadNotifications={unreadNotificationCount}
        pendingRequests={pendingFriendRequestsCount}
        activeTab="messages"
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Messages</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Chat with your accountability buddies</p>
          </div>
          <Link
            href="/friends"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Add Friend</span>
          </Link>
        </div>

        {/* Search */}
        {conversations.length > 0 && (
          <div className="relative">
            <svg className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        )}

        {/* List of Conversations */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/60 rounded-3xl p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-500">
              <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-200">
                {conversations.length === 0 ? "No conversations yet" : "No friends found matching your search"}
              </h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                {conversations.length === 0
                  ? "Connect with friends to start chatting and cheering each other on with shared habits!"
                  : "Try searching with a different name or tag."}
              </p>
            </div>
            {conversations.length === 0 && (
              <Link
                href="/friends"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition active:scale-95"
              >
                <span>Find Friends</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <Link
                key={item.friend.id}
                href={"/friends/" + item.friend.id}
                className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:bg-zinc-800/50 hover:border-zinc-700/80 transition-all active:scale-[0.99]"
              >
                {/* Friend Avatar */}
                <div className="relative shrink-0">
                  {item.friend.image ? (
                    <img
                      src={item.friend.image}
                      alt={item.friend.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {item.friend.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0a]" />
                </div>

                {/* Friend Info & Latest Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-sm text-white truncate">{item.friend.name}</span>
                      {item.friend.tag && (
                        <span className="text-xs text-zinc-500 truncate">@{item.friend.tag}</span>
                      )}
                    </div>
                    {item.latestMessage && (
                      <span
                        suppressHydrationWarning
                        className="text-[11px] text-zinc-500 shrink-0"
                      >
                        {new Date(item.latestMessage.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-1 truncate">
                    {item.latestMessage ? (
                      <>
                        <span className="text-zinc-500">
                          {item.latestMessage.isSenderMe ? "You: " : ""}
                        </span>
                        {item.latestMessage.content}
                      </>
                    ) : (
                      <span className="text-zinc-500 italic">No messages yet — tap to say hi!</span>
                    )}
                  </p>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav
        activeTab="messages"
        unreadNotifications={unreadNotificationCount}
        pendingRequests={pendingFriendRequestsCount}
      />
    </div>
  );
}
