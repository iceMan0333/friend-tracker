import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FriendsClient } from "@/components/friends-client";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Friends — Friend Tracker",
  description: "View and manage your accountability friends on Friend Tracker.",
};

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const session = await auth();

  // If user is not authenticated, redirect to home page
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = parseInt(session.user.id, 10);

  // Fetch real accepted friendships from database
  let initialFriends: { id: string; name: string; email: string }[] = [];
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, name: true, email: true } },
        user2: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    initialFriends = friendships.map((f) => {
      const friend = f.user1Id === userId ? f.user2 : f.user1;
      return {
        id: friend.id.toString(),
        name: friend.name,
        email: friend.email,
      };
    });
  } catch (err) {
    console.error("Error loading friendships:", err);
  }

  // Fetch real pending friend requests received by this user
  let initialRequests: {
    id: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    createdAt: string;
  }[] = [];

  try {
    const pendingRequests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    initialRequests = pendingRequests.map((r) => ({
      id: r.id.toString(),
      senderId: r.sender.id.toString(),
      senderName: r.sender.name,
      senderEmail: r.sender.email,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error loading friend requests:", err);
  }

  return (
    <FriendsClient
      sessionUser={session.user}
      initialFriends={initialFriends}
      initialRequests={initialRequests}
    />
  );
}
