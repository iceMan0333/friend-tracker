import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LandingPageClient } from "@/components/landing-page-client";
import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardData } from "@/app/actions/activities";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  // If user is authenticated, render the Dashboard
  if (session?.user?.id) {
    const data = await getDashboardData();
    if (data.success && data.currentUser && data.stats) {
      return (
        <DashboardClient
          currentUser={data.currentUser}
          initialActivities={data.activities || []}
          friends={data.friends || []}
          pendingProposals={data.pendingProposals || []}
          stats={data.stats}
        />
      );
    }
  }

  // Otherwise render public Landing Page
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch {
    userCount = 0;
  }

  return <LandingPageClient userCount={userCount} />;
}
