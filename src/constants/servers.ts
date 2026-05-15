import type { MediaType } from "../types";

export type ServerKey =
  | "111movies" | "videasy" | "streamvault"
  | "embedmaster" | "embedsu" | "autoembed"
  | "vidking" | "vidlinkpro" | "vidfastpro" | "vidsrcxyz" | "vidsrcicu" | "twoembed"
  | "superembed";

export type ServerConfig = {
  key: ServerKey;
  label: string;
  buildUrl: (args: {
    type: MediaType;
    tmdbId: number | string;
    season?: number;
    episode?: number;
  }) => string;
};

export const SERVERS: ServerConfig[] = [
  // ── Tier 1: Production-tested working ─────────────────────────────────────
  {
    key: "111movies",
    label: "111movies — Default",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://111movies.net/tv/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://111movies.net/movie/${tmdbId}?autoplay=1`,
  },
  {
    key: "videasy",
    label: "Videasy",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
        : `https://player.videasy.net/movie/${tmdbId}`,
  },
  {
    key: "streamvault",
    label: "StreamVault",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://streamvaultsrc.click/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://streamvaultsrc.click/embed/movie/${tmdbId}`,
  },

  // ── Tier 2: Unverified / may work ─────────────────────────────────────────
  {
    key: "embedmaster",
    label: "EmbedMaster",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://embedmaster.link/tv/${tmdbId}/${season}/${episode}`
        : `https://embedmaster.link/movie/${tmdbId}`,
  },
  {
    key: "embedsu",
    label: "Embed.su",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://embed.su/embed/movie/${tmdbId}`,
  },
  {
    key: "autoembed",
    label: "AutoEmbed",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://player.autoembed.cc/embed/movie/${tmdbId}`,
  },
  {
    key: "vidking",
    label: "VidKing",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://www.vidking.net/embed/movie/${tmdbId}`,
  },
  {
    key: "vidlinkpro",
    label: "Vidlink Pro",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`
        : `https://vidlink.pro/movie/${tmdbId}`,
  },
  {
    key: "vidfastpro",
    label: "VidFast Pro",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidfast.net/tv/${tmdbId}/${season}/${episode}`
        : `https://vidfast.net/movie/${tmdbId}`,
  },
  {
    key: "vidsrcxyz",
    label: "Vidsrc XYZ",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.xyz/embed/movie/${tmdbId}`,
  },
  {
    key: "vidsrcicu",
    label: "VidSrc ICU",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.icu/embed/movie/${tmdbId}`,
  },
  {
    key: "twoembed",
    label: "2Embed",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://www.2embed.stream/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://www.2embed.stream/embed/movie/${tmdbId}`,
  },

  // ── Tier 3: Production-blocked ────────────────────────────────────────────
  // SuperEmbed: renders "This content is blocked. Contact the site owner to fix the issue." in production
  {
    key: "superembed",
    label: "SuperEmbed",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
  },
];
