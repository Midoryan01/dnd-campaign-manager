import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

const registrationSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json({ error: "Check the registration fields. Password must be at least 12 characters." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        displayName: parsed.data.displayName,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
      },
      select: { id: true },
    });
    return Response.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Email is already registered." }, { status: 409 });
    }
    console.error("Registration failed", error);
    return Response.json({ error: "Registration is temporarily unavailable." }, { status: 500 });
  }
}
