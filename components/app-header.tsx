"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogoIcon } from "./icons";

interface AppHeaderProps {
  sessionUser?: {
    id?: string | number;
    name?: string | null;
    email?: string | null;
    tag?: string | null;
    image?: string | null;
  } | null;
  unreadNotifications?: number;
  unreadNotificationCount?: number;
  pendingRequests?: number;
  pendingFriendRequestsCount?: number;
  activeTab?: string;
}

export function AppHeader({
  sessionUser,
  unreadNotifications = 0,
  unreadNotificationCount,
  pendingRequests = 0,
  pendingFriendRequestsCount,
  activeTab,
}: AppHeaderProps) {
  const notifCount = unreadNotificationCount !== undefined ? unreadNotificationCount : unreadNotifications;
  const friendReqCount = pendingFriendRequestsCount !== undefined ? pendingFriendRequestsCount : pendingRequests;
  const pathname = usePathname();

  const navLinks = [
    { label: "Activities", href: "/", isActive: pathname === "/" },
    { label: "Messages", href: "/messages", isActive: pathname.startsWith("/messages") },
    {
      label: "Notifications",
      href: "/notifications",
      isActive: pathname === "/notifications",
      badge: notifCount,
    },
    {
      label: "Friends",
      href: "/friends",
      isActive: pathname === "/friends" || (pathname.startsWith("/friends/") && pathname !== "/"),
      badge: friendReqCount,
    },
    { label: "Profile", href: "/profile", isActive: pathname.startsWith("/profile") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-white transition-transform active:scale-98"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
            <LogoIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              Punchly
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">
              Accountability
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-1 shadow-inner">
          {navLinks.map((item) => {
            const active = item.isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all " +
                  (active
                    ? "bg-zinc-800 text-white shadow-sm font-semibold border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50")
                }
              >
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Right: User Menu & Mobile Notification Bell */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Notification Bell Icon */}
          <Link
            href="/notifications"
            className="relative md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/60"
            aria-label="Notifications"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-zinc-950">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>

          {/* User Profile Mini Badge */}
          {sessionUser && (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl p-1 sm:pr-3 hover:bg-zinc-900/80 transition-colors border border-transparent hover:border-zinc-800"
            >
              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0 ring-1 ring-zinc-700">
                {sessionUser.image ? (
                  <img
                    src={sessionUser.image}
                    alt={sessionUser.name || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{sessionUser.name?.charAt(0).toUpperCase() || "U"}</span>
                )}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-200 leading-tight">
                  {sessionUser.name}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {sessionUser.tag || "@user"}
                </span>
              </div>
            </Link>
          )}

          {/* Log Out Button */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="hidden sm:inline-flex text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors font-medium"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}
