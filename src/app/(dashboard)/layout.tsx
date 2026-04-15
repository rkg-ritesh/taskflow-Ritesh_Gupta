import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import type { UserPublic } from "@/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  if (!payload) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) redirect("/login");

  const userPublic: UserPublic = {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={userPublic} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
