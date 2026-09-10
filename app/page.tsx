import { prisma } from "@/lib/prisma";
import { LandingPageClient } from "@/components/landing-page-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch {
    userCount = 0;
  }

  return <LandingPageClient userCount={userCount} />;
}