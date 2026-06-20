import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import sessionPhotos from "../../data/session-photos.json";

const SITE_URL = "https://caen.tech";

/**
 * Complete, AI-friendly snapshot of the Caen.Tech programme.
 *
 * Aggregates every content collection (event, rooms, speakers, sessions) into a
 * single self-describing document. Each session is classified by `kind`
 * (talk / break / animation / ceremony) so a consumer can tell apart real talks
 * from pauses and on-stage moments. The companion JSON Schema lives next to this
 * file at `/program/schema.json`.
 */

type SessionKind = "talk" | "break" | "animation" | "ceremony";

type ModelSpeaker = {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  photoUrl?: string;
  socials: { name: string; link: string }[];
};

type ModelRoom = {
  id: string;
  name: string;
  seats: number;
  color: string;
  order: number;
};

type ModelSponsor = {
  id: string;
  name: string;
  tier: "gold" | "silver" | "bronze";
  logo: string;
  url: string;
};

type ModelPartner = {
  id: string;
  name: string;
  logo: string;
  url: string;
  description: string;
};

type ModelSession = {
  id: string;
  title: string;
  description: string;
  descriptionHtml: string;
  kind: SessionKind;
  type: "conférence" | "atelier";
  theme: string;
  level: "débutant" | "intermédiaire" | "avancé";
  startTime: string;
  endTime: string;
  durationMinutes: number;
  roomId: string;
  room: string;
  speakers: string[];
  photos: string[];
};

const photosBySession = sessionPhotos as Record<string, string[]>;

/** Convert the stored HTML description into clean plain text for LLM consumption. */
function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|ul|ol)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tell apart talks from pauses, animations and opening/closing ceremonies. */
function classify(id: string, title: string, theme: string): SessionKind {
  if (id.startsWith("pause") || id === "ouverture-des-portes") return "break";
  if (theme === "Événement") return "ceremony";
  if (/^quiz/i.test(id) || /^quiz/i.test(title)) return "animation";
  return "talk";
}

function durationMinutes(start: string, end: string): number {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
}

export const GET: APIRoute = async () => {
  const [allSite, allProgram, allSpeakers, allRooms, allSponsors, allPartners] =
    await Promise.all([
      getCollection("site"),
      getCollection("program"),
      getCollection("speakers"),
      getCollection("rooms"),
      getCollection("sponsors"),
      getCollection("partners"),
    ]);

  const site = allSite[0]?.data;
  const roomById = new Map(allRooms.map((r) => [r.data.id, r.data]));

  const event = site
    ? {
        name: "Caen.Tech 2026",
        date: site.eventDate,
        timeZone: "Europe/Paris",
        venue: site.venue,
        socialLinks: site.socialLinks,
        ticketingUrl: site.billetterieUrl,
        email: site.email,
      }
    : undefined;

  const rooms: Record<string, ModelRoom> = {};
  for (const r of [...allRooms].sort((a, b) => a.data.order - b.data.order)) {
    rooms[r.data.id] = {
      id: r.data.id,
      name: r.data.name,
      seats: r.data.seats,
      color: r.data.color,
      order: r.data.order,
    };
  }

  const speakers: Record<string, ModelSpeaker> = {};
  for (const item of [...allSpeakers].sort((a, b) =>
    a.data.name.localeCompare(b.data.name, "fr"),
  )) {
    const sp = item.data;
    const speaker: ModelSpeaker = {
      id: sp.id,
      name: sp.name,
      role: sp.role,
      company: sp.company,
      bio: sp.bio,
      socials: [],
    };
    if (sp.photo) {
      speaker.photoUrl = sp.photo.startsWith("http")
        ? sp.photo
        : `${SITE_URL}${sp.photo}`;
    }
    speakers[sp.id] = speaker;
  }

  const sessions: Record<string, ModelSession> = {};
  for (const item of [...allProgram].sort((a, b) =>
    a.data.startTime.localeCompare(b.data.startTime),
  )) {
    const s = item.data;
    const room = roomById.get(s.roomId);
    sessions[s.id] = {
      id: s.id,
      title: s.title,
      description: stripHtml(s.description),
      descriptionHtml: s.description,
      kind: classify(s.id, s.title, s.theme),
      type: s.type,
      theme: s.theme,
      level: s.level,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes: durationMinutes(s.startTime, s.endTime),
      roomId: s.roomId,
      room: room?.name ?? "Espace Experiment",
      speakers: s.speakerIds,
      photos: photosBySession[s.id] ?? [],
    };
  }

  const tierOrder: Record<ModelSponsor["tier"], number> = {
    gold: 0,
    silver: 1,
    bronze: 2,
  };
  const sponsors: ModelSponsor[] = [...allSponsors]
    .map((item) => ({
      id: item.data.id,
      name: item.data.name,
      tier: item.data.tier,
      logo: item.data.logo.startsWith("http")
        ? item.data.logo
        : `${SITE_URL}${item.data.logo}`,
      url: item.data.url,
    }))
    .sort(
      (a, b) =>
        tierOrder[a.tier] - tierOrder[b.tier] ||
        a.name.localeCompare(b.name, "fr"),
    );

  const partners: ModelPartner[] = [...allPartners].map((item) => ({
    id: item.data.id,
    name: item.data.name,
    logo: item.data.logo.startsWith("http")
      ? item.data.logo
      : `${SITE_URL}${item.data.logo}`,
    url: item.data.url,
    description: item.data.description,
  }));

  const model = {
    $schema: `${SITE_URL}/program/schema.json`,
    event,
    rooms,
    speakers,
    sessions,
    sponsors,
    partners,
  };

  return new Response(JSON.stringify(model, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
