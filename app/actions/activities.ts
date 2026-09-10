"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ProposeActivityInput {
  friendId: number | string;
  title: string;
  startDate: string;
  endDate?: string;
  frequency: "DAILY" | "WEEKLY" | "X_TIMES_A_WEEK" | "MONTHLY";
  frequencyCount?: number;
}

export async function proposeActivity(input: ProposeActivityInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to propose an activity." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const friendId = typeof input.friendId === "string" ? parseInt(input.friendId, 10) : input.friendId;

    if (currentUserId === friendId) {
      return { error: "You cannot propose an activity to yourself." };
    }

    // Verify friendship
    const [user1Id, user2Id] =
      currentUserId < friendId ? [currentUserId, friendId] : [friendId, currentUserId];

    const friendship = await prisma.friendship.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!friendship) {
      return { error: "You can only propose activities with confirmed friends." };
    }

    const title = input.title?.trim();
    if (!title) {
      return { error: "Please enter an activity name." };
    }

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    let endDate: Date | null = null;
    if (input.endDate && input.endDate.trim() !== "") {
      endDate = new Date(input.endDate);
      if (endDate < startDate) {
        return { error: "Finish date cannot be before the starting date." };
      }
    }

    let frequencyCount: number | null = null;
    if (input.frequency === "X_TIMES_A_WEEK") {
      frequencyCount = Number(input.frequencyCount) || 2;
      if (frequencyCount < 1 || frequencyCount > 6) {
        return { error: "Custom frequency must be between 1 and 6 times a week." };
      }
    }

    const activity = await prisma.activity.create({
      data: {
        title,
        creatorId: currentUserId,
        receiverId: friendId,
        startDate,
        endDate,
        frequency: input.frequency || "DAILY",
        frequencyCount,
        status: "PENDING",
        isRecurring: true,
      },
      include: {
        creator: { select: { id: true, name: true, tag: true, image: true } },
        receiver: { select: { id: true, name: true, tag: true, image: true } },
      },
    });

    revalidatePath(`/friends/${friendId}`);

    return {
      success: true,
      activity: {
        id: activity.id,
        title: activity.title,
        creatorId: activity.creatorId,
        receiverId: activity.receiverId,
        startDate: activity.startDate.toISOString(),
        endDate: activity.endDate ? activity.endDate.toISOString() : null,
        frequency: activity.frequency,
        frequencyCount: activity.frequencyCount,
        status: activity.status,
        createdAt: activity.createdAt.toISOString(),
        creator: activity.creator,
        receiver: activity.receiver,
      },
    };
  } catch (error) {
    console.error("Error proposing activity:", error);
    return { error: "Failed to send activity proposal. Please try again." };
  }
}

export async function acceptActivityProposal(activityId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in." };
    }

    const currentUserId = parseInt(session.user.id, 10);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return { error: "Activity proposal not found." };
    }

    // Only the invited friend (receiver) can accept the proposal
    if (activity.receiverId !== currentUserId) {
      return { error: "Only the invited friend can accept this proposal." };
    }

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: { status: "ACCEPTED" },
    });

    // Create participant records for both users
    await prisma.activityParticipant.upsert({
      where: { activityId_userId: { activityId, userId: activity.creatorId } },
      update: {},
      create: { activityId, userId: activity.creatorId },
    });

    await prisma.activityParticipant.upsert({
      where: { activityId_userId: { activityId, userId: activity.receiverId } },
      update: {},
      create: { activityId, userId: activity.receiverId },
    });

    revalidatePath(`/friends/${activity.creatorId}`);
    return { success: true, message: `Activity "${updated.title}" accepted!` };
  } catch (error) {
    console.error("Error accepting proposal:", error);
    return { error: "Failed to accept activity proposal." };
  }
}

export async function declineActivityProposal(activityId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in." };
    }

    const currentUserId = parseInt(session.user.id, 10);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return { error: "Activity proposal not found." };
    }

    // Either receiver can decline or creator can cancel
    if (activity.receiverId !== currentUserId && activity.creatorId !== currentUserId) {
      return { error: "You are not authorized to modify this proposal." };
    }

    // Per user rule: if declined the proposal will be removed
    await prisma.activity.delete({
      where: { id: activityId },
    });

    const otherUserId = activity.creatorId === currentUserId ? activity.receiverId : activity.creatorId;
    revalidatePath(`/friends/${otherUserId}`);

    return {
      success: true,
      message:
        activity.creatorId === currentUserId
          ? "Activity proposal cancelled."
          : "Activity proposal declined.",
    };
  } catch (error) {
    console.error("Error declining proposal:", error);
    return { error: "Failed to decline activity proposal." };
  }
}

export async function getSharedActivities(friendId: number | string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in.", activities: [] };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const friendIdNum = typeof friendId === "string" ? parseInt(friendId, 10) : friendId;

    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { creatorId: currentUserId, receiverId: friendIdNum },
          { creatorId: friendIdNum, receiverId: currentUserId },
        ],
      },
      include: {
        creator: { select: { id: true, name: true, tag: true, image: true } },
        receiver: { select: { id: true, name: true, tag: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      activities: activities.map((a) => ({
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
      })),
    };
  } catch (error) {
    console.error("Error fetching shared activities:", error);
    return { error: "Failed to load activities.", activities: [] };
  }
}
