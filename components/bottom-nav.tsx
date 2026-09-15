"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  unreadNotifications?: number;
  unreadNotificationCount?: number;
  pendingRequests?: number;
  pendingFriendRequestsCount?: number;
  activeTab?: string;
}

export function BottomNav({
  unreadNotifications = 0,
  unreadNotificationCount,
  pendingRequests = 0,
  pendingFriendRequestsCount,
  activeTab,
}: BottomNavProps) {
  const notifCount = unreadNotificationCount !== undefined ? unreadNotificationCount : unreadNotifications;
  const friendReqCount = pendingFriendRequestsCount !== undefined ? pendingFriendRequestsCount : pendingRequests;
  const pathname = usePathname();

  const navItems = [
    {
      label: "Activities",
      href: "/",
      isActive: pathname === "/",
      badge: 0,
      icon: (active: boolean) => (
        <svg
          className={"h-5 w-5 transition-transform " + (active ? "scale-110 text-indigo-400" : "text-zinc-400")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    {
      label: "Messages",
      href: "/messages",
      isActive: pathname.startsWith("/messages"),
      badge: 0,
      icon: (active: boolean) => (
        <svg
          className={"h-5 w-5 transition-transform " + (active ? "scale-110 text-indigo-400" : "text-zinc-400")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      label: "Alerts",
      href: "/notifications",
      isActive: pathname === "/notifications",
      badge: notifCount,
      icon: (active: boolean) => (
        <svg
          className={"h-5 w-5 transition-transform " + (active ? "scale-110 text-indigo-400" : "text-zinc-400")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
    {
      label: "Friends",
      href: "/friends",
      isActive: pathname === "/friends" || (pathname.startsWith("/friends/") && pathname !== "/"),
      badge: friendReqCount,
      icon: (active: boolean) => (
        <svg
          className={"h-5 w-5 transition-transform " + (active ? "scale-110 text-indigo-400" : "text-zinc-400")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      label: "Profile",
      href: "/profile",
      isActive: pathname.startsWith("/profile"),
      badge: 0,
      icon: (active: boolean) => (
        <svg
          className={"h-5 w-5 transition-transform " + (active ? "scale-110 text-indigo-400" : "text-zinc-400")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/75 pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile Navigation"
    >
      <div className="flex h-14 items-center justify-around px-1">
        {navItems.map((item) => {
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "relative flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors active:scale-95 " +
                (active ? "text-indigo-400 font-semibold" : "text-zinc-400 hover:text-zinc-200")
              }
            >
              <div className="relative">
                {item.icon(active)}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-zinc-950">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
              {active && (
                <span className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
