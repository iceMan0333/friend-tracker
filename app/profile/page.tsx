import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "@/components/profile-client";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUnreadNotificationCount } from "@/app/actions/notifications";

export const metadata: Metadata = {
  title: "Profile — Friend Tracker",
  description: "Customize your user tag, profile avatar, and bio on Friend Tracker.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = parseInt(session.user.id, 10);

  const [user, unreadNotifs, pendingRequestsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        tag: true,
        image: true,
        bio: true,
      },
    }),
    getUnreadNotificationCount(),
    prisma.friendRequest.count({
      where: { receiverId: userId, status: "PENDING" },
    }),
  ]);

  if (!user) {
    redirect("/");
  }

  // Ensure user has a default @tag if none was set previously
  if (!user.tag) {
    const baseTag =
      "@" +
      (user.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) ||
        "user");
    let initialTag = baseTag;
    const existing = await prisma.user.findUnique({
      where: { tag: initialTag },
    });
    if (existing) {
      initialTag = `${baseTag}${Math.floor(100 + Math.random() * 900)}`;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { tag: initialTag },
    });
    user.tag = initialTag;
  }

  return (
    <ProfileClient
      user={{
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        tag: user.tag,
        image: user.image,
        bio: user.bio,
      }}
      sessionUser={session.user}
      unreadNotifications={unreadNotifs}
      pendingRequests={pendingRequestsCount}
      isOwnProfile={true}
    />
  );
}
