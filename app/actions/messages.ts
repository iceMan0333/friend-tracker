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
