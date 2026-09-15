"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  activityId?: number | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: number;
    name: string;
    tag?: string | null;
    image?: string | null;
  } | null;
  activity?: {
    id: number;
    title: string;
    frequency: string;
    frequencyCount?: number | null;
    status: string;
  } | null;
}

export async function getNotifications() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in.", notifications: [], unreadCount: 0 };
    }

    const currentUserId = parseInt(session.user.id, 10);

    const notifications = await prisma.notification.findMany({
      where: { userId: currentUserId },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            tag: true,
            image: true,
          },
        },
        activity: {
          select: {
            id: true,
            title: true,
            frequency: true,
            frequencyCount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const formatted: NotificationItem[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      activityId: n.activityId,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor,
      activity: n.activity,
    }));

    return { success: true, notifications: formatted, unreadCount };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { error: "Failed to load notifications.", notifications: [], unreadCount: 0 };
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) return 0;

    const currentUserId = parseInt(session.user.id, 10);
    return await prisma.notification.count({
      where: { userId: currentUserId, isRead: false },
    });
  } catch {
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const currentUserId = parseInt(session.user.id, 10);
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: currentUserId },
      data: { isRead: true },
    });

    revalidatePath("/notifications");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { error: "Failed to update notification." };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const currentUserId = parseInt(session.user.id, 10);
    await prisma.notification.updateMany({
      where: { userId: currentUserId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/notifications");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { error: "Failed to update notifications." };
  }
}
