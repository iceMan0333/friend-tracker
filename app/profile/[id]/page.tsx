import { auth } from "@/auth";
import { getUserProfileByIdOrTag } from "@/app/actions/profile";
import { ProfileClient } from "@/components/profile-client";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";

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
      title: "User Not Found — Friend Tracker",
    };
  }
  return {
    title: `${user.name} (${user.tag || "@user"}) — Friend Tracker`,
    description: user.bio || `View ${user.name}'s profile on Friend Tracker.`,
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

  const { id } = await params;
  const user = await getUserProfileByIdOrTag(id);

  if (!user) {
    notFound();
  }

  const isOwnProfile = session.user.id === user.id;

  return (
    <ProfileClient
      user={user}
      isOwnProfile={isOwnProfile}
    />
  );
}
