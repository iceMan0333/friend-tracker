import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FriendDetailClient } from "@/components/friend-detail-client";
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

  const friendship = await prisma.friendship.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    include: {
      user1: { select: { id: true, name: true, email: true, tag: true, image: true, bio: true } },
      user2: { select: { id: true, name: true, email: true, tag: true, image: true, bio: true } },
    },
  });

  if (!friendship) {
    redirect("/friends");
  }

  const friendUser = friendship.user1Id === currentUserId ? friendship.user2 : friendship.user1;
  const currentUser = friendship.user1Id === currentUserId ? friendship.user1 : friendship.user2;

  // Load initial activities
  const rawActivities = await prisma.activity.findMany({
    where: {
      OR: [
        { creatorId: currentUserId, receiverId: friendId },
        { creatorId: friendId, receiverId: currentUserId },
      ],
    },
    include: {
      creator: { select: { id: true, name: true, tag: true, image: true } },
      receiver: { select: { id: true, name: true, tag: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Load initial messages
  const rawMessages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: friendId },
        { senderId: friendId, receiverId: currentUserId },
      ],
    },
    include: {
      sender: { select: { id: true, name: true, tag: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const initialActivities = rawActivities.map((a) => ({
    id: a.id,
    title: a.title,
    creatorId: a.creatorId,
    receiverId: a.receiverId,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate ? a.endDate.toISOString() : null,
    frequency: a.frequency,
    frequencyCount: a.frequencyCount,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    creator: a.creator,
    receiver: a.receiver,
  }));

  const initialMessages = rawMessages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    senderName: m.sender.name,
  }));

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
    />
  );
}
