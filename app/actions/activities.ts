"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ActivityProposalInput {
  friendId: number | string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD
  frequency?: "DAILY" | "X_TIMES_A_WEEK";
  frequencyCount?: number; // e.g. 3 for "3 times a week"
}

export async function proposeActivity(input: ActivityProposalInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to propose an activity." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const friendId =
      typeof input.friendId === "string"
        ? parseInt(input.friendId, 10)
        : input.friendId;

    if (currentUserId === friendId) {
      return { error: "You cannot track activities with yourself." };
    }

    // Verify friendship exists and is confirmed
    const [user1Id, user2Id] =
      currentUserId < friendId
        ? [currentUserId, friendId]
        : [friendId, currentUserId];

    const friendship = await prisma.friendship.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!friendship) {
      return { error: "You can only track activities with confirmed friends." };
    }

    const title = input.title?.trim();
    if (!title) {
      return { error: "Activity title is required." };
    }

    if (title.length > 100) {
      return { error: "Activity title cannot exceed 100 characters." };
    }

    const startDate = input.startDate
      ? new Date(input.startDate)
      : new Date();
    const endDate = input.endDate ? new Date(input.endDate) : null;

    if (endDate && endDate < startDate) {
      return { error: "Finish date cannot be earlier than starting date." };
    }

    const frequencyCount =
      input.frequency === "X_TIMES_A_WEEK"
        ? Math.max(1, Math.min(6, Number(input.frequencyCount) || 3))
        : null;

    // Create Activity with PENDING status
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

    // Create Notification for the friend
    await prisma.notification.create({
      data: {
        userId: friendId,
        actorId: currentUserId,
        type: "ACTIVITY_PROPOSAL",
        title: "New Activity Proposal",
        message: `${activity.creator.name} proposed to track "${activity.title}" with you.`,
        link: `/friends/${currentUserId}`,
        activityId: activity.id,
      },
    });

    revalidatePath(`/friends/${friendId}`);
    revalidatePath("/notifications");
    revalidatePath("/");

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
        hasUserPunchedToday: false,
        userPunchedAt: null,
        hasFriendPunchedToday: false,
        friendPunchedAt: null,
        userWeekCount: 0,
        friendWeekCount: 0,
        isGoalReached: false,
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

    if (activity.receiverId !== currentUserId) {
      return { error: "Only the invited friend can accept this proposal." };
    }

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: { status: "ACCEPTED" },
      include: {
        creator: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    // Create Notification for the creator
    await prisma.notification.create({
      data: {
        userId: activity.creatorId,
        actorId: currentUserId,
        type: "ACTIVITY_ACCEPTED",
        title: "Proposal Accepted! 🎉",
        message: `${updated.receiver.name} accepted your proposal to track "${updated.title}".`,
        link: `/friends/${currentUserId}`,
        activityId: activity.id,
      },
    });

    // Mark any existing proposal notification for this activity as read and update type
    await prisma.notification.updateMany({
      where: { activityId: activity.id, userId: currentUserId },
      data: { isRead: true, type: "ACTIVITY_ACCEPTED_DONE" },
    });

    revalidatePath(`/friends/${activity.creatorId}`);
    revalidatePath("/notifications");
    revalidatePath("/");

    return { success: true, message: "Activity proposal accepted! You can now track it together." };
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

    if (activity.creatorId !== currentUserId && activity.receiverId !== currentUserId) {
      return { error: "You are not authorized to decline this proposal." };
    }

    await prisma.activity.delete({
      where: { id: activityId },
    });

    const otherUserId = activity.creatorId === currentUserId ? activity.receiverId : activity.creatorId;
    revalidatePath(`/friends/${otherUserId}`);
    revalidatePath("/notifications");
    revalidatePath("/");

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

export async function punchInActivity({
  activityId,
  clientDate,
}: {
  activityId: number;
  clientDate?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to punch in." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const dateStr = clientDate?.trim() || new Date().toISOString().split("T")[0];

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return { error: "Activity not found." };
    }

    if (activity.status !== "ACCEPTED") {
      return { error: "You can only punch in on accepted activities." };
    }

    if (activity.creatorId !== currentUserId && activity.receiverId !== currentUserId) {
      return { error: "You are not a participant in this activity." };
    }

    // Check if already punched in for today
    const existing = await prisma.activityPunchIn.findUnique({
      where: {
        activityId_userId_punchDate: {
          activityId,
          userId: currentUserId,
          punchDate: dateStr,
        },
      },
    });

    if (existing) {
      return {
        error: "You have already punched in for today!",
        alreadyPunched: true,
      };
    }

    const punchIn = await prisma.activityPunchIn.create({
      data: {
        activityId,
        userId: currentUserId,
        punchDate: dateStr,
        punchedAt: new Date(),
      },
    });

    const otherUserId = activity.creatorId === currentUserId ? activity.receiverId : activity.creatorId;
    revalidatePath(`/friends/${otherUserId}`);
    revalidatePath("/");

    return {
      success: true,
      punchIn: {
        id: punchIn.id,
        activityId: punchIn.activityId,
        userId: punchIn.userId,
        punchDate: punchIn.punchDate,
        punchedAt: punchIn.punchedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error punching in:", error);
    return { error: "Failed to punch in. Please try again." };
  }
}

// Helper to get the Monday of the week for a given date string or Date
function getMonday(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function getSharedActivities(friendId: number | string, clientToday?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in.", activities: [] };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const friendIdNum = typeof friendId === "string" ? parseInt(friendId, 10) : friendId;

    const todayStr = clientToday?.trim() || new Date().toISOString().split("T")[0];
    const currentMonday = getMonday(todayStr);

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
        punchIns: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedActivities = activities.map((a) => {
      // Find today's punch-ins
      const userPunchToday = a.punchIns.find(
        (p) => p.userId === currentUserId && p.punchDate === todayStr
      );
      const friendPunchToday = a.punchIns.find(
        (p) => p.userId === friendIdNum && p.punchDate === todayStr
      );

      // Count punch-ins this current week (from current Monday onward)
      const userWeekCount = a.punchIns.filter(
        (p) => p.userId === currentUserId && p.punchDate >= currentMonday && p.punchDate <= todayStr
      ).length;
      const friendWeekCount = a.punchIns.filter(
        (p) => p.userId === friendIdNum && p.punchDate >= currentMonday && p.punchDate <= todayStr
      ).length;

      let isGoalReached = false;
      if (a.frequency === "DAILY") {
        isGoalReached = Boolean(userPunchToday && friendPunchToday);
      } else {
        const target = a.frequencyCount || 1;
        isGoalReached = userWeekCount >= target && friendWeekCount >= target;
      }

      return {
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
        hasUserPunchedToday: Boolean(userPunchToday),
        userPunchedAt: userPunchToday ? userPunchToday.punchedAt.toISOString() : null,
        hasFriendPunchedToday: Boolean(friendPunchToday),
        friendPunchedAt: friendPunchToday ? friendPunchToday.punchedAt.toISOString() : null,
        userWeekCount,
        friendWeekCount,
        isGoalReached,
      };
    });

    return {
      success: true,
      activities: formattedActivities,
    };
  } catch (error) {
    console.error("Error fetching shared activities:", error);
    return { error: "Failed to load activities.", activities: [] };
  }
}

export async function getActivityCalendarData(activityId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const currentUserId = parseInt(session.user.id, 10);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        creator: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        punchIns: true,
      },
    });

    if (!activity) {
      return { error: "Activity not found." };
    }

    if (activity.creatorId !== currentUserId && activity.receiverId !== currentUserId) {
      return { error: "Unauthorized access to activity." };
    }

    const friendUser = activity.creatorId === currentUserId ? activity.receiver : activity.creator;
    const currentUser = activity.creatorId === currentUserId ? activity.creator : activity.receiver;

    // Group punch-ins by date
    const punchMap: Record<
      string,
      {
        userPunched: boolean;
        userTime?: string;
        friendPunched: boolean;
        friendTime?: string;
      }
    > = {};

    activity.punchIns.forEach((p) => {
      if (!punchMap[p.punchDate]) {
        punchMap[p.punchDate] = { userPunched: false, friendPunched: false };
      }
      if (p.userId === currentUserId) {
        punchMap[p.punchDate].userPunched = true;
        punchMap[p.punchDate].userTime = p.punchedAt.toISOString();
      } else {
        punchMap[p.punchDate].friendPunched = true;
        punchMap[p.punchDate].friendTime = p.punchedAt.toISOString();
      }
    });

    // Calculate weekly counts (by Monday date)
    const weekCounts: Record<string, { userCount: number; friendCount: number }> = {};
    Object.entries(punchMap).forEach(([dateStr, data]) => {
      const monday = getMonday(dateStr);
      if (!weekCounts[monday]) {
        weekCounts[monday] = { userCount: 0, friendCount: 0 };
      }
      if (data.userPunched) weekCounts[monday].userCount += 1;
      if (data.friendPunched) weekCounts[monday].friendCount += 1;
    });

    const target = activity.frequency === "DAILY" ? 7 : activity.frequencyCount || 1;

    return {
      success: true,
      activity: {
        id: activity.id,
        title: activity.title,
        startDate: activity.startDate.toISOString().split("T")[0],
        endDate: activity.endDate ? activity.endDate.toISOString().split("T")[0] : null,
        frequency: activity.frequency,
        frequencyCount: activity.frequencyCount,
        creatorId: activity.creatorId,
        receiverId: activity.receiverId,
      },
      currentUserName: currentUser.name,
      friendName: friendUser.name,
      target,
      punchMap,
      weekCounts,
      calendarData: {
        punchMap,
        weekCounts,
      },
    };
  } catch (error) {
    console.error("Error getting activity calendar:", error);
    return { error: "Failed to get calendar data." };
  }
}

