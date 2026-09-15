import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { MessagesClient } from "@/components/messages-client";
import { getConversationsOverview } from "@/app/actions/messages";
import { getUnreadNotificationCount } from "@/app/actions/notifications";

export const metadata: Metadata = {
  title: "Messages — Friend Tracker",
  description: "Chat with your accountability friends on Friend Tracker.",
};

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = parseInt(session.user.id, 10);

  const [user, conversationsRes, unreadNotifs, pendingRequestsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, tag: true, image: true },
    }),
    getConversationsOverview(),
    getUnreadNotificationCount(),
    prisma.friendRequest.count({
      where: { receiverId: userId, status: "PENDING" },
    }),
  ]);

  if (!user) {
    redirect("/");
  }

  return (
    <MessagesClient
      sessionUser={user}
      conversations={conversationsRes.conversations || []}
      unreadNotificationCount={unreadNotifs}
      pendingFriendRequestsCount={pendingRequestsCount}
    />
  );
}
