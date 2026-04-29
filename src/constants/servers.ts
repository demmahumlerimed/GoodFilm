import type { MediaType } from "../types";

export type ServerKey =
  | "111movies" | "filmu" | "videasy" | "vidking"
  | "vidlinkpro" | "vidfastpro" | "vidsrcicu" | "vidsrcxyz" | "twoembed";

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
    key: "111movies",
    label: "111movies — Default",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://111movies.net/tv/${tmdbId}/${season}/${episode}?autoplay=1`
        : `https://111movies.net/movie/${tmdbId}?autoplay=1`,
  },
  {
    key: "filmu",
    label: "Filmu",
    buildUrl: ({ type, tmdbId, season, episode }) =>
      type === "tv"
        ? `https://embed.filmu.in/#api?type=tv&id=${tmdbId}&s=${season}&e=${episode}`
        : `https://embed.filmu.in/#api?type=movie&id=${tmdbId}`,
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
