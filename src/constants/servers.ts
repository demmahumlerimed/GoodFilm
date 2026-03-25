import type { MediaType } from "../types";

export type ServerKey =
  | "superembed" | "videasy" | "111movies" | "vidking"
  | "vidlinkpro" | "vidfastpro" | "embedsu" | "autoembed"
  | "vidsrcicu" | "vidsrcxyz" | "twoembed" | "embedmaster";

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
  {
    key: "superembed",
    label: "SuperEmbed — Default",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
  },
  {
    key: "embedmaster",
    label: "EmbedMaster",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://embedmaster.link/tv/${tmdbId}/${season}/${episode}`
        : `https://embedmaster.link/movie/${tmdbId}`,
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
    key: "111movies",
    label: "111movies",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://111movies.net/tv/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://111movies.net/movie/${tmdbId}?autoplay=1`,
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
    key: "vidsrcicu",
    label: "VidSrc ICU",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.icu/embed/movie/${tmdbId}`,
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
    key: "twoembed",
    label: "2Embed",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://www.2embed.stream/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://www.2embed.stream/embed/movie/${tmdbId}`,
  },
];
