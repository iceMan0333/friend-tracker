"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sendMessage(friendId: number | string, content: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to send a message." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const friendIdNum = typeof friendId === "string" ? parseInt(friendId, 10) : friendId;

    if (currentUserId === friendIdNum) {
      return { error: "You cannot message yourself." };
    }

    // Verify friendship
    const [user1Id, user2Id] =
      currentUserId < friendIdNum ? [currentUserId, friendIdNum] : [friendIdNum, currentUserId];

    const friendship = await prisma.friendship.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!friendship) {
      return { error: "You can only chat with confirmed friends." };
    }

    const trimmed = content?.trim();
    if (!trimmed) {
      return { error: "Message cannot be empty." };
    }

    if (trimmed.length > 2000) {
      return { error: "Message is too long (maximum 2000 characters)." };
    }

    const message = await prisma.message.create({
      data: {
        senderId: currentUserId,
        receiverId: friendIdNum,
        content: trimmed,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            tag: true,
            image: true,
          },
        },
      },
    });

    revalidatePath(`/friends/${friendIdNum}`);

    return {
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        senderName: message.sender.name,
      },
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return { error: "Failed to send message. Please try again." };
  }
}

export async function getDirectMessages(friendId: number | string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in.", messages: [] };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const friendIdNum = typeof friendId === "string" ? parseInt(friendId, 10) : friendId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: friendIdNum },
          { senderId: friendIdNum, receiverId: currentUserId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            tag: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return {
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        senderName: m.sender.name,
      })),
    };
  } catch (error) {
    console.error("Error loading direct messages:", error);
    return { error: "Failed to load messages.", messages: [] };
  }
}

export interface ConversationSummary {
  friend: {
    id: number;
    name: string;
    tag?: string | null;
    image?: string | null;
  };
  latestMessage?: {
    content: string;
    createdAt: string;
    isSenderMe: boolean;
  } | null;
}

export async function getConversationsOverview() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized", conversations: [] };
    }

    const currentUserId = parseInt(session.user.id, 10);

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
      },
      include: {
        user1: { select: { id: true, name: true, tag: true, image: true } },
        user2: { select: { id: true, name: true, tag: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const friends = friendships.map((f) => (f.user1Id === currentUserId ? f.user2 : f.user1));

    const conversations: ConversationSummary[] = await Promise.all(
      friends.map(async (friend) => {
        const latest = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: friend.id },
              { senderId: friend.id, receiverId: currentUserId },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            createdAt: true,
            senderId: true,
          },
        });

        return {
          friend,
          latestMessage: latest
            ? {
                content: latest.content,
                createdAt: latest.createdAt.toISOString(),
                isSenderMe: latest.senderId === currentUserId,
              }
            : null,
        };
      })
    );

    conversations.sort((a, b) => {
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return { success: true, conversations };
  } catch (error) {
    console.error("Error loading conversations:", error);
    return { error: "Failed to load conversations.", conversations: [] };
  }
}
