import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { logger } from "@/lib/logger";
import { LoginSchema } from "@/lib/validations/auth";
import { validationError, zodFields, unauthorized, serverError } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(zodFields(parsed.error));
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return unauthorized();

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return unauthorized();

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });

    logger.info("auth.login", { userId: user.id, email: user.email });

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error("auth.login.error", { error });
    return serverError();
  }
}
