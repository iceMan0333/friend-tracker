import { prisma } from "@/lib/prisma";

export default async function Home() {
  const userCount = await prisma.user.count();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Friend Tracker</h1>
        <p className="mt-4">
          Database connected! Users: {userCount}
        </p>
      </div>
    </main>
  );
}