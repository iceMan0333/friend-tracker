import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { NotificationsClient } from "@/components/notifications-client";
import { getNotifications } from "@/app/actions/notifications";

export const metadata: Metadata = {
  title: "Notifications — Friend Tracker",
  description: "View activity proposals and notifications from your friends.",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = parseInt(session.user.id, 10);

  const [user, notificationsRes, pendingRequestsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, tag: true, image: true },
    }),
    getNotifications(),
    prisma.friendRequest.count({
      where: { receiverId: userId, status: "PENDING" },
    }),
  ]);

  if (!user) {
    redirect("/");
  }

  return (
    <NotificationsClient
      sessionUser={user}
      initialNotifications={notificationsRes.notifications || []}
      unreadCount={notificationsRes.unreadCount || 0}
      pendingFriendRequestsCount={pendingRequestsCount}
    />
  );
}
