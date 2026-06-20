import type { APIRoute } from "astro";

/**
 * JSON Schema (draft 2020-12) describing the document served at
 * `/program/model.json`. Kept next to the data so an AI agent can fetch the
 * schema, understand the shape, then consume the programme without guessing.
 */

const SITE_URL = "https://caen.tech";

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `${SITE_URL}/program/schema.json`,
  title: "Caen.Tech Programme",
  description:
    "Complete programme of the Caen.Tech conference: event metadata, rooms, speakers and sessions (talks, breaks, animations and ceremonies).",
  type: "object",
  required: ["event", "rooms", "speakers", "sessions", "sponsors", "partners"],
  additionalProperties: false,
  properties: {
    $schema: {
      type: "string",
      description: "URL of this JSON Schema.",
    },
    event: {
      type: "object",
      description: "Top-level event metadata.",
      required: ["name", "date", "timeZone", "venue"],
      additionalProperties: false,
      properties: {
        name: { type: "string", examples: ["Caen.Tech 2026"] },
        date: {
          type: "string",
          format: "date",
          description: "Event day (YYYY-MM-DD).",
        },
        timeZone: {
          type: "string",
          description: "IANA time zone for all session times.",
          examples: ["Europe/Paris"],
        },
        venue: {
          type: "object",
          required: ["name", "address", "city", "postalCode"],
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            postalCode: { type: "string" },
          },
        },
        socialLinks: {
          type: "object",
          additionalProperties: { type: "string", format: "uri" },
          description: "Map of platform name to URL.",
        },
        ticketingUrl: { type: "string", format: "uri" },
        email: { type: "string", format: "email" },
      },
    },
    rooms: {
      type: "object",
      description: "Rooms keyed by room id.",
      additionalProperties: {
        type: "object",
        required: ["id", "name", "seats", "color", "order"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string", examples: ["Conférence", "Amphithéâtre"] },
          seats: { type: "integer", description: "Seating capacity." },
          color: {
            type: "string",
            description: "CSS color used in the calendar grid.",
          },
          order: {
            type: "integer",
            description: "Display order of the room.",
          },
        },
      },
    },
    speakers: {
      type: "object",
      description: "Speakers keyed by speaker id.",
      additionalProperties: {
        type: "object",
        required: ["id", "name", "socials"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string", description: "Job title (may be empty)." },
          company: { type: "string", description: "Company (may be empty)." },
          bio: { type: "string", description: "Biography (may be empty)." },
          photoUrl: {
            type: "string",
            format: "uri",
            description: "Absolute URL of the speaker profile picture.",
          },
          socials: {
            type: "array",
            description: "Social links.",
            items: {
              type: "object",
              required: ["name", "link"],
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                link: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
    },
    sessions: {
      type: "object",
      description:
        "Sessions keyed by session id, covering talks as well as breaks, animations and ceremonies. Sort by `startTime` for chronological order.",
      additionalProperties: {
        type: "object",
        required: [
          "id",
          "title",
          "description",
          "descriptionHtml",
          "kind",
          "type",
          "theme",
          "level",
          "startTime",
          "endTime",
          "durationMinutes",
          "roomId",
          "room",
          "speakers",
          "photos",
        ],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: {
            type: "string",
            description: "Plain-text description (HTML stripped). May be empty.",
          },
          descriptionHtml: {
            type: "string",
            description: "Original rich description as HTML. May be empty.",
          },
          kind: {
            type: "string",
            enum: ["talk", "break", "animation", "ceremony"],
            description:
              "talk = regular conference talk; break = pause / lunch / doors opening; animation = on-site activity (e.g. quiz); ceremony = opening or closing.",
          },
          type: {
            type: "string",
            enum: ["conférence", "atelier"],
            description: "Session format.",
          },
          theme: {
            type: "string",
            description: "Topic category.",
            examples: [
              "Tech & Ingénierie Logicielle",
              "IA, Data & Automatisation",
              "Cybersécurité & Résilience",
              "UX / UI & Design Produit",
              "Networking",
              "Événement",
              "Autres",
            ],
          },
          level: {
            type: "string",
            enum: ["débutant", "intermédiaire", "avancé"],
          },
          startTime: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 start time with offset.",
          },
          endTime: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 end time with offset.",
          },
          durationMinutes: {
            type: "integer",
            description: "Convenience duration in minutes.",
          },
          roomId: {
            type: "string",
            description:
              'Room id (key into `rooms`), or "all" for plenary / venue-wide slots.',
          },
          room: {
            type: "string",
            description: "Resolved room display name.",
          },
          speakers: {
            type: "array",
            description: "Speaker ids (keys into `speakers`).",
            items: { type: "string" },
          },
          photos: {
            type: "array",
            description: "Paths to session photos, relative to the site root.",
            items: { type: "string" },
          },
        },
      },
    },
    sponsors: {
      type: "array",
      description:
        "Event sponsors, ordered by tier (gold, then silver, then bronze).",
      items: {
        type: "object",
        required: ["id", "name", "tier", "logo", "url"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          tier: {
            type: "string",
            enum: ["gold", "silver", "bronze"],
            description: "Sponsoring level.",
          },
          logo: {
            type: "string",
            format: "uri",
            description: "Absolute URL of the sponsor logo.",
          },
          url: { type: "string", format: "uri" },
        },
      },
    },
    partners: {
      type: "array",
      description: "Event partners (venue, ticketing, media, etc.).",
      items: {
        type: "object",
        required: ["id", "name", "logo", "url", "description"],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          logo: {
            type: "string",
            format: "uri",
            description: "Absolute URL of the partner logo.",
          },
          url: { type: "string", format: "uri" },
          description: { type: "string" },
        },
      },
    },
  },
} as const;

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(schema, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