export async function getDashboardData(clientToday?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in." };
    }

    const currentUserId = parseInt(session.user.id, 10);
    const todayStr = clientToday?.trim() || new Date().toISOString().split("T")[0];
    const currentMonday = getMonday(todayStr);

    // 1. Fetch user details
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, name: true, email: true, tag: true, image: true, bio: true },
    });

    // 2. Fetch all accepted activities
    const activities = await prisma.activity.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ creatorId: currentUserId }, { receiverId: currentUserId }],
      },
      include: {
        creator: { select: { id: true, name: true, tag: true, image: true } },
        receiver: { select: { id: true, name: true, tag: true, image: true } },
        punchIns: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Format activities
    const formattedActivities = activities.map((a) => {
      const isCreator = a.creatorId === currentUserId;
      const friend = isCreator ? a.receiver : a.creator;

      const userPunchToday = a.punchIns.find(
        (p) => p.userId === currentUserId && p.punchDate === todayStr
      );
      const friendPunchToday = a.punchIns.find(
        (p) => p.userId === friend.id && p.punchDate === todayStr
      );

      const userWeekCount = a.punchIns.filter(
        (p) => p.userId === currentUserId && p.punchDate >= currentMonday && p.punchDate <= todayStr
      ).length;
      const friendWeekCount = a.punchIns.filter(
        (p) => p.userId === friend.id && p.punchDate >= currentMonday && p.punchDate <= todayStr
      ).length;

      let isGoalReached = false;
      if (a.frequency === "DAILY") {
        isGoalReached = Boolean(userPunchToday && friendPunchToday);
      } else {
        const target = a.frequencyCount || 1;
        isGoalReached = userWeekCount >= target && friendWeekCount >= target;
      }

      return {
        id: a.id,
        title: a.title,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate ? a.endDate.toISOString() : null,
        frequency: a.frequency,
        frequencyCount: a.frequencyCount,
        friend: {
          id: friend.id,
          name: friend.name,
          tag: friend.tag,
          image: friend.image,
        },
        hasUserPunchedToday: Boolean(userPunchToday),
        userPunchedAt: userPunchToday ? userPunchToday.punchedAt.toISOString() : null,
        hasFriendPunchedToday: Boolean(friendPunchToday),
        friendPunchedAt: friendPunchToday ? friendPunchToday.punchedAt.toISOString() : null,
        userWeekCount,
        friendWeekCount,
        isGoalReached,
      };
    });

    // 4. Fetch all confirmed friendships for the story rail
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
      },
      include: {
        user1: { select: { id: true, name: true, email: true, tag: true, image: true } },
        user2: { select: { id: true, name: true, email: true, tag: true, image: true } },
      },
    });

    const friendsList = friendships.map((f) => {
      const friend = f.user1Id === currentUserId ? f.user2 : f.user1;
      const sharedActs = formattedActivities.filter((act) => act.friend.id === friend.id);
      const allDoneToday = sharedActs.length > 0 && sharedActs.every((act) => act.hasFriendPunchedToday);

      return {
        id: friend.id,
        name: friend.name,
        email: friend.email,
        tag: friend.tag,
        image: friend.image,
        hasCompletedToday: allDoneToday,
        sharedHabitsCount: sharedActs.length,
      };
    });

    // 5. Fetch pending proposals & pending friend requests counts
    const pendingProposals = await prisma.activity.findMany({
      where: { receiverId: currentUserId, status: "PENDING" },
      include: {
        creator: { select: { id: true, name: true, tag: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingFriendRequestsCount = await prisma.friendRequest.count({
      where: { receiverId: currentUserId, status: "PENDING" },
    });

    const unreadNotificationsCount = await prisma.notification.count({
      where: { userId: currentUserId, isRead: false },
    });

    return {
      success: true,
      currentUser: currentUser
        ? {
            id: currentUser.id.toString(),
            name: currentUser.name,
            email: currentUser.email,
            tag: currentUser.tag,
            image: currentUser.image,
            bio: currentUser.bio,
          }
        : null,
      activities: formattedActivities,
      friends: friendsList,
      pendingProposals: pendingProposals.map((p) => ({
        id: p.id,
        title: p.title,
        frequency: p.frequency,
        frequencyCount: p.frequencyCount,
        creator: p.creator,
        createdAt: p.createdAt.toISOString(),
      })),
      stats: {
        totalActivities: formattedActivities.length,
        completedTodayCount: formattedActivities.filter((a) => a.hasUserPunchedToday).length,
        remainingTodayCount: formattedActivities.filter((a) => !a.hasUserPunchedToday).length,
        pendingProposalsCount: pendingProposals.length,
        pendingFriendRequestsCount,
        unreadNotificationsCount,
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { error: "Failed to load dashboard data." };
  }
}
