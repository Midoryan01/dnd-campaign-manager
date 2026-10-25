import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [Credentials({ credentials: { email: {}, password: {} }, authorize: async (credentials) => {
    const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1) }).safeParse(credentials);
    if (!parsed.success) return null;
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user?.passwordHash || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return null;
    return { id: user.id, email: user.email, name: user.displayName };
  } })],
  callbacks: { jwt({ token, user }) { if (user) token.sub = user.id; return token; }, session({ session, token }) { if (session.user && token.sub) session.user.id = token.sub; return session; } },
});


