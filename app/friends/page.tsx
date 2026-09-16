import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FriendsClient } from "@/components/friends-client";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUnreadNotificationCount } from "@/app/actions/notifications";

export const metadata: Metadata = {
  title: "Friends — Punchly",
  description: "View and manage your accountability friends on Punchly.",
};

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const session = await auth();

  // If user is not authenticated, redirect to home page
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = parseInt(session.user.id, 10);

  // Fetch friendships, friend requests, and unread notifications concurrently
  let initialFriends: {
    id: string;
    name: string;
    email: string;
    tag?: string | null;
    image?: string | null;
  }[] = [];
  let initialRequests: {
    id: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderTag?: string | null;
    senderImage?: string | null;
    createdAt: string;
  }[] = [];
  let unreadNotificationsCount = 0;

  try {
    const [friendships, pendingRequests, unreadCount] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          user1: { select: { id: true, name: true, email: true, tag: true, image: true } },
          user2: { select: { id: true, name: true, email: true, tag: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
        include: {
          sender: { select: { id: true, name: true, email: true, tag: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      getUnreadNotificationCount(),
    ]);

    initialFriends = friendships.map((f) => {
      const friend = f.user1Id === userId ? f.user2 : f.user1;
      return {
        id: friend.id.toString(),
        name: friend.name,
        email: friend.email,
        tag: friend.tag,
        image: friend.image,
      };
    });

    initialRequests = pendingRequests.map((r) => ({
      id: r.id.toString(),
      senderId: r.sender.id.toString(),
      senderName: r.sender.name,
      senderEmail: r.sender.email,
      senderTag: r.sender.tag,
      senderImage: r.sender.image,
      createdAt: r.createdAt.toISOString(),
    }));

    unreadNotificationsCount = unreadCount;
  } catch (err) {
    console.error("Error loading friends page data:", err);
  }

  return (
    <FriendsClient
      sessionUser={session.user}
      initialFriends={initialFriends}
      initialRequests={initialRequests}
      unreadNotifications={unreadNotificationsCount}
    />
  );
}
