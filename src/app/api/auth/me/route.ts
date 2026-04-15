import { NextRequest } from "next/server";
import { requireAuth, success, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const [user, err] = await requireAuth(request);
  if (err) return unauthorized();

  return success({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}
