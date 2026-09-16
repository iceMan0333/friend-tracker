import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FriendDetailClient } from "@/components/friend-detail-client";
import { getSharedActivities } from "@/app/actions/activities";
import { getDirectMessages } from "@/app/actions/messages";
import { getUnreadNotificationCount } from "@/app/actions/notifications";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const friendId = parseInt(id, 10);
  if (isNaN(friendId)) {
    return { title: "Friend — Friend Tracker" };
  }

  const friend = await prisma.user.findUnique({
    where: { id: friendId },
    select: { name: true, tag: true },
  });

  return {
    title: friend ? `${friend.name} (${friend.tag || "@user"}) — Friend Tracker` : "Friend Tracker",
  };
}

export default async function FriendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { id } = await params;
  const friendId = parseInt(id, 10);

  if (isNaN(friendId)) {
    notFound();
  }

  const currentUserId = parseInt(session.user.id, 10);

  if (currentUserId === friendId) {
    redirect("/profile");
  }

  // Check friendship existence
  const [user1Id, user2Id] =
    currentUserId < friendId ? [currentUserId, friendId] : [friendId, currentUserId];

  const [friendship, unreadNotifs, pendingRequestsCount] = await Promise.all([
    prisma.friendship.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: { select: { id: true, name: true, email: true, tag: true, image: true, bio: true } },
        user2: { select: { id: true, name: true, email: true, tag: true, image: true, bio: true } },
      },
    }),
    getUnreadNotificationCount(),
    prisma.friendRequest.count({
      where: { receiverId: currentUserId, status: "PENDING" },
    }),
  ]);

  if (!friendship) {
    redirect("/friends");
  }

  const friendUser = friendship.user1Id === currentUserId ? friendship.user2 : friendship.user1;
  const currentUser = friendship.user1Id === currentUserId ? friendship.user1 : friendship.user2;

  // Load initial activities with punch-in status and weekly progress
  const activitiesRes = await getSharedActivities(friendId);
  const initialActivities = activitiesRes.activities || [];

  // Load initial messages
  const messagesRes = await getDirectMessages(friendId);
  const initialMessages = messagesRes.messages || [];

  return (
    <FriendDetailClient
      sessionUser={{
        id: currentUser.id.toString(),
        name: currentUser.name,
        email: currentUser.email,
        tag: currentUser.tag,
        image: currentUser.image,
      }}
      friend={{
        id: friendUser.id.toString(),
        name: friendUser.name,
        email: friendUser.email,
        tag: friendUser.tag,
        image: friendUser.image,
        bio: friendUser.bio,
      }}
      initialActivities={initialActivities}
      initialMessages={initialMessages}
      unreadNotifications={unreadNotifs}
      pendingRequests={pendingRequestsCount}
    />
  );
}
