"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sendFriendRequest(receiverEmail: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to add friends." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const normalizedEmail = receiverEmail?.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return { error: "Please enter a valid email address." };
    }

    // Look up receiver in PostgreSQL
    const receiver = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!receiver) {
      return {
        error: `No user found with email "${normalizedEmail}". Please ensure your friend has created an account first.`,
      };
    }

    if (receiver.id === currentUserId) {
      return { error: "You cannot add yourself as a friend." };
    }

    // Check if already friends
    const [user1Id, user2Id] =
      currentUserId < receiver.id
        ? [currentUserId, receiver.id]
        : [receiver.id, currentUserId];

    const existingFriendship = await prisma.friendship.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (existingFriendship) {
      return { error: "You are already friends with this user." };
    }

    // Check if a request already exists between them
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: currentUserId },
        ],
      },
    });

    if (existingRequest && existingRequest.status === "PENDING") {
      if (existingRequest.senderId === currentUserId) {
        return { error: "A friend request has already been sent to this user." };
      } else {
        return {
          error: "This user already sent you a friend request! Check your Friend Requests tab to accept it.",
        };
      }
    }

    // Create or update friend request
    if (existingRequest) {
      await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: {
          senderId: currentUserId,
          receiverId: receiver.id,
          status: "PENDING",
        },
      });
    } else {
      await prisma.friendRequest.create({
        data: {
          senderId: currentUserId,
          receiverId: receiver.id,
          status: "PENDING",
        },
      });
    }

    revalidatePath("/friends");
    return {
      success: true,
      message: `Friend request sent to ${receiver.name || receiver.email}!`,
    };
  } catch (error) {
    console.error("Error sending friend request:", error);
    return { error: "Failed to send friend request. Please try again." };
  }
}

export async function acceptFriendRequest(requestId: string | number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const reqId = typeof requestId === "string" ? parseInt(requestId, 10) : requestId;

    const request = await prisma.friendRequest.findUnique({
      where: { id: reqId },
      include: { sender: true },
    });

    if (!request || request.receiverId !== currentUserId) {
      return { error: "Friend request not found or not authorized." };
    }

    // Update request status to ACCEPTED
    await prisma.friendRequest.update({
      where: { id: reqId },
      data: { status: "ACCEPTED" },
    });

    // Create Friendship with ordered IDs to satisfy @@unique([user1Id, user2Id])
    const [user1Id, user2Id] =
      request.senderId < request.receiverId
        ? [request.senderId, request.receiverId]
        : [request.receiverId, request.senderId];

    await prisma.friendship.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      update: {},
      create: { user1Id, user2Id },
    });

    revalidatePath("/friends");
    return {
      success: true,
      message: `You are now friends with ${request.sender.name || request.sender.email}!`,
    };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return { error: "Failed to accept friend request." };
  }
}

export async function declineFriendRequest(requestId: string | number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const reqId = typeof requestId === "string" ? parseInt(requestId, 10) : requestId;

    const request = await prisma.friendRequest.findUnique({
      where: { id: reqId },
    });

    if (!request || request.receiverId !== currentUserId) {
      return { error: "Friend request not found or not authorized." };
    }

    // Delete or reject the request
    await prisma.friendRequest.delete({
      where: { id: reqId },
    });

    revalidatePath("/friends");
    return { success: true };
  } catch (error) {
    console.error("Error declining friend request:", error);
    return { error: "Failed to decline friend request." };
  }
}
