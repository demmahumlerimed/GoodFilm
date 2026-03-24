import type { AppLanguage } from "../types";

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    home: "Home", movies: "Movies", tvShows: "TV Shows", search: "Search",
    settings: "Settings", language: "Language", data: "Data",
    importMovies: "Import Movies", exportMovies: "Export Movies",
    account: "Account", login: "Login", signUp: "Sign Up",
    logout: "Logout", helpSupport: "Help & Support",
    myList: "My List", watchlist: "Watchlist", watched: "Watched",
    back: "Back", details: "Details", synopsis: "Synopsis",
    cast: "Cast", trailer: "Trailer", externalLink: "External link",
    openTrailer: "Open Trailer on YouTube",
    addToWatchlist: "Add to Watchlist", inWatchlist: "In Watchlist",
    markWatched: "Mark Watched", watchedLabel: "Watched",
    myRating: "My Rating", episodeTracker: "Episode Tracker",
    searchResults: "Search Results", bulkLinkTMDB: "Bulk Link TMDB",
    linking: "Linking...", cloudSyncActive: "Cloud sync active",
    cloudTableMissing: "Cloud table missing — setup required",
    cloudSyncChecking: "Cloud sync checking",
    localAccountMode: "Local account mode",
    loginRequiredCloud: "Login required for cloud sync",
    copySetupSql: "Copy setup SQL", signedInAs: "Signed in as",
    popularMovies: "Popular Movies", trendingNow: "Trending Now",
    popularTVSeries: "Popular TV Series", topRatedTV: "Top Rated TV",
    comingSoon: "Coming Soon", rating: "Rating", year: "Year",
    runtime: "Runtime", genres: "Genres", languageLabel: "Language",
    studio: "Studio", director: "Director", release: "Release",
    watchSources: "Watch Sources", searchOn: "Search on",
    unavailable: "Manual", noVerifiedLinks: "No verified direct links added yet. Open a source site and search manually.",
    latestMovies: "Latest Movies", latestSeries: "Latest Series",
    directLink: "Direct", manualAccess: "Manual",
    watchHint: "Exact page when mapped, homepage otherwise.",
    fanFavorites: "Fan Favorites", trendingMovies: "Trending Movies",
    crimeTV: "Crime TV", dramaTV: "Drama TV",
    sciFiFantasyTV: "Sci-Fi & Fantasy TV", animationTV: "Animation TV",
    comedyTV: "Comedy TV", helpUnavailable: "Help is not configured yet.",
  },
};

export function tr(_language: AppLanguage, key: string): string {
  return TRANSLATIONS.en[key] || key;
}

export function loadLanguage(): AppLanguage {
  return "en";
}
