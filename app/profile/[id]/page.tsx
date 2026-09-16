import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserProfileByIdOrTag } from "@/app/actions/profile";
import { ProfileClient } from "@/components/profile-client";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUnreadNotificationCount } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getUserProfileByIdOrTag(id);
  if (!user) {
    return {
      title: "User Not Found — Punchly",
    };
  }
  return {
    title: `${user.name} (${user.tag || "@user"}) — Punchly`,
    description: user.bio || `View ${user.name}'s profile on Punchly.`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const currentUserId = parseInt(session.user.id, 10);
  const { id } = await params;

  const [user, unreadNotifs, pendingRequestsCount] = await Promise.all([
    getUserProfileByIdOrTag(id),
    getUnreadNotificationCount(),
    prisma.friendRequest.count({
      where: { receiverId: currentUserId, status: "PENDING" },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const isOwnProfile = session.user.id === user.id;

  return (
    <ProfileClient
      user={user}
      isOwnProfile={isOwnProfile}
      sessionUser={session.user}
      unreadNotifications={unreadNotifs}
      pendingRequests={pendingRequestsCount}
    />
  );
}
