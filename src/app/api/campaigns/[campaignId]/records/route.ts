import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canManageCampaign } from "@/lib/permissions/campaign";
import { writeCampaignAudit } from "@/lib/campaign-audit";
const schema=z.object({kind:z.enum(["note","timeline","lore","location","npc","faction","quest"]),id:z.string().optional(),data:z.record(z.string(),z.unknown())});
export async function DELETE(req:Request,{params}:{params:Promise<{campaignId:string}>}){
 const {campaignId}=await params;const session=await auth();if(!session?.user?.id)return Response.json({error:"Unauthorized"},{status:401});
 if(!await canManageCampaign(campaignId,session.user.id))return Response.json({error:"Not found"},{status:404});
 const parsed=z.object({kind:z.enum(["note","npc"]),id:z.string().min(1)}).safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid record"},{status:400});
 if(parsed.data.kind==="note"){
  const deleted=await prisma.sessionNote.deleteMany({where:{id:parsed.data.id,campaignId}});
  if(deleted.count)await writeCampaignAudit({campaignId,actorId:session.user.id,action:"DELETE",entityType:"NOTE",entityId:parsed.data.id,summary:"Catatan kampanye dihapus"});
  return deleted.count?Response.json({ok:true}):Response.json({error:"Catatan tidak ditemukan."},{status:404});
 }
 const npc=await prisma.nPC.findFirst({where:{id:parsed.data.id,campaignId},select:{id:true,name:true}});if(!npc)return Response.json({error:"NPC tidak ditemukan."},{status:404});
 await prisma.nPC.delete({where:{id:npc.id}});await writeCampaignAudit({campaignId,actorId:session.user.id,action:"DELETE",entityType:"NPC",entityId:npc.id,summary:`NPC dihapus: ${npc.name.slice(0,120)}`});return Response.json({ok:true});
}
export async function POST(req:Request,{params}:{params:Promise<{campaignId:string}>}){
 const {campaignId}=await params;const session=await auth();if(!session?.user?.id)return Response.json({error:"Unauthorized"},{status:401});
 if(!await canManageCampaign(campaignId,session.user.id))return Response.json({error:"Not found"},{status:404});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid record"},{status:400});
 const {kind,id,data}=parsed.data;
 try{let record;switch(kind){
 case "note": {const d=z.object({title:z.string().min(1).max(160),body:z.string().max(50000),visibility:z.enum(["PUBLIC","DM_ONLY","PLAYER_VISIBLE","SELECTED_USERS"]).default("DM_ONLY"),storySceneId:z.string().nullable().optional(),locationId:z.string().nullable().optional(),questId:z.string().nullable().optional()}).parse(data);if((d.storySceneId&&await prisma.storyScene.count({where:{id:d.storySceneId,campaignId}})!==1)||(d.locationId&&await prisma.location.count({where:{id:d.locationId,campaignId}})!==1)||(d.questId&&await prisma.quest.count({where:{id:d.questId,campaignId}})!==1))return Response.json({error:"Relasi catatan harus berasal dari campaign ini."},{status:400});if(id){const updated=await prisma.sessionNote.updateMany({where:{id,campaignId},data:d});record={id,updated:updated.count===1}}else record=await prisma.sessionNote.create({data:{...d,campaignId,authorId:session.user.id}});break}
 case "timeline": {const d=z.object({title:z.string().min(1).max(160),description:z.string().max(10000).optional(),visibility:z.enum(["PUBLIC","DM_ONLY","PLAYER_VISIBLE","SELECTED_USERS"]).default("DM_ONLY")}).parse(data);record=await prisma.timelineEvent.create({data:{...d,campaignId}});break}
 case "lore": {const d=z.object({title:z.string().min(1).max(160),category:z.string().max(80).optional(),body:z.string().max(20000),visibility:z.enum(["PUBLIC","DM_ONLY","PLAYER_VISIBLE","SELECTED_USERS"]).default("DM_ONLY")}).parse(data);record=await prisma.lore.create({data:{...d,campaignId}});break}
 case "location": {const d=z.object({name:z.string().trim().min(1).max(160),parentId:z.preprocess(value=>value===""?undefined:value,z.string().optional()),description:z.string().max(10000).optional(),readAloud:z.string().max(10000).optional(),visibility:z.enum(["PUBLIC","DM_ONLY","PLAYER_VISIBLE","SELECTED_USERS"]).default("DM_ONLY")}).parse(data);if(d.parentId&&!await prisma.location.findFirst({where:{id:d.parentId,campaignId}}))return Response.json({error:"Lokasi induk tidak ditemukan di campaign ini."},{status:400});record=await prisma.location.create({data:{...d,campaignId}});break}
 case "npc": {const d=z.object({name:z.string().trim().min(1).max(160),role:z.string().max(120).optional(),description:z.string().max(10000).optional(),personality:z.string().max(10000).optional(),motivation:z.string().max(10000).optional(),voice:z.string().max(10000).optional(),status:z.string().max(40).default("ACTIVE"),visibility:z.enum(["PUBLIC","DM_ONLY","PLAYER_VISIBLE","SELECTED_USERS"]).default("DM_ONLY"),locationId:z.string().nullable().optional(),factionId:z.string().nullable().optional()}).parse(data);if((d.locationId&&await prisma.location.count({where:{id:d.locationId,campaignId}})!==1)||(d.factionId&&await prisma.faction.count({where:{id:d.factionId,campaignId}})!==1))return Response.json({error:"Lokasi atau faksi harus berasal dari campaign ini."},{status:400});const {locationId,factionId,...fields}=d;record=id?await prisma.nPC.updateMany({where:{id,campaignId},data:{...fields,locationId:locationId??null,factionId:factionId??null}}).then(result=>({id,updated:result.count===1})):await prisma.nPC.create({data:{...fields,campaignId,locationId,factionId}});if("updated" in record&&record.updated===false)return Response.json({error:"NPC tidak ditemukan."},{status:404});break}
 case "faction": {const d=z.object({name:z.string().trim().min(1).max(160),description:z.string().max(10000).optional(),goals:z.string().max(10000).optional(),resources:z.string().max(5000).optional(),allies:z.string().max(3000).optional(),rivals:z.string().max(3000).optional(),reputation:z.coerce.number().int().min(-100).max(100).default(0),visibility:z.enum(["PUBLIC","DM_ONLY","PLAYER_VISIBLE","SELECTED_USERS"]).default("DM_ONLY")}).parse(data);record=await prisma.faction.create({data:{...d,campaignId}});break}
 case "quest": {const d=z.object({title:z.string().min(1).max(160),description:z.string().max(10000).optional(),reward:z.string().max(3000).optional(),visibility:z.enum(["PUBLIC","DM_ONLY","PLAYER_VISIBLE","SELECTED_USERS"]).default("DM_ONLY")}).parse(data);record=await prisma.quest.create({data:{...d,campaignId}});break}
 }if(record&&typeof record.id==="string"&&!("updated" in record&&record.updated===false)){const label=typeof data.title==="string"?data.title:typeof data.name==="string"?data.name:kind;await writeCampaignAudit({campaignId,actorId:session.user.id,action:id?"UPDATE":"CREATE",entityType:kind.toUpperCase(),entityId:record.id,summary:`${kind} ${id?"diperbarui":"dibuat"}: ${label.slice(0,120)}`})}return Response.json(record,{status:201})}catch{return Response.json({error:"Could not save record"},{status:400})}
}




