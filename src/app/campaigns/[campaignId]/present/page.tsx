import { Eyebrow } from "@/components/ui/eyebrow";
import { notFound, redirect } from "next/navigation";
import { Visibility } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getCampaignRole } from "@/lib/permissions/campaign";
import { filterVisibleLocations } from "@/lib/location-visibility";

export default async function PlayerPresentationPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!await getCampaignRole(campaignId, session.user.id)) notFound();

  const [campaign, allLocations, scenes] = await Promise.all([
    prisma.campaign.findFirst({ where: { id: campaignId }, select: { name: true } }),
    prisma.location.findMany({ where: { campaignId }, select: { id: true, parentId: true, name: true, description: true, readAloud: true, visibility: true } }),
    prisma.storyScene.findMany({
      where: { campaignId, status: "IN_PROGRESS", visibility: { in: [Visibility.PUBLIC, Visibility.PLAYER_VISIBLE] } },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, title: true, objective: true, locationId: true,
        npcs: { where: { visibility: { in: [Visibility.PUBLIC, Visibility.PLAYER_VISIBLE] } }, select: { id: true, name: true, role: true, description: true } },
        quests: { where: { visibility: { in: [Visibility.PUBLIC, Visibility.PLAYER_VISIBLE] } }, select: { id: true, title: true, status: true } },
      },
    }),
  ]);
  if (!campaign) notFound();
  const visibleLocations = filterVisibleLocations(allLocations, false);
  const locationById = new Map(visibleLocations.map(location => [location.id, location]));

  return <main className="player-presentation [min-height:100vh] [padding:clamp(22px,_7vw,_80px)_18px] [background:#15161b] [color:#e5dccb] [font-family:var(--sans)] [max-width:1080px] [margin:auto] [&_>_header]:[margin:0_auto_28px] [&_>_header]:[max-width:780px] [&_>_header]:[text-align:center] [&_h1]:[font-family:var(--serif)] [&_h1]:[font-weight:500] [&_h1]:[color:#ead7b4] [&_h1]:[font-size:clamp(34px,_7vw,_58px)] [&_h1]:[margin:12px_0] [&_>_header_p]:[color:#b1a999] [&_>_header_p]:[line-height:1.7] [&_>_footer]:[margin:32px_auto_0] [&_>_footer]:[text-align:center] [&_>_footer]:[color:#817b70] [&_>_footer]:[font-size:10px] [&_>_footer]:[letter-spacing:0.15em] [&_>_footer]:[text-transform:uppercase]"><header><Eyebrow>PRESENTASI PEMAIN</Eyebrow><h1>{campaign.name}</h1><p>Informasi yang dibagikan Dungeon Master untuk permainan.</p></header>{scenes.length ? scenes.map(scene => {
    const location = scene.locationId ? locationById.get(scene.locationId) : undefined;
    return <article className="presentation-scene [&_h2]:[font-family:var(--serif)] [&_h2]:[font-weight:500] [&_h2]:[color:#ead7b4] [&_p]:[color:#b1a999] [&_p]:[line-height:1.7] [max-width:780px] [margin:0_auto_18px] [padding:clamp(20px,_4vw,_36px)] [border:1px_solid_#49443b] [border-radius:10px] [background:linear-gradient(145deg,_#222329,_#1a1b20)] [&_h2]:[font-size:clamp(26px,_5vw,_42px)] [&_h2]:[margin:7px_0_14px] [&_h3]:[color:#d9bc84] [&_h3]:[font-family:var(--serif)] [&_h3]:[font-weight:500] [&_blockquote]:[margin:0] [&_blockquote]:[padding:13px_17px] [&_blockquote]:[border-left:2px_solid_#9b7747] [&_blockquote]:[color:#e3d3b7] [&_blockquote]:[font-family:var(--serif)] [&_blockquote]:[font-size:18px] [&_blockquote]:[line-height:1.7] [&_ul]:[padding-left:20px] [&_ul]:[color:#cfc5b3] [&_li]:[margin:10px_0] [&_li_p]:[margin:5px_0] [&_small]:[color:#9e927d]" key={scene.id}><Eyebrow>SCENE AKTIF</Eyebrow><h2>{scene.title}</h2>{scene.objective && <p className="presentation-objective [font-size:18px]">{scene.objective}</p>}{location && <section><h3>{location.name}</h3>{location.readAloud ? <blockquote>{location.readAloud}</blockquote> : location.description && <p>{location.description}</p>}</section>}{scene.npcs.length > 0 && <section><h3>Tokoh</h3><ul>{scene.npcs.map(npc => <li key={npc.id}><strong>{npc.name}</strong>{npc.role && ` · ${npc.role}`}{npc.description && <p>{npc.description}</p>}</li>)}</ul></section>}{scene.quests.length > 0 && <section><h3>Quest</h3><ul>{scene.quests.map(quest => <li key={quest.id}>{quest.title} <small>{quest.status}</small></li>)}</ul></section>}</article>;
  }) : <section className="presentation-empty [max-width:780px] [margin:0_auto_18px] [padding:clamp(20px,_4vw,_36px)] [border:1px_solid_#49443b] [border-radius:10px] [background:linear-gradient(145deg,_#222329,_#1a1b20)] [text-align:center]"><h2>Belum ada scene yang dibagikan</h2><p>DM dapat memilih scene yang dibagikan dari Scene Tracker.</p></section>}<footer>Disiapkan oleh {campaign.name}</footer></main>;
}
