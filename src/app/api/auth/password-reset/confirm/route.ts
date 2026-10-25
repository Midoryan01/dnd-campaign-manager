import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
export async function POST(req:Request){const p=z.object({token:z.string().min(20),password:z.string().min(12).max(128)}).safeParse(await req.json().catch(()=>null));if(!p.success)return Response.json({error:"Invalid reset request."},{status:400});const tokenHash=createHash("sha256").update(p.data.token).digest("hex"),row=await prisma.passwordResetToken.findUnique({where:{tokenHash}});if(!row||row.expiresAt<new Date())return Response.json({error:"Reset link is invalid or expired."},{status:400});await prisma.$transaction([prisma.user.update({where:{id:row.userId},data:{passwordHash:await bcrypt.hash(p.data.password,12)}}),prisma.passwordResetToken.deleteMany({where:{userId:row.userId}})]);return Response.json({ok:true});}
