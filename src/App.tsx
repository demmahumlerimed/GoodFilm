import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Film,
  Home,
  Info,
  List,
  Play,
  Search,
  Star,
  Tv,
  Upload,
  User,
  X,
  Settings,
  Sun,
  Languages,
  LogIn,
  HelpCircle,
  ChevronRight as ChevronRightSmall,
  LogOut,
  Cloud,
  Mail,
  Lock,
  RefreshCw,
} from "lucide-react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TMDB_BEARER = "";
const TMDB_API_KEY = "2abbda52b30975da8104f64238c074ad";
const USE_BEARER = Boolean(TMDB_BEARER);

const API_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";
const IMDB_API_BASE = "https://api.imdbapi.dev";

type ExternalProvider = {
  id: string;
  label: string;
  homeUrl: string;
  accent: string;
};

type ProviderId = "67movies" | "cinemana" | "sezonlukdizi" | "hdfilmcehennemi" | "dizibox" | "bitcine" | "flixer";

type ProviderLinkMap = Partial<Record<ProviderId, string>>;

type VerifiedProviderMap = Record<string, ProviderLinkMap>;

const EXTERNAL_PROVIDERS: ExternalProvider[] = [
  { id: "67movies", label: "67movies", homeUrl: "https://67movies.net/", accent: "from-[#f59e0b] to-[#f97316]" },
  { id: "cinemana", label: "Cinemana", homeUrl: "https://cinemana.shabakaty.cc/home", accent: "from-[#38bdf8] to-[#2563eb]" },
  { id: "sezonlukdizi", label: "SezonlukDizi", homeUrl: "https://sezonlukdizi.cc/", accent: "from-[#34d399] to-[#059669]" },
  { id: "hdfilmcehennemi", label: "HDFilmCehennemi", homeUrl: "https://www.hdfilmcehennemi2.site/", accent: "from-[#fb7185] to-[#e11d48]" },
  { id: "dizibox", label: "Dizibox", homeUrl: "https://www.dizibox.live/", accent: "from-[#a78bfa] to-[#7c3aed]" },
  { id: "bitcine", label: "bitcine", homeUrl: "https://www.bitcine.app/", accent: "from-[#a88bfa] to-[#8c3aed]" },
  { id: "flixer", label: "flixer", homeUrl: "https://www.flixer.su/", accent: "from-[#a98bfa] to-[#9c3aed]" },

];

const VERIFIED_PROVIDER_LINKS: VerifiedProviderMap = {
  // Format: "movie:TMDB_ID" or "tv:TMDB_ID"
  // Example:
  // "tv:1396": {
  //   sezonlukdizi: "https://sezonlukdizi.cc/diziler/breaking-bad",
  //   dizibox: "https://www.dizibox.live/diziler/breaking-bad-izle-2/",
  // },
};

const STORAGE_KEY = "goodfilm_library";
const BACKUP_KEY = "goodfilm_backup";
const LIBRARY_META_KEY = "goodfilm_library_meta";
const LOCAL_AUTH_KEY = "goodfilm_local_auth";
const LANGUAGE_KEY = "goodfilm_language";
const SUPABASE_URL = "https://pdjgsxbvrjiswxpztjxa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F4qGznnYVhpSLZr6kNGilw_1BDgYgYb";
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase: SupabaseClient | null = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const CLOUD_SETUP_SQL = `create table if not exists public.goodfilm_libraries (
  user_id uuid primary key,
  email text,
  library jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.goodfilm_libraries enable row level security;

drop policy if exists "Users can read own library" on public.goodfilm_libraries;
create policy "Users can read own library"
on public.goodfilm_libraries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own library" on public.goodfilm_libraries;
create policy "Users can insert own library"
on public.goodfilm_libraries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own library" on public.goodfilm_libraries;
create policy "Users can update own library"
on public.goodfilm_libraries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);`;

type Tab = "home" | "movies" | "series" | "mylist" | "watchlist" | "watched";
type AuthMode = "login" | "signup";
type MediaType = "movie" | "tv";
type AppLanguage = "en" | "ar" | "es" | "fr" | "tr";

type MediaItem = {
  id: number;
  media_type?: MediaType;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
};

type Genre = { id: number; name: string };
type SeasonInfo = { season_number: number; name: string; episode_count: number };

type DetailData = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  genres?: Genre[];
  seasons?: SeasonInfo[];
  runtime?: number;
  original_language?: string;
  production_companies?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: CastMember[];
    crew?: Array<{ id: number; name: string; job?: string; department?: string }>;
  };
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
};

type IMDbTitleData = {
  id?: string;
  primaryTitle?: string;
  description?: string;
  plot?: string;
  primaryImage?: { url?: string | null };
  rating?: { aggregateRating?: number; voteCount?: number };
  ratingsSummary?: { aggregateRating?: number; voteCount?: number };
  metacritic?: number;
  cast?: Array<{ id?: string; name?: string; characters?: string[] }>;
};

type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

type Episode = {
  id: number;
  episode_number: number;
  name: string;
  runtime?: number | null;
  air_date?: string | null;
};

type VideoResult = {
  id: string;
  key: string;
  site: string;
  type: string;
};

type LibraryItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: string;
  rating: number | null;
};

type WatchingProgress = {
  [showId: string]: {
    season: number;
    episodeFilter?: "all" | "watched" | "unwatched";
    selectedEpisodeBySeason: Record<string, number>;
    watchedEpisodesBySeason: Record<string, number[]>;
  };
};

type UserLibrary = {
  watchlist: LibraryItem[];
  watched: LibraryItem[];
  ratings: Record<string, number>;
  watching: WatchingProgress;
};

type ImportExportPayload = {
  version: 1;
  exportedAt: string;
  library: UserLibrary;
};

type CloudUser = {
  id: string;
  email: string;
  provider: "supabase" | "local";
};

type CloudLibraryRow = {
  library: UserLibrary;
  updated_at?: string | null;
};

type CloudMode = "disabled" | "unknown" | "ready" | "missing_table";

type SupabaseRuntimeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  tr: "Türkçe",
  es: "Español",
  fr: "Français",
  ar: "العربية",
};

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    home: "Home", movies: "Movies", tvShows: "TV Shows", search: "Search", settings: "Settings", language: "Language", data: "Data", importMovies: "Import Movies", exportMovies: "Export Movies", account: "Account", login: "Login", signUp: "Sign Up", logout: "Logout", helpSupport: "Help & Support", myList: "My List", watchlist: "Watchlist", watched: "Watched", back: "Back", details: "Details", synopsis: "Synopsis", cast: "Cast", trailer: "Trailer", externalLink: "External link", openTrailer: "Open Trailer on YouTube", addToWatchlist: "Add to Watchlist", inWatchlist: "In Watchlist", markWatched: "Mark Watched", watchedLabel: "Watched", myRating: "My Rating", episodeTracker: "Episode Tracker", searchResults: "Search Results", bulkLinkTMDB: "Bulk Link TMDB", linking: "Linking...", cloudSyncActive: "Cloud sync active", cloudTableMissing: "Cloud table missing — setup required", cloudSyncChecking: "Cloud sync checking", localAccountMode: "Local account mode", loginRequiredCloud: "Login required for cloud sync", copySetupSql: "Copy setup SQL", signedInAs: "Signed in as", popularMovies: "Popular Movies", trendingNow: "Trending Now", popularTVSeries: "Popular TV Series", topRatedTV: "Top Rated TV", comingSoon: "Coming Soon", rating: "Rating", year: "Year", runtime: "Runtime", genres: "Genres", languageLabel: "Language", studio: "Studio", director: "Director", release: "Release", watchSources: "Watch Sources", searchOn: "Search on", unavailable: "Manual", noVerifiedLinks: "No verified direct links added yet. Open a source site and search manually.", latestMovies: "Latest Movies", latestSeries: "Latest Series", directLink: "Direct", manualAccess: "Manual", watchHint: "Exact page when mapped, homepage otherwise.", fanFavorites: "Fan Favorites", trendingMovies: "Trending Movies", crimeTV: "Crime TV", dramaTV: "Drama TV", sciFiFantasyTV: "Sci-Fi & Fantasy TV", animationTV: "Animation TV", comedyTV: "Comedy TV", helpUnavailable: "Help is not configured yet."
  },
  ar: {
    home: "الرئيسية", movies: "الأفلام", tvShows: "المسلسلات", search: "بحث", settings: "الإعدادات", language: "اللغة", data: "البيانات", importMovies: "استيراد الأفلام", exportMovies: "تصدير الأفلام", account: "الحساب", login: "تسجيل الدخول", signUp: "إنشاء حساب", logout: "تسجيل الخروج", helpSupport: "المساعدة والدعم", myList: "قائمتي", watchlist: "المشاهدة لاحقاً", watched: "تمت المشاهدة", back: "رجوع", details: "التفاصيل", synopsis: "الملخص", cast: "طاقم التمثيل", trailer: "الإعلان", externalLink: "رابط خارجي", openTrailer: "فتح الإعلان على يوتيوب", addToWatchlist: "أضف إلى القائمة", inWatchlist: "في القائمة", markWatched: "تحديد كمشاهد", watchedLabel: "تمت المشاهدة", myRating: "تقييمي", episodeTracker: "متابعة الحلقات", searchResults: "نتائج البحث", bulkLinkTMDB: "ربط TMDB جماعياً", linking: "جارٍ الربط...", cloudSyncActive: "مزامنة السحابة مفعلة", cloudTableMissing: "جدول السحابة مفقود — يلزم الإعداد", cloudSyncChecking: "جارٍ فحص مزامنة السحابة", localAccountMode: "وضع الحساب المحلي", loginRequiredCloud: "يلزم تسجيل الدخول لمزامنة السحابة", copySetupSql: "نسخ SQL الإعداد", signedInAs: "تم تسجيل الدخول باسم", popularMovies: "الأفلام الشائعة", trendingNow: "الرائج الآن", popularTVSeries: "المسلسلات الشائعة", topRatedTV: "المسلسلات الأعلى تقييماً", comingSoon: "قريباً", rating: "التقييم", year: "السنة", runtime: "المدة", genres: "الأنواع", languageLabel: "اللغة", studio: "الاستوديو", director: "المخرج", release: "الإصدار", watchSources: "مصادر المشاهدة", searchOn: "ابحث في", unavailable: "يدوي", noVerifiedLinks: "لم تتم إضافة روابط مباشرة موثقة بعد. افتح المصدر وابحث يدوياً.", latestMovies: "أحدث الأفلام", latestSeries: "أحدث المسلسلات", directLink: "رابط مباشر", manualAccess: "يدوي", watchHint: "يفتح الصفحة المباشرة عند توفرها، وإلا الصفحة الرئيسية.", fanFavorites: "المفضلة", trendingMovies: "الأفلام الرائجة", crimeTV: "مسلسلات الجريمة", dramaTV: "مسلسلات الدراما", sciFiFantasyTV: "خيال علمي وفانتازيا", animationTV: "الرسوم المتحركة", comedyTV: "المسلسلات الكوميدية", helpUnavailable: "المساعدة غير مهيأة بعد."
  },
  es: {
    home: "Inicio", movies: "Películas", tvShows: "Series", search: "Buscar", settings: "Ajustes", language: "Idioma", data: "Datos", importMovies: "Importar películas", exportMovies: "Exportar películas", account: "Cuenta", login: "Iniciar sesión", signUp: "Crear cuenta", logout: "Cerrar sesión", helpSupport: "Ayuda y soporte", myList: "Mi lista", watchlist: "Por ver", watched: "Vistas", back: "Volver", details: "Detalles", synopsis: "Sinopsis", cast: "Reparto", trailer: "Tráiler", externalLink: "Enlace externo", openTrailer: "Abrir tráiler en YouTube", addToWatchlist: "Añadir a la lista", inWatchlist: "En la lista", markWatched: "Marcar como vista", watchedLabel: "Vista", myRating: "Mi puntuación", episodeTracker: "Seguimiento de episodios", searchResults: "Resultados de búsqueda", bulkLinkTMDB: "Vincular TMDB", linking: "Vinculando...", cloudSyncActive: "Sincronización activa", cloudTableMissing: "Falta la tabla en la nube", cloudSyncChecking: "Comprobando sincronización", localAccountMode: "Modo local", loginRequiredCloud: "Inicia sesión para sincronizar", copySetupSql: "Copiar SQL", signedInAs: "Sesión iniciada como", popularMovies: "Películas populares", trendingNow: "Tendencias", popularTVSeries: "Series populares", topRatedTV: "Series mejor valoradas", comingSoon: "Próximamente", rating: "Puntuación", year: "Año", runtime: "Duración", genres: "Géneros", languageLabel: "Idioma", studio: "Estudio", director: "Director", release: "Estreno", watchSources: "Fuentes", searchOn: "Buscar en", unavailable: "Manual", noVerifiedLinks: "Aún no se han añadido enlaces directos verificados. Abre el sitio y busca manualmente.", latestMovies: "Últimas películas", latestSeries: "Últimas series", directLink: "Directo", manualAccess: "Manual", watchHint: "Página exacta si está verificada; si no, la portada del sitio.", fanFavorites: "Favoritas", trendingMovies: "Películas en tendencia", crimeTV: "Series de crimen", dramaTV: "Series dramáticas", sciFiFantasyTV: "Sci-Fi y fantasía", animationTV: "Animación", comedyTV: "Series de comedia", helpUnavailable: "La ayuda aún no está configurada."
  },
  fr: {
    home: "Accueil", movies: "Films", tvShows: "Séries", search: "Recherche", settings: "Paramètres", language: "Langue", data: "Données", importMovies: "Importer des films", exportMovies: "Exporter des films", account: "Compte", login: "Connexion", signUp: "Créer un compte", logout: "Déconnexion", helpSupport: "Aide et support", myList: "Ma liste", watchlist: "À voir", watched: "Vu", back: "Retour", details: "Détails", synopsis: "Synopsis", cast: "Casting", trailer: "Bande-annonce", externalLink: "Lien externe", openTrailer: "Ouvrir la bande-annonce sur YouTube", addToWatchlist: "Ajouter à la liste", inWatchlist: "Dans la liste", markWatched: "Marquer comme vu", watchedLabel: "Vu", myRating: "Ma note", episodeTracker: "Suivi des épisodes", searchResults: "Résultats de recherche", bulkLinkTMDB: "Lier TMDB", linking: "Liaison...", cloudSyncActive: "Synchro cloud active", cloudTableMissing: "Table cloud manquante", cloudSyncChecking: "Vérification cloud", localAccountMode: "Mode local", loginRequiredCloud: "Connexion requise", copySetupSql: "Copier le SQL", signedInAs: "Connecté en tant que", popularMovies: "Films populaires", trendingNow: "Tendances", popularTVSeries: "Séries populaires", topRatedTV: "Séries les mieux notées", comingSoon: "Bientôt", rating: "Note", year: "Année", runtime: "Durée", genres: "Genres", languageLabel: "Langue", studio: "Studio", director: "Réalisateur", release: "Sortie", watchSources: "Sources", searchOn: "Rechercher sur", unavailable: "Manuel", noVerifiedLinks: "Aucun lien direct vérifié n'a encore été ajouté. Ouvrez le site et recherchez manuellement.", latestMovies: "Derniers films", latestSeries: "Dernières séries", directLink: "Direct", manualAccess: "Manuel", watchHint: "Page exacte si vérifiée, sinon page d'accueil du site.", fanFavorites: "Favoris", trendingMovies: "Films tendance", crimeTV: "Séries criminelles", dramaTV: "Séries dramatiques", sciFiFantasyTV: "SF & fantasy", animationTV: "Animation", comedyTV: "Séries comiques", helpUnavailable: "L'aide n'est pas encore configurée."
  },
  tr: {
    home: "Ana Sayfa", movies: "Filmler", tvShows: "Diziler", search: "Ara", settings: "Ayarlar", language: "Dil", data: "Veri", importMovies: "Film İçe Aktar", exportMovies: "Filmleri Dışa Aktar", account: "Hesap", login: "Giriş Yap", signUp: "Kayıt Ol", logout: "Çıkış Yap", helpSupport: "Yardım ve Destek", myList: "Listem", watchlist: "İzleme Listesi", watched: "İzlendi", back: "Geri", details: "Detaylar", synopsis: "Özet", cast: "Oyuncular", trailer: "Fragman", externalLink: "Harici bağlantı", openTrailer: "Fragmanı YouTube'da Aç", addToWatchlist: "Listeye Ekle", inWatchlist: "Listede", markWatched: "İzlendi Olarak İşaretle", watchedLabel: "İzlendi", myRating: "Puanım", episodeTracker: "Bölüm Takibi", searchResults: "Arama Sonuçları", bulkLinkTMDB: "TMDB Toplu Eşleştir", linking: "Eşleştiriliyor...", cloudSyncActive: "Bulut senkronu aktif", cloudTableMissing: "Bulut tablosu eksik", cloudSyncChecking: "Bulut senkronu kontrol ediliyor", localAccountMode: "Yerel hesap modu", loginRequiredCloud: "Bulut için giriş gerekli", copySetupSql: "Kurulum SQL'ini Kopyala", signedInAs: "Giriş yapan", popularMovies: "Popüler Filmler", trendingNow: "Trend Olanlar", popularTVSeries: "Popüler Diziler", topRatedTV: "En Yüksek Puanlı Diziler", comingSoon: "Yakında", rating: "Puan", year: "Yıl", runtime: "Süre", genres: "Türler", languageLabel: "Dil", studio: "Stüdyo", director: "Yönetmen", release: "Yayın", watchSources: "İzleme Kaynakları", searchOn: "Şurada ara", unavailable: "Manuel", noVerifiedLinks: "Henüz doğrulanmış doğrudan bağlantı eklenmedi. Siteyi açıp manuel arama yapın.", latestMovies: "En Yeni Filmler", latestSeries: "En Yeni Diziler", directLink: "Doğrudan", manualAccess: "Manuel", watchHint: "Doğrulanırsa direkt sayfa, yoksa site ana sayfası açılır.", fanFavorites: "Öne Çıkanlar", trendingMovies: "Trend Filmler", crimeTV: "Suç Dizileri", dramaTV: "Dram Dizileri", sciFiFantasyTV: "Bilim Kurgu & Fantastik", animationTV: "Animasyon", comedyTV: "Komedi Dizileri", helpUnavailable: "Yardım henüz yapılandırılmadı."
  }
};

function tr(language: AppLanguage, key: string) {
  return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
}

function buildExternalProviderLinks(tmdbId: number, mediaType: MediaType) {
  const lookupKey = `${mediaType}:${tmdbId}`;
  const exactLinks = VERIFIED_PROVIDER_LINKS[lookupKey] || {};
  return EXTERNAL_PROVIDERS
    .map((provider) => ({
      ...provider,
      url: exactLinks[provider.id as keyof ProviderLinkMap] || null,
    }))
    .filter((provider): provider is ExternalProvider & { url: string } => Boolean(provider.url));
}

function loadLanguage(): AppLanguage {
  try {
    const raw = localStorage.getItem(LANGUAGE_KEY);
    if (raw === "en" || raw === "ar" || raw === "es" || raw === "fr" || raw === "tr") return raw;
  } catch {}
  return "en";
}

const defaultLibrary: UserLibrary = {
  watchlist: [],
  watched: [],
  ratings: {},
  watching: {},
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function runAppDiagnostics(library: UserLibrary) {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!TMDB_API_KEY && !TMDB_BEARER) issues.push("TMDB credentials missing.");
  if (!supabase && (SUPABASE_URL || SUPABASE_ANON_KEY)) warnings.push("Supabase config is partial or invalid.");

  const providerIds = new Set<string>();
  EXTERNAL_PROVIDERS.forEach((provider) => {
    if (providerIds.has(provider.id)) issues.push(`Duplicate provider id: ${provider.id}`);
    providerIds.add(provider.id);
    if (!provider.homeUrl.startsWith("http")) issues.push(`Provider homeUrl invalid: ${provider.id}`);
  });

  const seenWatchlist = new Set<string>();
  const seenWatched = new Set<string>();

  library.watchlist.forEach((item) => {
    const k = keyFor(item);
    if (seenWatchlist.has(k)) warnings.push(`Duplicate watchlist item: ${k}`);
    seenWatchlist.add(k);
    if (!item.title?.trim()) issues.push(`Watchlist item missing title: ${k}`);
  });

  library.watched.forEach((item) => {
    const k = keyFor(item);
    if (seenWatched.has(k)) warnings.push(`Duplicate watched item: ${k}`);
    seenWatched.add(k);
    if (!item.title?.trim()) issues.push(`Watched item missing title: ${k}`);
  });

  Object.entries(library.ratings).forEach(([k, value]) => {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 10) {
      issues.push(`Invalid rating value for ${k}: ${String(value)}`);
    }
  });

  Object.entries(library.watching).forEach(([showId, progress]) => {
    if (!Number.isFinite(progress.season) || progress.season < 1) issues.push(`Invalid season for show ${showId}`);
    Object.entries(progress.watchedEpisodesBySeason || {}).forEach(([seasonKey, episodes]) => {
      const prev = [...episodes];
      const normalized = normalizeEpisodeNumbers(episodes);
      if (prev.length !== normalized.length || prev.some((ep, idx) => ep !== normalized[idx])) {
        warnings.push(`Season episode list not normalized for show ${showId}, season ${seasonKey}`);
      }
    });
    Object.entries(progress.selectedEpisodeBySeason || {}).forEach(([seasonKey, episode]) => {
      if (!Number.isFinite(episode) || episode < 1) issues.push(`Invalid selected episode for show ${showId}, season ${seasonKey}`);
    });
  });

  const translationKeys = Object.keys(TRANSLATIONS.en || {});
  (Object.keys(TRANSLATIONS) as AppLanguage[]).forEach((lang) => {
    translationKeys.forEach((key) => {
      if (!TRANSLATIONS[lang]?.[key]) warnings.push(`Missing translation: ${lang}.${key}`);
    });
  });

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

function getHeaders() {
  if (USE_BEARER) {
    return {
      Authorization: `Bearer ${TMDB_BEARER}`,
      "Content-Type": "application/json",
    };
  }
  return { "Content-Type": "application/json" };
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE}${path}`);
  if (!USE_BEARER && TMDB_API_KEY) url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function tmdbFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const res = await fetch(buildUrl(path, params), { headers: getHeaders() });
  if (!res.ok) throw new Error(`TMDB failed: ${res.status}`);
  return res.json();
}

async function imdbFetchTitle(imdbId: string): Promise<IMDbTitleData | null> {
  try {
    const res = await fetch(`${IMDB_API_BASE}/titles/${imdbId}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function extractIMDbRating(data: IMDbTitleData | null): number | null {
  if (!data) return null;
  const value = data.rating?.aggregateRating ?? data.ratingsSummary?.aggregateRating;
  return typeof value === "number" ? value : null;
}

function extractIMDbVotes(data: IMDbTitleData | null): number | null {
  if (!data) return null;
  const value = data.rating?.voteCount ?? data.ratingsSummary?.voteCount;
  return typeof value === "number" ? value : null;
}

async function searchTMDBMatchForLibraryItem(item: LibraryItem): Promise<MediaItem | null> {
  const path = item.mediaType === "tv" ? "/search/tv" : "/search/movie";
  const yearParam = item.mediaType === "tv" ? "first_air_date_year" : "year";
  const query = item.title.replace(/\([^)]*\)/g, "").trim();
  const params: Record<string, string | number | undefined> = { query };
  if (item.year && item.year !== "—") params[yearParam] = item.year;

  const res = await tmdbFetch<{ results: MediaItem[] }>(path, params);
  const results = res.results || [];
  if (!results.length) return null;

  const normalizedTitle = query.toLowerCase();
  const exact = results.find((candidate) => getTitle(candidate).toLowerCase() === normalizedTitle && getYear(candidate) === item.year);
  if (exact) return exact;

  const sameYear = results.find((candidate) => getYear(candidate) === item.year);
  if (sameYear) return sameYear;

  return results[0] || null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, () => runWorker()));
  return results;
}

function getTitle(item: Partial<MediaItem | DetailData>) {
  return item.title || item.name || "Untitled";
}

function getYear(item: Partial<MediaItem | DetailData>) {
  const raw = item.release_date || item.first_air_date;
  return raw ? raw.slice(0, 4) : "—";
}

function normalizeMedia(item: MediaItem, forcedType?: MediaType): LibraryItem {
  const mediaType = forcedType || item.media_type || (item.first_air_date ? "tv" : "movie");
  return {
    id: item.id,
    mediaType,
    title: getTitle(item),
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    year: getYear(item),
    rating: item.vote_average ?? null,
  };
}

function keyFor(item: { id: number; mediaType: MediaType }) {
  return `${item.mediaType}-${item.id}`;
}

function makeSyntheticId(item: any): number {
  const seed = `${item?.title || item?.name || "untitled"}-${item?.year || item?.release_date || item?.first_air_date || "0"}-${item?.mediaType || item?.media_type || item?.listType || "movie"}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) + 1;
}

function dedupeLibraryItems(items: any[]): LibraryItem[] {
  const map = new Map<string, LibraryItem>();
  items.forEach((item) => {
    if (!item) return;
    const rawId = typeof item.id === "number" ? item.id : Number(item.id);
    const safeId = Number.isNaN(rawId) ? makeSyntheticId(item) : rawId;

    const mediaType: MediaType =
      item.mediaType === "tv" ||
      item.media_type === "tv" ||
      item.first_air_date ||
      item.type === "series" ||
      item.type === "tv" ||
      item.category === "series"
        ? "tv"
        : "movie";

    const normalized: LibraryItem = {
      id: safeId,
      mediaType,
      title: item.title || item.name || "Untitled",
      posterPath: item.posterPath ?? item.poster_path ?? item.posterUrl ?? null,
      backdropPath: item.backdropPath ?? item.backdrop_path ?? null,
      year: String(item.year || getYear(item) || "—"),
      rating:
        typeof item.userRating === "number"
          ? item.userRating
          : typeof item.rating === "number"
            ? item.rating
            : typeof item.vote_average === "number"
              ? item.vote_average
              : typeof item.imdbRating === "number"
                ? item.imdbRating
                : null,
    };

    map.set(keyFor(normalized), normalized);
  });
  return Array.from(map.values());
}

function normalizeEpisodeNumbers(input: any): number[] {
  return Array.from(
    new Set(
      (Array.isArray(input) ? input : [])
        .filter((ep: any) => typeof ep === "number" && ep > 0)
        .map((ep: number) => Math.floor(ep))
    )
  ).sort((a, b) => a - b);
}

function sanitizeLibrary(input: any): UserLibrary {
  if (Array.isArray(input)) {
    const importedMovies = dedupeLibraryItems(input);
    const watched: LibraryItem[] = [];
    const watchlist: LibraryItem[] = [];
    const ratings: Record<string, number> = {};

    input.forEach((raw, index) => {
      const normalized = importedMovies[index] || dedupeLibraryItems([raw])[0];
      if (!normalized) return;
      const listType = raw?.listType === "watched" ? "watched" : raw?.listType === "favorites" ? "watched" : "watchlist";
      if (listType === "watched") watched.push(normalized);
      else watchlist.push(normalized);
      if (typeof raw?.userRating === "number") ratings[keyFor(normalized)] = raw.userRating;
      else if (typeof raw?.rating === "number") ratings[keyFor(normalized)] = raw.rating;
      else if (typeof raw?.imdbRating === "number") ratings[keyFor(normalized)] = raw.imdbRating;
    });

    return {
      watchlist: dedupeLibraryItems(watchlist),
      watched: dedupeLibraryItems(watched),
      ratings,
      watching: {},
    };
  }

  const rawWatchlist = Array.isArray(input?.watchlist)
    ? input.watchlist
    : Array.isArray(input?.movies?.watchlist)
      ? input.movies.watchlist
      : Array.isArray(input?.movieWatchlist)
        ? input.movieWatchlist
        : Array.isArray(input?.list)
          ? input.list
          : [];

  const rawWatched = Array.isArray(input?.watched)
    ? input.watched
    : Array.isArray(input?.movies?.watched)
      ? input.movies.watched
      : Array.isArray(input?.movieWatched)
        ? input.movieWatched
        : [];

  const rawSeriesWatchlist = Array.isArray(input?.seriesWatchlist)
    ? input.seriesWatchlist
    : Array.isArray(input?.tvWatchlist)
      ? input.tvWatchlist
      : [];

  const rawSeriesWatched = Array.isArray(input?.seriesWatched)
    ? input.seriesWatched
    : Array.isArray(input?.tvWatched)
      ? input.tvWatched
      : [];

const watchlist = dedupeLibraryItems([...rawWatchlist, ...rawSeriesWatchlist]);
const watched = dedupeLibraryItems([...rawWatched, ...rawSeriesWatched]);

const ratingsSource = input?.ratings && typeof input.ratings === "object"
  ? input.ratings
  : input?.movieRatings && typeof input.movieRatings === "object"
    ? input.movieRatings
    : input?.userRatings && typeof input.userRatings === "object"
      ? input.userRatings
      : {};

const validKeys = new Set([...watchlist, ...watched].map((item) => keyFor(item)));

const ratings: Record<string, number> = Object.fromEntries(
  Object.entries(ratingsSource)
    .map(([key, value]) => [key, typeof value === "string" ? Number(value) : value] as const)
    .filter(([key, value]) => validKeys.has(key) && typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 10)
) as Record<string, number>;

  const watchingSource = input?.watching && typeof input.watching === "object"
    ? input.watching
    : input?.seriesProgress && typeof input.seriesProgress === "object"
      ? input.seriesProgress
      : input?.tvProgress && typeof input.tvProgress === "object"
        ? input.tvProgress
        : {};

  const watching: WatchingProgress = {};
  Object.entries(watchingSource).forEach(([showId, value]) => {
    const numericId = Number(showId);
    const safeShowId = Number.isNaN(numericId) ? makeSyntheticId({ title: showId, mediaType: "tv" }) : numericId;
    const season = typeof (value as any)?.season === "number" && (value as any).season > 0 ? Math.floor((value as any).season) : 1;

    const watchedEpisodesBySeasonSource = (value as any)?.watchedEpisodesBySeason;
    const watchedEpisodesBySeason: Record<string, number[]> = {};

    if (watchedEpisodesBySeasonSource && typeof watchedEpisodesBySeasonSource === "object") {
      Object.entries(watchedEpisodesBySeasonSource).forEach(([seasonKey, episodes]) => {
        watchedEpisodesBySeason[String(seasonKey)] = normalizeEpisodeNumbers(episodes);
      });
    } else {
      const legacyEpisodes = Array.isArray((value as any)?.watchedEpisodes)
        ? (value as any).watchedEpisodes
        : Array.isArray((value as any)?.episodes)
          ? (value as any).episodes
          : [];
      watchedEpisodesBySeason[String(season)] = normalizeEpisodeNumbers(legacyEpisodes);
    }

    const selectedEpisodeBySeasonSource = (value as any)?.selectedEpisodeBySeason;
    const selectedEpisodeBySeason: Record<string, number> = {};

    if (selectedEpisodeBySeasonSource && typeof selectedEpisodeBySeasonSource === "object") {
      Object.entries(selectedEpisodeBySeasonSource).forEach(([seasonKey, ep]) => {
        const safeEpisode = typeof ep === "number" && ep > 0 ? Math.floor(ep) : 1;
        selectedEpisodeBySeason[String(seasonKey)] = safeEpisode;
      });
    } else {
      const legacySelectedEpisode = typeof (value as any)?.selectedEpisode === "number" && (value as any).selectedEpisode > 0
        ? Math.floor((value as any).selectedEpisode)
        : watchedEpisodesBySeason[String(season)]?.[0] || 1;
      selectedEpisodeBySeason[String(season)] = legacySelectedEpisode;
    }

    const episodeFilter = (value as any)?.episodeFilter === "watched" || (value as any)?.episodeFilter === "unwatched" ? (value as any).episodeFilter : "all";

    watching[String(safeShowId)] = { season, episodeFilter, selectedEpisodeBySeason, watchedEpisodesBySeason };
  });

  return { watchlist, watched, ratings, watching };
}

function loadLibrary(): UserLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);
    if (!raw) return defaultLibrary;
    const parsed = JSON.parse(raw);
    if (parsed?.library) return sanitizeLibrary(parsed.library);
    return sanitizeLibrary(parsed);
  } catch {
    return defaultLibrary;
  }
}

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return null;
}

function normalizeAuthErrorMessage(error: any): string {
  const raw = String(error?.message || "Authentication failed.");
  const lower = raw.toLowerCase();
  if (lower.includes("weak_password") || lower.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters with uppercase, lowercase, number, and symbol.";
  }
  if (lower.includes("pwned") || lower.includes("leaked") || lower.includes("compromised")) {
    return "That password appears in breach data. Use a unique password you have never used elsewhere.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  return raw;
}

function loadLocalAuth(): CloudUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.email) return null;
    return { id: String(parsed.id), email: String(parsed.email), provider: "local" };
  } catch {
    return null;
  }
}

function saveLocalAuth(user: CloudUser | null) {
  if (!user) {
    localStorage.removeItem(LOCAL_AUTH_KEY);
    return;
  }
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
}

function getLibraryUpdatedAt(): number {
  try {
    const raw = localStorage.getItem(LIBRARY_META_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed?.updatedAt === "number" ? parsed.updatedAt : 0;
  } catch {
    return 0;
  }
}

function setLibraryUpdatedAt(timestamp = Date.now()) {
  localStorage.setItem(LIBRARY_META_KEY, JSON.stringify({ updatedAt: timestamp }));
}

function libraryScore(library: UserLibrary): number {
  return (
    library.watchlist.length * 2 +
    library.watched.length * 2 +
    Object.keys(library.ratings).length +
    Object.keys(library.watching).length * 3
  );
}

function mergeLibraries(primary: UserLibrary, secondary: UserLibrary): UserLibrary {
  const watchlist = dedupeLibraryItems([...primary.watchlist, ...secondary.watchlist]);
  const watched = dedupeLibraryItems([...primary.watched, ...secondary.watched]);
  const ratings = { ...secondary.ratings, ...primary.ratings };
  const watching: WatchingProgress = { ...secondary.watching, ...primary.watching };
  return { watchlist, watched, ratings, watching };
}

function isMissingCloudTableError(error: unknown): boolean {
  const err = error as SupabaseRuntimeError | null;
  if (!err) return false;
  return err.code === "PGRST205" || Boolean(err.message?.includes("goodfilm_libraries"));
}

async function uploadLibraryToCloud(user: CloudUser, library: UserLibrary) {
  if (user.provider !== "supabase" || !supabase) return;

  const { error } = await supabase.from("goodfilm_libraries").upsert({
    user_id: user.id,
    email: user.email,
    library,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function downloadLibraryFromCloud(user: CloudUser): Promise<CloudLibraryRow | null> {
  if (user.provider !== "supabase" || !supabase) return null;

  const { data, error } = await supabase
    .from("goodfilm_libraries")
    .select("library, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.library) return null;

  return {
    library: sanitizeLibrary(data.library),
    updated_at: data.updated_at,
  };
}

function AuthModal({
  open,
  mode,
  setMode,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  onClose: () => void;
  onSuccess: (user: CloudUser, mode: AuthMode) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setUsername("");
      setShowPassword(false);
      setMessage(null);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (mode === "signup" && !username.trim()) {
      setMessage("Enter a username.");
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (mode === "signup" && passwordError) {
      setMessage(passwordError);
      return;
    }
    if (mode === "login" && password.length < 6) {
      setMessage("Enter your password.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (supabase) {
        if (mode === "signup") {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { username: username.trim() } },
          });
          if (error) throw error;
          if (data.user?.id && data.user.email) {
            onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode);
            onClose();
          } else {
            setMessage("Check your email to confirm signup.");
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (error) throw error;
          if (data.user?.id && data.user.email) {
            onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode);
            onClose();
          }
        }
      } else {
        const user: CloudUser = {
          id: btoa(email.trim().toLowerCase()),
          email: email.trim().toLowerCase(),
          provider: "local",
        };
        onSuccess(user, mode);
        saveLocalAuth(user);
        onClose();
      }
    } catch (err: any) {
      setMessage(normalizeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-[radial-gradient(circle_at_30%_28%,rgba(32,21,58,0.82)_0%,rgba(16,19,28,0.95)_75%)] backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-20 w-[calc(100vw-24px)] max-w-[430px] rounded-[34px] border border-white/10 bg-[rgba(18,18,27,0.88)] p-6 shadow-[0_2px_30px_rgba(22,15,43,0.22),0_1.5px_16px_rgba(0,0,0,0.45)] backdrop-blur-[18px]"
          >
            <div className="mb-6 flex rounded-full bg-[rgba(67,58,110,0.13)] p-1 shadow-[0_1px_8px_rgba(133,114,196,0.08)]">
              {([
                ["login", "Login"],
                ["signup", "Register"],
              ] as const).map(([key, label]) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setMode(key);
                      setMessage(null);
                    }}
                    className={cn(
                      "flex-1 rounded-full px-4 py-4 text-[19px] font-extrabold tracking-[-0.02em] transition",
                      active ? "bg-[rgba(57,44,103,0.38)] text-white outline outline-2 outline-[#7c2ee65a]" : "text-[#b9b9c9] hover:text-white"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              {mode === "signup" ? (
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-[18px] border-none bg-white/10 px-6 py-5 text-[17px] font-semibold text-white outline-none placeholder:text-white/35"
                />
              ) : null}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-[18px] border-none bg-white/10 px-6 py-5 text-[17px] font-semibold text-white outline-none placeholder:text-white/35"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-[18px] border-none bg-white/10 px-6 py-5 pr-14 text-[17px] font-semibold text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aaa3dd] transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Eye size={21} />
                </button>
              </div>

              {message ? <div className="rounded-[16px] bg-white/8 px-4 py-3 text-sm text-white/80">{message}</div> : null}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-2 w-full rounded-full bg-[linear-gradient(90deg,#7c2ee6_0%,#d90429_100%)] px-6 py-5 text-[17px] font-extrabold text-white shadow-[0_1.5px_8px_rgba(60,26,137,0.28)] transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "Working..." : mode === "login" ? "Log In" : "Sign Up"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AppShell({ children, appLanguage }: { children: React.ReactNode; appLanguage: AppLanguage }) {
  const dark = true;

  return (
    <div dir={appLanguage === "ar" ? "rtl" : "ltr"} className={cn("min-h-screen", dark ? "bg-[#04070b] text-white" : "bg-[#eef3f8] text-[#0f172a]")}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(19,79,123,0.18),transparent_34%),linear-gradient(180deg,#04070b_0%,#05080d_100%)]" />
        <div className="absolute inset-y-0 left-0 w-[18vw] bg-[radial-gradient(circle_at_left,rgba(22,64,111,0.30),transparent_60%)]" />
        <div className="absolute inset-y-0 right-0 w-[14vw] bg-[radial-gradient(circle_at_right,rgba(14,46,88,0.24),transparent_62%)]" />
        <div className="absolute inset-x-0 top-0 h-[220px] bg-[linear-gradient(180deg,rgba(0,0,0,0.44),rgba(0,0,0,0))]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function SettingsPanel({
  open,
  onClose,
  onImport,
  onExport,
  currentUser,
  onOpenAuth,
  onLogout,
  cloudMode,
  appLanguage,
  onRecheckCloud
}: {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  currentUser: CloudUser | null;
  onOpenAuth: (mode: AuthMode) => void;
  onLogout: () => void;
  cloudMode: CloudMode;
  appLanguage: AppLanguage;
  onRecheckCloud: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const itemClass = "group flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-white/92 transition hover:bg-white/[0.05]";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-4 top-[68px] w-[320px] overflow-hidden rounded-[18px] border border-white/10 bg-[#182236] shadow-[0_22px_60px_rgba(0,0,0,0.42)] md:right-8 md:top-[78px]"
          >
            <div className="border-b border-white/10 px-5 py-5 text-[18px] font-semibold text-white">{tr(appLanguage, "settings")}</div>

            <div className="border-b border-white/10 px-5 py-4">
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/38">{tr(appLanguage, "data")}</div>
              <div className="mb-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-white/68">
                <div className="flex items-center gap-2">
                  <Cloud size={15} className={cloudMode === "ready" ? "text-emerald-300" : cloudMode === "missing_table" ? "text-amber-300" : "text-white/35"} />
                  <span>
                    {cloudMode === "ready"
                      ? tr(appLanguage, "cloudSyncActive")
                      : cloudMode === "missing_table"
                        ? tr(appLanguage, "cloudTableMissing")
                        : currentUser
                          ? (currentUser.provider === "supabase" ? tr(appLanguage, "cloudSyncChecking") : tr(appLanguage, "localAccountMode"))
                          : tr(appLanguage, "loginRequiredCloud")}
                  </span>
                </div>
              </div>

              <label className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-white/92 transition hover:bg-white/[0.05]">
                <Upload size={18} className="text-emerald-300" />
                <span>{tr(appLanguage, "importMovies")}</span>
                <span className="ml-auto text-[10px] text-white/35">JSON</span>
                <input
                  type="file"
                  accept=".json,application/json,text/json,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImport(file);
                    e.currentTarget.value = "";
                    onClose();
                  }}
                />
              </label>

              <button onClick={() => { onExport(); onClose(); }} className={itemClass}>
                <span className="flex items-center gap-3 text-[15px]"><Download size={18} className="text-violet-300" /> {tr(appLanguage, "exportMovies")}</span>
                <span className="text-[10px] text-white/35">SAVE</span>
              </button>
            </div>

            <div className="border-b border-white/10 px-5 py-4">
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/38">{tr(appLanguage, "account")}</div>
              {currentUser ? (
                <>
                  <div className="mb-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-white/68">
                    {tr(appLanguage, "signedInAs")} <span className="font-semibold text-white">{currentUser.email}</span>
                  </div>
                  <button onClick={() => { onLogout(); onClose(); }} className={itemClass}>
                    <span className="flex items-center gap-3 text-[15px]"><LogOut size={18} className="text-rose-300" /> {tr(appLanguage, "logout")}</span>
                  </button>
                </>
              ) : (
                <div className="space-y-1">
                  <button onClick={() => { onOpenAuth("login"); onClose(); }} className={itemClass}>
                    <span className="flex items-center gap-3 text-[15px]"><LogIn size={18} className="text-amber-300" /> {tr(appLanguage, "login")}</span>
                  </button>
                  <button onClick={() => { onOpenAuth("signup"); onClose(); }} className={itemClass}>
                    <span className="flex items-center gap-3 text-[15px]"><User size={18} className="text-cyan-300" /> {tr(appLanguage, "signUp")}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-4">
              <button onClick={() => window.alert(tr(appLanguage, "helpUnavailable"))} className={itemClass}>
                <span className="flex items-center gap-3 text-[15px]"><HelpCircle size={18} className="text-pink-300" /> {tr(appLanguage, "helpSupport")}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TopPillNav({
  activeTab,
  setActiveTab,
  search,
  setSearch,
  onOpenSettings,
  appLanguage,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  search: string;
  setSearch: (value: string) => void;
  onOpenSettings: () => void;
  appLanguage: AppLanguage;
}) {
  const items = [
    { key: "home" as Tab, label: tr(appLanguage, "home"), icon: Home },
    { key: "movies" as Tab, label: tr(appLanguage, "movies"), icon: Film },
    { key: "series" as Tab, label: tr(appLanguage, "tvShows"), icon: Tv },
  ];

  return (
    <div className="sticky top-3 z-40 flex justify-center px-4 pt-3">
      <div className="flex items-center gap-0.5 rounded-full border border-white/8 bg-[#10141b]/92 px-2 py-1 shadow-[0_18px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeTab;
          return (
            <motion.button
              key={item.key}
              whileHover={{ y: -1, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(item.key)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition",
                active ? "bg-[#efb43f] text-black" : "text-white/60 hover:bg-white/8 hover:text-white"
              )}
            >
              <motion.span animate={active ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: 0.35 }}>
                <Icon size={12} />
              </motion.span>
              <span>{item.label}</span>
            </motion.button>
          );
        })}

        <div className="mx-1 h-4 w-px bg-white/8" />

        <div className="relative hidden sm:block">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/38" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr(appLanguage, "search")}
            className="h-8 w-20 rounded-full bg-transparent pl-7 pr-2 text-[11px] text-white outline-none placeholder:text-white/30"
          />
        </div>

        <motion.button
          whileHover={{ y: -1, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveTab("mylist")}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition",
            activeTab === "mylist" ? "bg-white text-black" : "text-white/60 hover:bg-white/8 hover:text-white"
          )}
        >
          <motion.span animate={activeTab === "mylist" ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: 0.35 }}>
            <List size={12} />
          </motion.span>
          <span>{tr(appLanguage, "myList")}</span>
        </motion.button>
        <motion.button whileHover={{ rotate: 6, scale: 1.06 }} whileTap={{ scale: 0.95 }} onClick={onOpenSettings} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/8 hover:text-white">
          <User size={12} />
        </motion.button>
      </div>
    </div>
  );
}

function Hero({
  items,
  fallbackItem,
  onOpen,
  onToggleWatchlist,
}: {
  items: MediaItem[];
  fallbackItem?: MediaItem | null;
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
}) {
  const sourceItems = items.length ? items : fallbackItem ? [fallbackItem] : [];
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [sourceItems.length, sourceItems[0]?.id]);

  useEffect(() => {
    if (sourceItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % sourceItems.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [sourceItems.length]);

  const item = sourceItems[heroIndex] || fallbackItem || null;
  if (!item) return <div className="h-[520px] rounded-[34px] bg-[#0b1117]" />;

  const mediaType: MediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
  const backdrop = item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : "";

  const goPrev = () => {
    if (!sourceItems.length) return;
    setHeroIndex((prev) => (prev - 1 + sourceItems.length) % sourceItems.length);
  };

  const goNext = () => {
    if (!sourceItems.length) return;
    setHeroIndex((prev) => (prev + 1) % sourceItems.length);
  };

  return (
    <section className="relative overflow-hidden rounded-[34px] ring-1 ring-white/6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[#070b12]" />
      {backdrop ? (
        <motion.img
          key={backdrop}
          src={backdrop}
          alt={getTitle(item)}
          initial={{ scale: 1.04, x: 0, y: 0, opacity: 0.86 }}
          animate={{ scale: [1.04, 1.1, 1.06], x: [0, -18, 10], y: [0, -10, 6], opacity: 1 }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : null}

      <motion.div
        aria-hidden="true"
        animate={{ x: ["-28%", "132%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute inset-y-0 w-[26%] skew-x-[-18deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-30"
      />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,8,14,0.95)_0%,rgba(3,8,14,0.84)_18%,rgba(3,8,14,0.48)_40%,rgba(3,8,14,0.14)_68%,rgba(3,8,14,0.05)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(6,36,86,0.42),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(3,8,14,0.92))]" />

      <motion.button whileHover={{ scale: 1.08, x: -2 }} whileTap={{ scale: 0.94 }} onClick={goPrev} className="absolute left-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[#07111f]/60 p-3 text-white/80 backdrop-blur transition hover:bg-[#0b1627]">
        <ChevronLeft size={18} />
      </motion.button>
      <motion.button whileHover={{ scale: 1.08, x: 2 }} whileTap={{ scale: 0.94 }} onClick={goNext} className="absolute right-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[#07111f]/60 p-3 text-white/80 backdrop-blur transition hover:bg-[#0b1627]">
        <ChevronRight size={18} />
      </motion.button>

      <div className="relative flex min-h-[520px] items-end px-8 pb-14 pt-20 md:px-20 md:pb-16">
        <motion.div key={item.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-[560px]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#efb43f] px-4 py-2 text-[14px] font-semibold text-black shadow-[0_10px_30px_rgba(239,180,63,0.2)]">
            <Star size={13} className="fill-black" /> {(item.vote_average || 0).toFixed(1)}
          </div>
          <h1 className="max-w-[720px] text-[58px] font-bold leading-[0.95] tracking-[-0.05em] text-white md:text-[76px]">{getTitle(item)}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[14px] text-white/60">
            <span>{getYear(item)}</span>
            <span>•</span>
            <span>{mediaType === "movie" ? "Action · Crime · Thriller" : "Action · Drama · Sci-Fi"}</span>
          </div>
          <p className="mt-5 max-w-[560px] text-[18px] leading-9 text-white/56">
            {item.overview || "A man living in self-imposed exile on a remote island rescues a young girl from a violent storm, setting off a chain of events that changes everything."}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <motion.button
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggleWatchlist(item, mediaType)}
              className="inline-flex h-14 items-center gap-3 rounded-[14px] bg-[#efb43f] px-7 text-[18px] font-semibold text-black transition hover:brightness-105"
            >
              <Play size={18} className="fill-black" /> Add to Watchlist
            </motion.button>
            <motion.button
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpen(item, mediaType)}
              className="inline-flex h-14 items-center gap-3 rounded-[14px] bg-white/10 px-7 text-[18px] font-semibold text-white backdrop-blur transition hover:bg-white/16"
            >
              <Info size={18} /> More Info
            </motion.button>
          </div>
        </motion.div>
      </div>

      {sourceItems.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {sourceItems.slice(0, 8).map((entry, index) => (
            <button
              key={entry.id}
              onClick={() => setHeroIndex(index)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                index === heroIndex ? "w-8 bg-[#efb43f]" : "w-2.5 bg-white/35 hover:bg-white/55"
              )}
              aria-label={`Go to hero slide ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
      <div className="flex items-center gap-1.5">
        <button className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-white/42 transition hover:bg-white/[0.06] hover:text-white">
          <ChevronLeft size={14} />
        </button>
        <button className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-white/42 transition hover:bg-white/[0.06] hover:text-white">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function PosterCard({
  item,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  inWatchlist,
  inWatched,
  userRating,
  size = "default",
}: {
  item: MediaItem | LibraryItem;
  mediaType: MediaType;
  onOpen: () => void;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  inWatchlist: boolean;
  inWatched: boolean;
  userRating?: number;
  size?: "default" | "large";
}) {
  const title = "mediaType" in item ? item.title : getTitle(item);
  const year = "mediaType" in item ? item.year : getYear(item);
  const posterPath = "mediaType" in item ? item.posterPath : item.poster_path;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ duration: 0.16 }}
      className={cn(
        "group relative",
        size === "large"
          ? "w-[156px] min-w-[156px] md:w-[178px] md:min-w-[178px]"
          : "w-[132px] min-w-[132px] md:w-[148px] md:min-w-[148px]"
      )}
    >
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[16px] bg-[#0c1118] ring-1 ring-white/6 shadow-[0_14px_28px_rgba(0,0,0,0.2)]">
          {posterPath ? (
            <img src={`${POSTER_BASE}${posterPath}`} alt={title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-white/34">No poster</div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_56%,rgba(0,0,0,0.48)_100%)]" />
        </div>
      </button>

      <div className="mt-2.5 px-[1px]">
        <div className={cn("line-clamp-1 font-medium text-white/88", size === "large" ? "text-[13px] md:text-[14px]" : "text-[12px]")}>{title}</div>
        <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-white/38">
          <span className="truncate">{year}</span>
          {typeof userRating === "number" ? <span>{(userRating / 2).toFixed(1)}/5</span> : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2 top-2 flex translate-y-1 justify-between opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <motion.button
          whileHover={{ scale: 1.12, rotate: -8 }}
          whileTap={{ scale: 0.92 }}
          onClick={onToggleWatchlist}
          className={cn(
            "rounded-full p-2 backdrop-blur",
            inWatchlist ? "bg-[#efb43f] text-black" : "bg-black/54 text-white"
          )}
        >
          <Bookmark size={13} className={inWatchlist ? "fill-black" : ""} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.12, rotate: 8 }}
          whileTap={{ scale: 0.92 }}
          onClick={onToggleWatched}
          className={cn(
            "rounded-full p-2 backdrop-blur",
            inWatched ? "bg-white text-black" : "bg-black/54 text-white"
          )}
        >
          <Eye size={13} className={inWatched ? "fill-black" : ""} />
        </motion.button>
      </div>
    </motion.div>
  );
}

function Rail({
  title,
  items,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  watchlistKeys,
  watchedKeys,
  ratings,
  largeCards = false,
}: {
  title: string;
  items: MediaItem[];
  mediaType?: MediaType;
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem, mediaType: MediaType) => void;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  ratings: Record<string, number>;
  largeCards?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: "left" | "right") => {
    ref.current?.scrollBy({ left: direction === "left" ? -620 : 620, behavior: "smooth" });
  };

  return (
    <section className="mb-12">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-white">{title}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => scroll("left")} className="rounded-md border border-white/8 bg-white/[0.03] p-1.5 text-white/42 transition hover:bg-white/[0.06] hover:text-white"><ChevronLeft size={13} /></button>
          <button onClick={() => scroll("right")} className="rounded-md border border-white/8 bg-white/[0.03] p-1.5 text-white/42 transition hover:bg-white/[0.06] hover:text-white"><ChevronRight size={13} /></button>
        </div>
      </div>
      <div ref={ref} className={cn("flex overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", largeCards ? "gap-[20px]" : "gap-[18px]")}>
        {items.map((item) => {
          const type = mediaType || item.media_type || (item.first_air_date ? "tv" : "movie");
          const k = keyFor({ id: item.id, mediaType: type });
          return (
            <PosterCard
              key={k}
              item={item}
              mediaType={type}
              onOpen={() => onOpen(item, type)}
              onToggleWatchlist={() => onToggleWatchlist(item, type)}
              onToggleWatched={() => onToggleWatched(item, type)}
              inWatchlist={watchlistKeys.has(k)}
              inWatched={watchedKeys.has(k)}
              userRating={ratings[k]}
              size={largeCards ? "large" : "default"}
            />
          );
        })}
      </div>
    </section>
  );
}

function Grid({
  items,
  mediaType,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  watchlistKeys,
  watchedKeys,
  ratings,
  size = "default",
}: {
  items: Array<MediaItem | LibraryItem>;
  mediaType?: MediaType;
  onOpen: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem | LibraryItem, mediaType: MediaType) => void;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  ratings: Record<string, number>;
  size?: "default" | "large";
}) {
  return (
    <div className={cn(
      "grid gap-y-6",
      size === "large"
        ? "grid-cols-2 gap-x-[18px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        : "grid-cols-2 gap-x-[14px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
    )}>
      {items.map((item) => {
        const type = mediaType || ("mediaType" in item ? item.mediaType : item.media_type || (item.first_air_date ? "tv" : "movie"));
        const k = keyFor({ id: item.id, mediaType: type });
        return (
          <PosterCard
            key={k}
            item={item as MediaItem & LibraryItem}
            mediaType={type}
            onOpen={() => onOpen(item, type)}
            onToggleWatchlist={() => onToggleWatchlist(item, type)}
            onToggleWatched={() => onToggleWatched(item, type)}
            inWatchlist={watchlistKeys.has(k)}
            inWatched={watchedKeys.has(k)}
            userRating={ratings[k]}
            size={size}
          />
        );
      })}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-8 text-center">
      <div className="text-lg font-semibold text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-lg text-sm text-white/52">{body}</p>
    </div>
  );
}

function RatingStars({ value, onChange }: { value?: number; onChange: (rating: number) => void }) {
  const safeValue = typeof value === "number" ? value : 0;

  return (
    <div className="rounded-[18px] bg-[#111827] px-5 py-5">
      <div className="mb-5 text-[18px] font-semibold text-[#efb43f]">My Rating</div>
      <div className="flex items-center gap-5">
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={safeValue}
            onChange={(e) => onChange(Number(e.target.value))}
            className="rating-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
            style={{
              background: `linear-gradient(to right, #efb43f 0%, #efb43f ${safeValue * 10}%, rgba(255,255,255,0.10) ${safeValue * 10}%, rgba(255,255,255,0.10) 100%)`,
            }}
          />
        </div>
        <div className="min-w-[90px] text-right text-[17px] font-semibold text-[#efb43f]">{safeValue.toFixed(1)}/10</div>
      </div>
    </div>
  );
}

function InlineRatingControl({ value, onChange }: { value?: number; onChange: (rating: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const committedValue = typeof value === "number" ? value : 0; // stored as /10
  const previewValue = hoverValue ?? committedValue;
  const committedStars = committedValue / 2;
  const previewStars = previewValue / 2;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
        setHoverValue(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        setOpen(false);
        setHoverValue(null);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChange(Math.min(10, committedValue + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChange(Math.max(0, committedValue - 1));
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        onChange(0);
        setHoverValue(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, committedValue, onChange]);

  const commitRating = (nextValue: number) => {
    onChange(committedValue === nextValue ? 0 : nextValue);
    setHoverValue(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setHoverValue(null)}
      className={cn(
        "inline-flex h-14 items-center overflow-hidden rounded-full border border-white/18 bg-white/8 text-white backdrop-blur transition-all duration-200 ease-out",
        open ? "w-[332px] px-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]" : "w-[146px] px-4"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 shrink-0"
        aria-label="Toggle rating control"
      >
        <Star size={18} className={cn("transition", committedValue > 0 ? "fill-[#efb43f] text-[#efb43f]" : "text-white/85")} />
        <span className="min-w-[76px] text-[13px] font-semibold text-white/82">{previewStars.toFixed(1)}/5</span>
      </button>

      <div
        className={cn(
          "ml-3 flex items-center gap-1 transition-all duration-200 ease-out",
          open ? "opacity-100 translate-x-0" : "w-0 translate-x-2 overflow-hidden opacity-0"
        )}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const fullActive = previewStars >= star;
          const halfActive = !fullActive && previewStars >= star - 0.5;
          const targetHalf = (star - 0.5) * 2; // stored as /10
          const targetFull = star * 2;

          return (
            <div key={star} className="relative flex h-8 w-8 items-center justify-center">
              <button
                type="button"
                title={`${(targetHalf / 2).toFixed(1)}/5`}
                aria-label={`Rate ${(targetHalf / 2).toFixed(1)} out of 5`}
                onMouseEnter={() => setHoverValue(targetHalf)}
                onFocus={() => setHoverValue(targetHalf)}
                onClick={() => commitRating(targetHalf)}
                className="absolute left-0 top-0 z-10 h-full w-1/2"
              />
              <button
                type="button"
                title={`${(targetFull / 2).toFixed(1)}/5`}
                aria-label={`Rate ${(targetFull / 2).toFixed(1)} out of 5`}
                onMouseEnter={() => setHoverValue(targetFull)}
                onFocus={() => setHoverValue(targetFull)}
                onClick={() => commitRating(targetFull)}
                className="absolute right-0 top-0 z-10 h-full w-1/2"
              />
              <Star size={18} className="text-white/24 transition duration-150" />
              {(fullActive || halfActive) ? (
                <div
                  className="pointer-events-none absolute left-0 top-0 flex h-full items-center overflow-hidden transition-all duration-150"
                  style={{ width: fullActive ? "100%" : "50%" }}
                >
                  <Star size={18} className="fill-[#efb43f] text-[#efb43f] drop-shadow-[0_0_8px_rgba(239,180,63,0.35)]" />
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="ml-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/55">
          {hoverValue !== null ? `Preview ${(hoverValue / 2).toFixed(1)}/5` : committedValue > 0 ? `Saved ${committedStars.toFixed(1)}/5` : "Unset"}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(0);
            setHoverValue(null);
          }}
          className="ml-1 rounded-full border border-white/10 px-2 py-1 text-[10px] font-medium text-white/60 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function SearchView({
  loading,
  error,
  results,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  watchlistKeys,
  watchedKeys,
  ratings,
  appLanguage,
}: {
  loading: boolean;
  error: string | null;
  results: MediaItem[];
  onOpen: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleWatched: (item: MediaItem, mediaType: MediaType) => void;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  ratings: Record<string, number>;
  appLanguage: AppLanguage;
}) {
  return (
    <div className="pt-6">
      <SectionHeading title={tr(appLanguage, "searchResults")} />
      {loading ? (
        <EmptyState title={tr(appLanguage, "searchResults")} body="Fetching matching movies and TV series." />
      ) : error ? (
        <EmptyState title="Search failed" body={error} />
      ) : results.length ? (
        <Grid
          items={results}
          onOpen={(item, type) => onOpen(item as MediaItem, type)}
          onToggleWatchlist={(item, type) => onToggleWatchlist(item as MediaItem, type)}
          onToggleWatched={(item, type) => onToggleWatched(item as MediaItem, type)}
          watchlistKeys={watchlistKeys}
          watchedKeys={watchedKeys}
          ratings={ratings}
        />
      ) : (
        <EmptyState title="No results" body="Try another title or keyword." />
      )}
    </div>
  );
}

function FooterStats({ library, appLanguage }: { library: UserLibrary; appLanguage: AppLanguage }) {
  return (
    <footer className="mt-14 border-t border-white/6 py-6 text-[10px] text-white/30">
      <div className="flex items-center justify-between gap-4">
        <div>© 2024 GoodFilm. {tr(appLanguage, "myList")}.</div>
        <div className="flex items-center gap-4">
          <span>{library.watchlist.length + library.watched.length} titles</span>
          <span>{library.watched.length} {tr(appLanguage, "watched")}</span>
        </div>
      </div>
    </footer>
  );
}

function SegmentTabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ key: string; label: string; count?: number }>;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              active ? "bg-[#efb43f] text-black" : "text-white/65 hover:text-white"
            )}
          >
            {option.label}{typeof option.count === "number" ? ` (${option.count})` : ""}
          </button>
        );
      })}
    </div>
  );
}

function MyListView({
  library,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onExport,
  onImport,
  onNavigateTab,
  onBulkLinkTMDB,
  bulkLinking,
  appLanguage,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNavigateTab: (tab: Tab) => void;
  onBulkLinkTMDB: () => void;
  bulkLinking: boolean;
  appLanguage: AppLanguage;
}) {
  const watchlistMovies = useMemo(() => library.watchlist.filter((item) => item.mediaType === "movie"), [library.watchlist]);
  const watchlistSeries = useMemo(() => library.watchlist.filter((item) => item.mediaType === "tv"), [library.watchlist]);
  const watchedMovies = useMemo(() => library.watched.filter((item) => item.mediaType === "movie"), [library.watched]);
  const watchedSeries = useMemo(() => library.watched.filter((item) => item.mediaType === "tv"), [library.watched]);

  return (
    <div className="pt-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{tr(appLanguage, "myList")}</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={onBulkLinkTMDB} disabled={bulkLinking} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw size={14} className={bulkLinking ? "animate-spin" : ""} /> {bulkLinking ? tr(appLanguage, "linking") : tr(appLanguage, "bulkLinkTMDB")}
          </button>
          <button onClick={onExport} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#efb43f] px-4 text-sm font-semibold text-black"><Download size={14} /> {tr(appLanguage, "exportMovies")}</button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/16">
            <Upload size={14} /> {tr(appLanguage, "importMovies")}
            <input
              type="file"
              accept=".json,application/json,text/json,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button onClick={() => onNavigateTab("watchlist")} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5 text-left transition hover:bg-white/[0.05]">
          <div className="text-[12px] uppercase tracking-[0.16em] text-white/40">{tr(appLanguage, "watchlist")}</div>
          <div className="mt-3 text-3xl font-semibold text-white">{library.watchlist.length}</div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/52">
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "movies")} {watchlistMovies.length}</span>
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "tvShows")} {watchlistSeries.length}</span>
          </div>
        </button>

        <button onClick={() => onNavigateTab("watched")} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5 text-left transition hover:bg-white/[0.05]">
          <div className="text-[12px] uppercase tracking-[0.16em] text-white/40">{tr(appLanguage, "watched")}</div>
          <div className="mt-3 text-3xl font-semibold text-white">{library.watched.length}</div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/52">
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "movies")} {watchedMovies.length}</span>
            <span className="rounded-full bg-white/[0.05] px-3 py-1">{tr(appLanguage, "tvShows")} {watchedSeries.length}</span>
          </div>
        </button>
      </div>

      <div className="mt-10 space-y-10">
        {library.watchlist.length ? (
          <Rail
            title={tr(appLanguage, "watchlist")}
            items={library.watchlist as unknown as MediaItem[]}
            onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
            onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
            onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
            watchlistKeys={watchlistKeys}
            watchedKeys={watchedKeys}
            ratings={library.ratings}
            largeCards
          />
        ) : (
          <EmptyState title={`${tr(appLanguage, "watchlist")} empty`} body="Add movies or TV shows from the rails or detail modal." />
        )}

        {library.watched.length ? (
          <Rail
            title={tr(appLanguage, "watched")}
            items={library.watched as unknown as MediaItem[]}
            onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
            onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
            onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
            watchlistKeys={watchlistKeys}
            watchedKeys={watchedKeys}
            ratings={library.ratings}
            largeCards
          />
        ) : (
          <EmptyState title={`${tr(appLanguage, "watched")} empty`} body="Mark titles as watched to fill this section." />
        )}
      </div>
    </div>
  );
}

function WatchlistTabView({
  library,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onBack,
  appLanguage,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onBack: () => void;
  appLanguage: AppLanguage;
}) {
  const [segment, setSegment] = useState<"movies" | "series">("movies");
  const movieItems = useMemo(() => library.watchlist.filter((item) => item.mediaType === "movie"), [library.watchlist]);
  const seriesItems = useMemo(() => library.watchlist.filter((item) => item.mediaType === "tv"), [library.watchlist]);
  const items = segment === "movies" ? movieItems : seriesItems;

  return (
    <div className="pt-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.06] hover:text-white">
            <ChevronLeft size={16} /> {tr(appLanguage, "back")}
          </button>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{tr(appLanguage, "watchlist")}</h2>
        </div>
        <SegmentTabs
          value={segment}
          onChange={(value) => setSegment(value as "movies" | "series")}
          options={[
            { key: "movies", label: `${tr(appLanguage, "movies")} ${tr(appLanguage, "watchlist")}`, count: movieItems.length },
            { key: "series", label: `${tr(appLanguage, "tvShows")} ${tr(appLanguage, "watchlist")}`, count: seriesItems.length },
          ]}
        />
      </div>
      {items.length ? (
        <Grid
          items={items as unknown as MediaItem[]}
          mediaType={segment === "movies" ? "movie" : "tv"}
          onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
          onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
          onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
          watchlistKeys={watchlistKeys}
          watchedKeys={watchedKeys}
          ratings={library.ratings}
          size="large"
        />
      ) : (
        <EmptyState title={`${tr(appLanguage, "watchlist")} empty`} body={segment === "movies" ? `Add ${tr(appLanguage, "movies").toLowerCase()} to your ${tr(appLanguage, "watchlist").toLowerCase()}.` : `Add ${tr(appLanguage, "tvShows").toLowerCase()} to your ${tr(appLanguage, "watchlist").toLowerCase()}.`} />
      )}
    </div>
  );
}

function WatchedTabView({
  library,
  watchlistKeys,
  watchedKeys,
  onOpen,
  onToggleWatchlist,
  onToggleWatched,
  onBack,
  appLanguage,
}: {
  library: UserLibrary;
  watchlistKeys: Set<string>;
  watchedKeys: Set<string>;
  onOpen: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatchlist: (item: LibraryItem, mediaType: MediaType) => void;
  onToggleWatched: (item: LibraryItem, mediaType: MediaType) => void;
  onBack: () => void;
  appLanguage: AppLanguage;
}) {
  const [segment, setSegment] = useState<"movies" | "series">("movies");
  const movieItems = useMemo(() => library.watched.filter((item) => item.mediaType === "movie"), [library.watched]);
  const seriesItems = useMemo(() => library.watched.filter((item) => item.mediaType === "tv"), [library.watched]);
  const items = segment === "movies" ? movieItems : seriesItems;

  return (
    <div className="pt-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.03] px-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.06] hover:text-white">
            <ChevronLeft size={16} /> {tr(appLanguage, "back")}
          </button>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{tr(appLanguage, "watched")}</h2>
        </div>
        <SegmentTabs
          value={segment}
          onChange={(value) => setSegment(value as "movies" | "series")}
          options={[
            { key: "movies", label: `${tr(appLanguage, "movies")} ${tr(appLanguage, "watched")}`, count: movieItems.length },
            { key: "series", label: `${tr(appLanguage, "tvShows")} ${tr(appLanguage, "watched")}`, count: seriesItems.length },
          ]}
        />
      </div>
      {items.length ? (
        <Grid
          items={items as unknown as MediaItem[]}
          mediaType={segment === "movies" ? "movie" : "tv"}
          onOpen={(item, type) => onOpen(item as unknown as LibraryItem, type)}
          onToggleWatchlist={(item, type) => onToggleWatchlist(item as unknown as LibraryItem, type)}
          onToggleWatched={(item, type) => onToggleWatched(item as unknown as LibraryItem, type)}
          watchlistKeys={watchlistKeys}
          watchedKeys={watchedKeys}
          ratings={library.ratings}
          size="large"
        />
      ) : (
        <EmptyState title={`${tr(appLanguage, "watched")} empty`} body={segment === "movies" ? `Mark ${tr(appLanguage, "movies").toLowerCase()} as ${tr(appLanguage, "watched").toLowerCase()}.` : `Mark ${tr(appLanguage, "tvShows").toLowerCase()} as ${tr(appLanguage, "watched").toLowerCase()}.`} />
      )}
    </div>
  );
}

function DetailModal({
  open,
  item,
  mediaType,
  onClose,
  inWatchlist,
  inWatched,
  userRating,
  onToggleWatchlist,
  onToggleWatched,
  onRate,
  library,
  setWatchingSeason,
  toggleEpisode,
  setEpisodeFilter,
  setCurrentEpisode,
  continueToNextEpisode,
  markEpisodesUpTo,
  markSeasonComplete,
  clearSeasonEpisodes,
  onResolveLibraryItem,
  onOpenRelated,
  onToggleSimilarWatchlist,
  onToggleSimilarWatched,
  similarWatchlistKeys,
  similarWatchedKeys,
  ratingsMap,
  appLanguage,
}: {
  open: boolean;
  item: MediaItem | LibraryItem | null;
  mediaType: MediaType | null;
  onClose: () => void;
  inWatchlist: boolean;
  inWatched: boolean;
  userRating?: number;
  onToggleWatchlist: () => void;
  onToggleWatched: () => void;
  onRate: (rating: number) => void;
  library: UserLibrary;
  setWatchingSeason: (showId: number, season: number) => void;
  toggleEpisode: (showId: number, episode: number) => void;
  setEpisodeFilter: (showId: number, filter: "all" | "watched" | "unwatched") => void;
  setCurrentEpisode: (showId: number, episode: number) => void;
  continueToNextEpisode: (showId: number, season: number, episodeNumbers: number[]) => void;
  markEpisodesUpTo: (showId: number, season: number, episode: number) => void;
  markSeasonComplete: (showId: number, season: number, episodeNumbers: number[]) => void;
  clearSeasonEpisodes: (showId: number, season: number) => void;
  onResolveLibraryItem: (oldItem: LibraryItem, resolved: MediaItem, mediaType: MediaType) => void;
  onOpenRelated: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatchlist: (item: MediaItem, mediaType: MediaType) => void;
  onToggleSimilarWatched: (item: MediaItem, mediaType: MediaType) => void;
  similarWatchlistKeys: Set<string>;
  similarWatchedKeys: Set<string>;
  ratingsMap: Record<string, number>;
  appLanguage: AppLanguage;
}) {
  const [detail, setDetail] = useState<DetailData | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [imdbData, setImdbData] = useState<IMDbTitleData | null>(null);
  const [similarItems, setSimilarItems] = useState<MediaItem[]>([]);
  const similarSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !item || !mediaType) return;

    const progress = library.watching[String(item.id)];
    const nextSeason = progress?.season || 1;
    setSelectedSeason(nextSeason);
    setSelectedEpisode(progress?.selectedEpisodeBySeason?.[String(nextSeason)] || 1);

    let cancelled = false;

    const loadDetails = async () => {
      try {
        const baseId = item.id;
        const [d, _videos, credits, recs] = await Promise.all([
          tmdbFetch<DetailData>(`/${mediaType}/${baseId}`, { append_to_response: mediaType === "tv" ? "credits,external_ids" : "credits" }),
          tmdbFetch<{ results: VideoResult[] }>(`/${mediaType}/${baseId}/videos`),
          tmdbFetch<{ cast: CastMember[] }>(`/${mediaType}/${baseId}/credits`),
          tmdbFetch<{ results: MediaItem[] }>(`/${mediaType}/${baseId}/recommendations`),
        ]);

        if (cancelled) return;
        setDetail(d);
                setCast(((d.credits?.cast || credits.cast || [])).slice(0, 12));
        setSimilarItems((recs.results || []).slice(0, 18));

        const imdbId = d.imdb_id || d.external_ids?.imdb_id;
        if (imdbId) {
          const imdb = await imdbFetchTitle(imdbId);
          if (!cancelled) setImdbData(imdb);
        } else if (!cancelled) {
          setImdbData(null);
        }

        if (mediaType === "tv") {
          try {
            const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${d.id || baseId}/season/${nextSeason}`);
            if (!cancelled) setEpisodes(seasonData.episodes || []);
          } catch {
            if (!cancelled) setEpisodes([]);
          }
        }
        return;
      } catch {
        if (!("mediaType" in item)) {
          if (!cancelled) {
            setDetail(null);
                        setEpisodes([]);
            setCast([]);
            setImdbData(null);
            setSimilarItems([]);
          }
          return;
        }
      }

      try {
        const match = await searchTMDBMatchForLibraryItem(item as LibraryItem);
        if (!match || cancelled) {
          if (!cancelled) {
            setDetail(null);
                        setEpisodes([]);
            setCast([]);
            setSimilarItems([]);
          }
          return;
        }

        onResolveLibraryItem(item as LibraryItem, match, mediaType);

        const [d, _videos2, credits, recs] = await Promise.all([
          tmdbFetch<DetailData>(`/${mediaType}/${match.id}`, { append_to_response: mediaType === "tv" ? "credits,external_ids" : "credits" }),
          tmdbFetch<{ results: VideoResult[] }>(`/${mediaType}/${match.id}/videos`),
          tmdbFetch<{ cast: CastMember[] }>(`/${mediaType}/${match.id}/credits`),
          tmdbFetch<{ results: MediaItem[] }>(`/${mediaType}/${match.id}/recommendations`),
        ]);

        if (cancelled) return;
        setDetail(d);
        setCast(((d.credits?.cast || credits.cast || [])).slice(0, 12));
        setSimilarItems((recs.results || []).slice(0, 18));

        const imdbId = d.imdb_id || d.external_ids?.imdb_id;
        if (imdbId) {
          const imdb = await imdbFetchTitle(imdbId);
          if (!cancelled) setImdbData(imdb);
        } else if (!cancelled) {
          setImdbData(null);
        }

        if (mediaType === "tv") {
          try {
            const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${match.id}/season/${nextSeason}`);
            if (!cancelled) setEpisodes(seasonData.episodes || []);
          } catch {
            if (!cancelled) setEpisodes([]);
          }
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
                    setEpisodes([]);
          setCast([]);
          setImdbData(null);
          setSimilarItems([]);
        }
      }
    };

    loadDetails();
    return () => { cancelled = true; };
  }, [open, item, mediaType, library.watching, onResolveLibraryItem]);

  const loadSeason = useCallback(async (season: number) => {
    if (!item || mediaType !== "tv") return;
    const resolvedShowId = detail?.id || item.id;
    setSelectedSeason(season);
    setWatchingSeason(item.id, season);
    try {
      const seasonData = await tmdbFetch<{ episodes: Episode[] }>(`/tv/${resolvedShowId}/season/${season}`);
      const nextEpisodes = seasonData.episodes || [];
      setEpisodes(nextEpisodes);
      const savedEpisode = library.watching[String(item.id)]?.selectedEpisodeBySeason?.[String(season)];
      setSelectedEpisode(savedEpisode || nextEpisodes[0]?.episode_number || 1);
    } catch {
      setEpisodes([]);
      setSelectedEpisode(1);
    }
  }, [item, mediaType, setWatchingSeason, detail?.id, library.watching]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item || !mediaType) return null;

  const display = detail || item;
  const title = "title" in display || "name" in display ? getTitle(display as DetailData) : (display as LibraryItem).title;
  const backdropPath = (detail?.backdrop_path ?? ("backdropPath" in item ? item.backdropPath : item.backdrop_path)) || null;
  const watchedEpisodes = library.watching[String(item.id)]?.watchedEpisodesBySeason?.[String(selectedSeason)] || [];
  const savedSelectedEpisode = library.watching[String(item.id)]?.selectedEpisodeBySeason?.[String(selectedSeason)] || 1;
  const tmdbScore = ((detail?.vote_average ?? ("rating" in item ? item.rating : 0)) || 0).toFixed(1);
  const imdbScoreValue = extractIMDbRating(imdbData);
  const imdbVotes = extractIMDbVotes(imdbData);
  const displayScore = imdbScoreValue ?? Number(tmdbScore);
  const score = displayScore.toFixed(1);
  const genreText = detail?.genres?.map((g) => g.name).join(", ") || (mediaType === "movie" ? "Action, Science Fiction, Thriller" : "Drama, Sci-Fi");
  const releaseDate = detail?.release_date || detail?.first_air_date || "—";
  const runtimeText = detail?.runtime ? `${detail.runtime} minutes` : mediaType === "movie" ? "—" : null;
  const languageText = detail?.original_language ? detail.original_language.toUpperCase() : "—";
  const studioText = detail?.production_companies?.[0]?.name || "Unknown";
  const directorText = detail?.credits?.crew?.find((person) => person.job === "Director")?.name || "Unknown";
  const resolvedTmdbId = detail?.id || (!('mediaType' in item) ? item.id : null);
  const currentEpisodeNumber = selectedEpisode || savedSelectedEpisode || episodes[0]?.episode_number || 1;
  const vidKingUrl = resolvedTmdbId
    ? (mediaType === "movie"
        ? `https://www.vidking.net/embed/movie/${resolvedTmdbId}`
        : `https://www.vidking.net/embed/tv/${resolvedTmdbId}/${selectedSeason}/${currentEpisodeNumber}`)
    : null;
    const castForDisplay = cast.filter((person) => person.name).slice(0, 12);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="h-screen overflow-y-auto bg-[#05070b]"
        >
          <div className="relative min-h-[420px] overflow-hidden">
            {backdropPath ? (
              <img src={`${BACKDROP_BASE}${backdropPath}`} alt={title} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[#121822]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.82)_72%,#05070b_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%)]" />

            <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-10 pt-6 lg:px-8">
              <div className="flex items-center justify-between">
                <button onClick={onClose} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/28 text-white backdrop-blur transition hover:bg-black/42">
                  <ChevronLeft size={24} />
                </button>
              </div>

              <div className="pt-32 md:pt-44">
                <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="max-w-[780px] text-[40px] font-bold leading-[0.92] tracking-[-0.05em] text-white md:text-[64px]">
                  {title}
                </motion.h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/72">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#efb43f]/25 bg-[#efb43f]/10 px-3 py-1 font-semibold text-[#efb43f]"><Star size={14} className="fill-[#efb43f]" /> IMDb {score}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/8 px-3 py-1 font-semibold text-white/82"><Star size={14} className={typeof userRating === "number" ? "fill-white text-white" : "text-white/55"} /> Your {typeof userRating === "number" ? (userRating / 2).toFixed(1) : "—"}/5</span>
                  <span>{getYear(display as DetailData)}</span>
                  <span>{genreText}</span>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {vidKingUrl ? (
                    <a
                      href={vidKingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-14 items-center gap-3 rounded-[14px] bg-white px-7 text-[18px] font-semibold text-black shadow-[0_10px_25px_rgba(255,255,255,0.14)] transition hover:brightness-105"
                    >
                      <Play size={18} className="fill-black" /> Play
                    </a>
                  ) : (
                    <div className="inline-flex h-14 items-center gap-3 rounded-[14px] bg-white/20 px-7 text-[18px] font-semibold text-white/45">
                      <Play size={18} className="fill-white/45" /> Loading...
                    </div>
                  )}
                  <button onClick={onToggleWatchlist} className={cn("inline-flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur transition", inWatchlist ? "border-[#efb43f] bg-[#efb43f] text-black" : "border-white/18 bg-white/8 text-white hover:bg-white/14")}>
                    <Bookmark size={18} className={inWatchlist ? "fill-black" : ""} />
                  </button>
                  <button onClick={onToggleWatched} className={cn("inline-flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur transition", inWatched ? "border-white bg-white text-black" : "border-white/18 bg-white/8 text-white hover:bg-white/14")}>
                    <Eye size={18} className={inWatched ? "fill-black" : ""} />
                  </button>
                  <InlineRatingControl value={userRating} onChange={onRate} />
                  <button
                    onClick={() => similarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="inline-flex h-14 items-center gap-3 rounded-full border border-white/18 bg-white/8 px-6 text-[18px] font-medium text-white backdrop-blur transition hover:bg-white/14"
                  >
                    <Bookmark size={18} /> Similars
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1340px] px-6 pb-14 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                <div className="mb-5 text-[20px] font-semibold text-white">{tr(appLanguage, "synopsis")}</div>
                <p className="text-[15px] leading-8 text-white/72">{detail?.overview || ("overview" in item ? item.overview : "") || "No overview available."}</p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                <div className="mb-5 flex items-center gap-2 text-[20px] font-semibold text-white">
                  <span className="h-5 w-[2px] rounded-full bg-[#ef4444]" />
                  {tr(appLanguage, "details")}
                </div>
                <div className="space-y-3 text-[15px]">
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">IMDb:</span><span className="font-semibold text-white"><span className="text-[#efb43f]">{score}</span> <span className="text-white/42">{imdbScoreValue ? (imdbVotes ? `${imdbVotes.toLocaleString()} votes` : "live") : "TMDB fallback"}</span></span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">Your rating:</span><span className="font-semibold text-white">{typeof userRating === "number" ? `${(userRating / 2).toFixed(1)}/5` : "Not rated"}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "year")}:</span><span className="font-semibold text-white">{getYear(display as DetailData)}</span></div>
                  {runtimeText ? <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "runtime")}:</span><span className="font-semibold text-white">{runtimeText}</span></div> : null}
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "genres")}:</span><span className="font-semibold text-white">{genreText}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "languageLabel")}:</span><span className="font-semibold text-white">{languageText}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "studio")}:</span><span className="font-semibold text-white">{studioText}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "director")}:</span><span className="font-semibold text-white">{directorText}</span></div>
                  <div className="grid grid-cols-[110px_1fr] gap-3"><span className="text-white/50">{tr(appLanguage, "release")}:</span><span className="font-semibold text-white">{releaseDate}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                {castForDisplay.length ? (
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                    <div className="mb-5 flex items-center gap-2 text-[20px] font-semibold text-white">
                      <span className="h-5 w-[2px] rounded-full bg-[#ef4444]" />
                      Actors
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {castForDisplay.map((person, index) => (
                        <motion.button
                          key={person.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.22 }}
                          className="group flex items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.025] p-3 text-left transition hover:border-white/14 hover:bg-white/[0.05]"
                        >
                          <div className="h-14 w-14 overflow-hidden rounded-full bg-[#1b2333] ring-1 ring-white/8">
                            {person.profile_path ? (
                              <img src={`${POSTER_BASE}${person.profile_path}`} alt={person.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-110" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/38">No photo</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-semibold text-white">{person.name}</div>
                            <div className="truncate text-[12px] text-white/45">{person.character || "Cast"}</div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {mediaType === "tv" ? (() => {
                  const seasonMeta = (detail?.seasons || []).filter((s) => s.season_number > 0);
                  const selectedSeasonMeta = seasonMeta.find((s) => s.season_number === selectedSeason);
                  const totalEpisodes = episodes.length || selectedSeasonMeta?.episode_count || 0;
                  const watchedCount = watchedEpisodes.length;
                  const remainingCount = Math.max(totalEpisodes - watchedCount, 0);
                  const progressPercent = totalEpisodes ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
                  const currentFilter = library.watching[String(item.id)]?.episodeFilter || "all";
                  const visibleEpisodes = episodes.filter((ep) => {
                    const isWatched = watchedEpisodes.includes(ep.episode_number);
                    if (currentFilter === "watched") return isWatched;
                    if (currentFilter === "unwatched") return !isWatched;
                    return true;
                  });
                  
                  return (
                    <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                      <SectionHeading title={tr(appLanguage, "episodeTracker")} />

                      <div className="mb-5 rounded-[18px] border border-white/8 bg-white/[0.025] p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-[15px] font-semibold text-white">Season {selectedSeason}</div>
                            <div className="mt-1 text-sm text-white/45">{watchedCount} watched · {remainingCount} remaining · Current E{selectedEpisode || savedSelectedEpisode || 1}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-white/72">
                            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5">{totalEpisodes} total</span>
                            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5">{progressPercent}% complete</span>
                          </div>
                        </div>
                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#efb43f] transition-all" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <select
                          value={selectedSeason}
                          onChange={(e) => loadSeason(Number(e.target.value))}
                          className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none"
                        >
                          {seasonMeta.map((season) => {
                            const seasonWatched = library.watching[String(item.id)]?.watchedEpisodesBySeason?.[String(season.season_number)]?.length || 0;
                            return (
                              <option key={season.season_number} value={season.season_number}>
                                S{season.season_number} ({seasonWatched}/{season.episode_count || 0})
                              </option>
                            );
                          })}
                        </select>

                        <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                          {[
                            { key: "all", label: "All" },
                            { key: "watched", label: "Watched" },
                            { key: "unwatched", label: "Unwatched" },
                          ].map((filter) => (
                            <button
                              key={filter.key}
                              onClick={() => setEpisodeFilter(item.id, filter.key as "all" | "watched" | "unwatched")}
                              className={cn(
                                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                                currentFilter === filter.key ? "bg-[#efb43f] text-black" : "text-white/60 hover:text-white"
                              )}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => continueToNextEpisode(item.id, selectedSeason, episodes.map((ep) => ep.episode_number))}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08]"
                        >
                          Continue here
                        </button>
                        <button
                          onClick={() => markEpisodesUpTo(item.id, selectedSeason, selectedEpisode || savedSelectedEpisode || 1)}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08]"
                        >
                          Mark previous watched
                        </button>
                        <button
                          onClick={() => markSeasonComplete(item.id, selectedSeason, episodes.map((ep) => ep.episode_number))}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/82 transition hover:bg-white/[0.08]"
                        >
                          Mark season complete
                        </button>
                        <button
                          onClick={() => clearSeasonEpisodes(item.id, selectedSeason)}
                          className="rounded-[10px] border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          Reset season
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                        {visibleEpisodes.map((ep) => {
                          const checked = watchedEpisodes.includes(ep.episode_number);
                          const activeEpisode = (selectedEpisode || savedSelectedEpisode) === ep.episode_number;
                          return (
                            <div
                              key={ep.id}
                              className={cn(
                                "flex items-center justify-between rounded-[16px] border px-4 py-3 transition",
                                activeEpisode ? "border-[#efb43f]/40 bg-[#efb43f]/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                              )}
                            >
                              <button
                                onClick={() => setCurrentEpisode(item.id, ep.episode_number)}
                                className="flex min-w-0 flex-1 items-center gap-4 text-left"
                              >
                                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold", activeEpisode ? "bg-[#efb43f] text-black" : "bg-white/8 text-white/72")}>
                                  E{ep.episode_number}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-white">{ep.name}</div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/42">
                                    {ep.runtime ? <span>{ep.runtime}m</span> : null}
                                    {ep.air_date ? <span>{ep.air_date}</span> : null}
                                    {activeEpisode ? <span className="text-[#efb43f]">Current</span> : null}
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={() => toggleEpisode(item.id, ep.episode_number)}
                                className={cn("ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition", checked ? "bg-[#efb43f] text-black" : "border border-white/10 text-white/40 hover:bg-white/[0.06]")}
                              >
                                {checked ? <Check size={14} /> : null}
                              </button>
                            </div>
                          );
                        })}
                        {!visibleEpisodes.length ? (
                          <div className="rounded-[14px] border border-white/8 bg-white/[0.025] px-4 py-6 text-center text-sm text-white/45">No episodes in this filter.</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })() : null}
              </div>
            </div>

            {similarItems.length ? (
              <div ref={similarSectionRef} className="mt-10 rounded-[22px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.18)]">
                <div className="mb-5 flex items-center gap-2 text-[20px] font-semibold text-white">
                  <span className="h-5 w-[2px] rounded-full bg-[#ef4444]" />
                  You may like
                </div>
                <Grid
                  items={similarItems}
                  mediaType={mediaType}
                  onOpen={(nextItem, nextType) => onOpenRelated(nextItem as MediaItem, nextType)}
                  onToggleWatchlist={(nextItem, nextType) => onToggleSimilarWatchlist(nextItem as MediaItem, nextType)}
                  onToggleWatched={(nextItem, nextType) => onToggleSimilarWatched(nextItem as MediaItem, nextType)}
                  watchlistKeys={similarWatchlistKeys}
                  watchedKeys={similarWatchedKeys}
                  ratings={ratingsMap}
                />
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function GoodFilmApp() {
    const [appLanguage, setAppLanguage] = useState<AppLanguage>("en");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [currentUser, setCurrentUser] = useState<CloudUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [search, setSearch] = useState("");
  const [library, setLibrary] = useState<UserLibrary>(defaultLibrary);

  const [cloudHydratedUserId, setCloudHydratedUserId] = useState<string | null>(null);
  const [cloudModeState, setCloudModeState] = useState<CloudMode>(hasSupabase ? "unknown" : "disabled");

  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [fanFavorites, setFanFavorites] = useState<MediaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<MediaItem[]>([]);
  const [crimeTV, setCrimeTV] = useState<MediaItem[]>([]);
  const [dramaTV, setDramaTV] = useState<MediaItem[]>([]);
  const [sciFiFantasyTV, setSciFiFantasyTV] = useState<MediaItem[]>([]);
  const [animationTV, setAnimationTV] = useState<MediaItem[]>([]);
  const [comedyTV, setComedyTV] = useState<MediaItem[]>([]);
  const [comingSoon, setComingSoon] = useState<MediaItem[]>([]);
  const [latestMovies, setLatestMovies] = useState<MediaItem[]>([]);
  const [latestSeries, setLatestSeries] = useState<MediaItem[]>([]);

  const [selectedItem, setSelectedItem] = useState<MediaItem | LibraryItem | null>(null);
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);

  const [homeError, setHomeError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bulkLinking, setBulkLinking] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 400);
const recheckCloudSync = useCallback(async (userOverride?: CloudUser | null) => {
  const targetUser = userOverride ?? currentUser;
  console.log("recheckCloudSync targetUser", targetUser);
console.log("hasSupabase", hasSupabase);

  if (!hasSupabase) {
    setCloudModeState("disabled");
    return;
  }

  if (!targetUser || targetUser.provider !== "supabase") {
    setCloudModeState("unknown");
    return;
  }

  setCloudModeState("unknown");
  setCloudHydratedUserId(null);

  try {
    const cloudRow = await downloadLibraryFromCloud(targetUser);
    const nextLibrary = cloudRow?.library || defaultLibrary;

    setLibrary(nextLibrary);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLibrary));
    localStorage.setItem(BACKUP_KEY, JSON.stringify(nextLibrary));

    setCloudHydratedUserId(targetUser.id);
    setCloudModeState("ready");
  } catch (err) {
    if (isMissingCloudTableError(err)) {
      setCloudModeState("missing_table");
    } else {
      console.error("Cloud download failed", err);
      setCloudModeState("unknown");
    }

    setLibrary(defaultLibrary);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLibrary));
    localStorage.setItem(BACKUP_KEY, JSON.stringify(defaultLibrary));

    setCloudHydratedUserId(targetUser.id);
  }
}, [currentUser]);
  useEffect(() => {
    setLibrary(loadLibrary());
    setCurrentUser(loadLocalAuth());
    setAppLanguage(loadLanguage());
    if (!getLibraryUpdatedAt()) setLibraryUpdatedAt();
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id && data.user.email) {
        const user: CloudUser = { id: data.user.id, email: data.user.email, provider: "supabase" };
        setCurrentUser(user);
      }
    });

const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user?.id && session.user.email) {
    setCurrentUser({ id: session.user.id, email: session.user.email, provider: "supabase" });
  } else {
    setCurrentUser((prev) => (prev?.provider === "supabase" ? null : prev));
    setLibrary(defaultLibrary);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLibrary));
    localStorage.setItem(BACKUP_KEY, JSON.stringify(defaultLibrary));
  }
});

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    saveLocalAuth(currentUser.provider === "local" ? currentUser : null);
  }, [currentUser]);

useEffect(() => {
  if (!currentUser || currentUser.provider !== "supabase") return;
  downloadLibraryFromCloud(currentUser)
    .then((cloudRow) => {
      const nextLibrary = cloudRow?.library || defaultLibrary;
      setLibrary(nextLibrary);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLibrary));
      localStorage.setItem(BACKUP_KEY, JSON.stringify(nextLibrary));
    })
    .catch((err) => {
      if (!isMissingCloudTableError(err)) {
        console.error("Cloud download failed", err);
      }
      setLibrary(defaultLibrary);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLibrary));
      localStorage.setItem(BACKUP_KEY, JSON.stringify(defaultLibrary));
    });
}, [currentUser?.id, currentUser?.provider]);

useEffect(() => {
  const raw = JSON.stringify(library);
  localStorage.setItem(STORAGE_KEY, raw);
  localStorage.setItem(BACKUP_KEY, raw);
  setLibraryUpdatedAt();

  if (!currentUser) return;
  if (currentUser.provider === "supabase" && cloudHydratedUserId !== currentUser.id) return;
console.log("uploading library", library);
  uploadLibraryToCloud(currentUser, library)
  
    .then(() => {
      if (currentUser.provider === "supabase") {
        setCloudModeState("ready");
      }
    })
    .catch((err) => {
      if (isMissingCloudTableError(err)) {
        setCloudModeState("missing_table");
      } else {
        console.error("Cloud upload failed", err);
      }
    });
}, [library, currentUser?.id, currentUser?.provider, cloudHydratedUserId]);

  const refreshHomeData = useCallback(() => {
    Promise.all([
      tmdbFetch<{ results: MediaItem[] }>("/trending/movie/week"),
      tmdbFetch<{ results: MediaItem[] }>("/movie/popular"),
      tmdbFetch<{ results: MediaItem[] }>("/movie/top_rated"),
      tmdbFetch<{ results: MediaItem[] }>("/tv/popular"),
      tmdbFetch<{ results: MediaItem[] }>("/tv/top_rated"),
      tmdbFetch<{ results: MediaItem[] }>("/movie/upcoming"),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 80, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 18, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 10765, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 16, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { with_genres: 35, sort_by: "popularity.desc", page: 1 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/movie", { sort_by: "release_date.desc", page: 1, "vote_count.gte": 20 }),
      tmdbFetch<{ results: MediaItem[] }>("/discover/tv", { sort_by: "first_air_date.desc", page: 1, "vote_count.gte": 10 }),
    ])
      .then(([trending, movies, topMovies, tv, topTv, upcoming, crime, drama, scifiFantasy, animation, comedy, latestMovieResults, latestTvResults]) => {
        setTrendingMovies((trending.results || []).slice(0, 18));
        setPopularMovies((movies.results || []).slice(0, 18));
        setFanFavorites((topMovies.results || []).slice(0, 18));
        setPopularSeries((tv.results || []).slice(0, 18));
        setTopRatedTV((topTv.results || []).slice(0, 18));
        setCrimeTV((crime.results || []).slice(0, 18));
        setDramaTV((drama.results || []).slice(0, 18));
        setSciFiFantasyTV((scifiFantasy.results || []).slice(0, 18));
        setAnimationTV((animation.results || []).slice(0, 18));
        setComedyTV((comedy.results || []).slice(0, 18));
        setComingSoon((upcoming.results || []).slice(0, 18));
        setLatestMovies((latestMovieResults.results || []).slice(0, 18));
        setLatestSeries((latestTvResults.results || []).slice(0, 18));
        setFeatured((trending.results || [])[1] || (movies.results || [])[0] || null);
        setHomeError(null);
      })
      .catch(() => setHomeError("TMDB data failed to load. Add your bearer token or API key at the top of the file."));
  }, []);

  useEffect(() => {
    refreshHomeData();

    const handleRefresh = () => refreshHomeData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshHomeData();
    };

    const interval = window.setInterval(refreshHomeData, 300000);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshHomeData]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }
    setSearchLoading(true);
    tmdbFetch<{ results: MediaItem[] }>("/search/multi", { query: q })
      .then((res) => {
        setSearchResults((res.results || []).filter((x) => x.media_type === "movie" || x.media_type === "tv"));
        setSearchError(null);
      })
      .catch(() => setSearchError("Search request failed."))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch]);

  const watchlistKeys = useMemo(() => new Set(library.watchlist.map(keyFor)), [library.watchlist]);
  const watchedKeys = useMemo(() => new Set(library.watched.map(keyFor)), [library.watched]);

  const ensureItem = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType): LibraryItem => {
    if ("mediaType" in item) return item;
    return normalizeMedia(item, mediaType);
  }, []);

  const toggleWatchlist = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const exists = prev.watchlist.some((x) => keyFor(x) === k);
      return {
        ...prev,
        watchlist: exists ? prev.watchlist.filter((x) => keyFor(x) !== k) : [normalized, ...prev.watchlist],
      };
    });
  }, [ensureItem]);

  const toggleWatched = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => {
      const exists = prev.watched.some((x) => keyFor(x) === k);
      return {
        ...prev,
        watched: exists ? prev.watched.filter((x) => keyFor(x) !== k) : [normalized, ...prev.watched],
      };
    });
  }, [ensureItem]);

  const openDetail = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType) => {
    setSelectedItem(item);
    setSelectedType(mediaType);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedItem(null);
    setSelectedType(null);
  }, []);

  const setRating = useCallback((item: MediaItem | LibraryItem, mediaType: MediaType, rating: number) => {
    const normalized = ensureItem(item, mediaType);
    const k = keyFor(normalized);
    setLibrary((prev) => ({
      ...prev,
      watchlist: prev.watchlist.some((x) => keyFor(x) === k) ? prev.watchlist : [normalized, ...prev.watchlist],
      ratings: { ...prev.ratings, [k]: rating },
    }));
  }, [ensureItem]);

  const setWatchingSeason = useCallback((showId: number, season: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)];
      const watchedEpisodesBySeason = current?.watchedEpisodesBySeason || {};
      const selectedEpisodeBySeason = current?.selectedEpisodeBySeason || {};
      const firstTrackedEpisode = watchedEpisodesBySeason[String(season)]?.[0] || 1;

      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            season,
            episodeFilter: current?.episodeFilter || "all",
            watchedEpisodesBySeason,
            selectedEpisodeBySeason: {
              ...selectedEpisodeBySeason,
              [String(season)]: selectedEpisodeBySeason[String(season)] || firstTrackedEpisode,
            },
          },
        },
      };
    });
  }, []);

  const setEpisodeFilter = useCallback((showId: number, filter: "all" | "watched" | "unwatched") => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: 1, selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            episodeFilter: filter,
          },
        },
      };
    });
  }, []);

  const setCurrentEpisode = useCallback((showId: number, episode: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: 1, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(current.season || 1);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: episode,
            },
          },
        },
      };
    });
  }, []);

  const continueToNextEpisode = useCallback((showId: number, season: number, episodeNumbers: number[]) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const watched = new Set(current.watchedEpisodesBySeason[seasonKey] || []);
      const nextEpisode = episodeNumbers.find((ep) => !watched.has(ep)) || episodeNumbers[episodeNumbers.length - 1] || 1;
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: nextEpisode,
            },
          },
        },
      };
    });
  }, []);


  const toggleEpisode = useCallback((showId: number, episode: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season: 1, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(current.season || 1);
      const currentSeasonEpisodes = current.watchedEpisodesBySeason[seasonKey] || [];
      const exists = currentSeasonEpisodes.includes(episode);
      const nextSeasonEpisodes = exists
        ? currentSeasonEpisodes.filter((x) => x !== episode)
        : [...currentSeasonEpisodes, episode].sort((a, b) => a - b);

      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: nextSeasonEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const markEpisodesUpTo = useCallback((showId: number, season: number, episode: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const nextSeasonEpisodes = Array.from({ length: Math.max(episode - 1, 0) }, (_, i) => i + 1);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: episode,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: nextSeasonEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const markSeasonComplete = useCallback((showId: number, season: number, episodeNumbers: number[]) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      const normalizedEpisodes = normalizeEpisodeNumbers(episodeNumbers);
      const lastEpisode = normalizedEpisodes[normalizedEpisodes.length - 1] || 1;
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: lastEpisode,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: normalizedEpisodes,
            },
          },
        },
      };
    });
  }, []);

  const clearSeasonEpisodes = useCallback((showId: number, season: number) => {
    setLibrary((prev) => {
      const current = prev.watching[String(showId)] || { season, episodeFilter: "all", selectedEpisodeBySeason: {}, watchedEpisodesBySeason: {} };
      const seasonKey = String(season);
      return {
        ...prev,
        watching: {
          ...prev.watching,
          [String(showId)]: {
            ...current,
            season,
            selectedEpisodeBySeason: {
              ...current.selectedEpisodeBySeason,
              [seasonKey]: 1,
            },
            watchedEpisodesBySeason: {
              ...current.watchedEpisodesBySeason,
              [seasonKey]: [],
            },
          },
        },
      };
    });
  }, []);

  const resolveLibraryItemToTMDB = useCallback((oldItem: LibraryItem, resolved: MediaItem, mediaType: MediaType) => {
    const normalized = normalizeMedia(resolved, mediaType);
    const oldKey = keyFor(oldItem);
    const newKey = keyFor(normalized);

    setLibrary((prev) => {
      const replaceItem = (items: LibraryItem[]) =>
        dedupeLibraryItems(
          items.map((entry) => (keyFor(entry) === oldKey ? { ...normalized } : entry))
        );

      const nextRatings = { ...prev.ratings };
      if (oldKey !== newKey && typeof nextRatings[oldKey] === "number") {
        nextRatings[newKey] = nextRatings[oldKey];
        delete nextRatings[oldKey];
      }

      const nextWatching = { ...prev.watching };
      if (mediaType === "tv") {
        const oldWatching = nextWatching[String(oldItem.id)];
        if (oldWatching) {
          nextWatching[String(normalized.id)] = oldWatching;
          if (String(normalized.id) !== String(oldItem.id)) delete nextWatching[String(oldItem.id)];
        }
      }

      return {
        ...prev,
        watchlist: replaceItem(prev.watchlist),
        watched: replaceItem(prev.watched),
        ratings: nextRatings,
        watching: nextWatching,
      };
    });

    setSelectedItem((prev) => {
      if (!prev || !("mediaType" in prev)) return prev;
      return keyFor(prev) === oldKey ? normalized : prev;
    });
  }, []);

  const bulkLinkLibraryToTMDB = useCallback(async () => {
    if (bulkLinking) return;
    const uniqueItems = dedupeLibraryItems([...library.watchlist, ...library.watched]);
    if (!uniqueItems.length) {
      window.alert("No library items to link.");
      return;
    }

    setBulkLinking(true);
    try {
      const matches = await mapWithConcurrency(uniqueItems, 4, async (item) => {
        try {
          const match = await searchTMDBMatchForLibraryItem(item);
          return { oldItem: item, match };
        } catch {
          return { oldItem: item, match: null };
        }
      });

      const mapping = new Map<string, LibraryItem>();
      let linkedCount = 0;
      matches.forEach(({ oldItem, match }) => {
        if (!match) return;
        const normalized = normalizeMedia(match, oldItem.mediaType);
        mapping.set(keyFor(oldItem), normalized);
        if (normalized.id !== oldItem.id || normalized.title !== oldItem.title) linkedCount += 1;
      });

      setLibrary((prev) => {
        const replaceItems = (items: LibraryItem[]) =>
          dedupeLibraryItems(items.map((entry) => mapping.get(keyFor(entry)) || entry));

        const nextWatchlist = replaceItems(prev.watchlist);
        const nextWatched = replaceItems(prev.watched);
        const nextRatings: Record<string, number> = {};
        Object.entries(prev.ratings).forEach(([oldKey, value]) => {
          const original = [...prev.watchlist, ...prev.watched].find((entry) => keyFor(entry) === oldKey);
          if (!original) return;
          const replaced = mapping.get(oldKey) || original;
          nextRatings[keyFor(replaced)] = value;
        });

        const nextWatching: WatchingProgress = {};
        Object.entries(prev.watching).forEach(([showId, progress]) => {
          const original = [...prev.watchlist, ...prev.watched].find((entry) => entry.mediaType === "tv" && String(entry.id) === String(showId));
          if (!original) {
            nextWatching[showId] = progress;
            return;
          }
          const replaced = mapping.get(keyFor(original)) || original;
          nextWatching[String(replaced.id)] = progress;
        });

        return {
          ...prev,
          watchlist: nextWatchlist,
          watched: nextWatched,
          ratings: nextRatings,
          watching: nextWatching,
        };
      });

      window.alert(`Bulk link finished. ${linkedCount} items matched to TMDB.`);
    } finally {
      setBulkLinking(false);
    }
  }, [library, bulkLinking]);

  const exportLibrary = useCallback(() => {
    const payload: ImportExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      library: sanitizeLibrary(library),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goodfilm_library_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [library]);

  const importLibrary = useCallback(async (file: File) => {
    try {
      const rawText = (await file.text()).trim();
      if (!rawText) {
        window.alert("The selected file is empty.");
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = JSON.parse(rawText.replace(/^﻿/, ""));
      }

      const candidates = [
        parsed?.library,
        parsed?.data?.library,
        parsed?.data,
        parsed?.goodfilm,
        parsed,
      ].filter(Boolean);

      let sanitized: UserLibrary | null = null;
      for (const candidate of candidates) {
        const next = sanitizeLibrary(candidate);
        const totalItems = next.watchlist.length + next.watched.length + Object.keys(next.watching).length + Object.keys(next.ratings).length;
        if (totalItems > 0) {
          sanitized = next;
          break;
        }
      }

      if (!sanitized) {
        window.alert("Import failed: no valid GoodFilm data was found in that file.");
        return;
      }

      setLibrary(() => sanitized as UserLibrary);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      localStorage.setItem(BACKUP_KEY, JSON.stringify(sanitized));

      if (currentUser) {
        try {
          await uploadLibraryToCloud(currentUser, sanitized);
        } catch {
          window.alert("Imported locally, but cloud sync failed. Check your Supabase connection and policies.");
        }
      }

      window.alert(`Library imported successfully. ${sanitized.watchlist.length} watchlist, ${sanitized.watched.length} watched, ${Object.keys(sanitized.watching).length} series in progress.`);
    } catch {
      window.alert("Invalid JSON file. Export a library from GoodFilm first, or use a compatible JSON structure.");
    }
  }, [currentUser]);

    const selectedKey = selectedItem && selectedType ? keyFor({ id: selectedItem.id, mediaType: selectedType }) : null;

  return (
    <AppShell appLanguage={appLanguage}>
      <TopPillNav activeTab={activeTab} setActiveTab={setActiveTab} search={search} setSearch={setSearch} onOpenSettings={() => setSettingsOpen(true)} appLanguage={appLanguage} />
      <SettingsPanel
cloudMode={cloudModeState}
onRecheckCloud={() => { void recheckCloudSync(); }}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onImport={importLibrary}
        onExport={exportLibrary}
        currentUser={currentUser}
        onOpenAuth={(mode) => { setAuthMode(mode); setAuthOpen(true); }}
        onLogout={() => {
          if (currentUser?.provider === "supabase" && supabase) supabase.auth.signOut();
          setCurrentUser(null);
          setLibrary(defaultLibrary);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLibrary));
          localStorage.setItem(BACKUP_KEY, JSON.stringify(defaultLibrary));
          saveLocalAuth(null);
        }}
        appLanguage={appLanguage}
        />
      <AuthModal open={authOpen} mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSuccess={async (user, mode) => {
          setCurrentUser(user);
          if (user.provider === "supabase") {
            try {
              const cloudRow = await downloadLibraryFromCloud(user);
              if (cloudRow?.library) {
                setLibrary(cloudRow.library);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudRow.library));
                localStorage.setItem(BACKUP_KEY, JSON.stringify(cloudRow.library));
              } else {
                const cleanLibrary = defaultLibrary;
                setLibrary(cleanLibrary);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLibrary));
                localStorage.setItem(BACKUP_KEY, JSON.stringify(cleanLibrary));
                if (mode === "signup") {
                  try { await uploadLibraryToCloud(user, cleanLibrary); } catch {}
                }
              }
            } catch {
              const cleanLibrary = defaultLibrary;
              setLibrary(cleanLibrary);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLibrary));
              localStorage.setItem(BACKUP_KEY, JSON.stringify(cleanLibrary));
            }
          }
        }} />
      <main className="mx-auto max-w-[1340px] px-6 pb-12 pt-2 lg:px-8">
        {(() => {
          if (debouncedSearch.trim()) {
            return (
              <SearchView
                loading={searchLoading}
                error={searchError}
                results={searchResults}
                onOpen={openDetail}
                onToggleWatchlist={toggleWatchlist}
                onToggleWatched={toggleWatched}
                watchlistKeys={watchlistKeys}
                watchedKeys={watchedKeys}
                ratings={library.ratings}
                appLanguage={appLanguage}
              />
            );
          }

          if (activeTab === "home") {
            return (
              <>
                <Hero items={trendingMovies} fallbackItem={featured} onOpen={openDetail} onToggleWatchlist={toggleWatchlist} />
                <div className="mt-12">
                  {homeError ? <EmptyState title="TMDB connection failed" body={homeError} /> : null}
                  <Rail title={tr(appLanguage, "latestMovies")} items={latestMovies} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "latestSeries")} items={latestSeries} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "trendingNow")} items={trendingMovies} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "popularMovies")} items={popularMovies} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "fanFavorites")} items={fanFavorites} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "popularTVSeries")} items={popularSeries} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "topRatedTV")} items={topRatedTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "crimeTV")} items={crimeTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "dramaTV")} items={dramaTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "sciFiFantasyTV")} items={sciFiFantasyTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "animationTV")} items={animationTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "comedyTV")} items={comedyTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "comingSoon")} items={comingSoon} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                </div>
              </>
            );
          }

          if (activeTab === "movies") {
            return (
              <>
                <Hero items={popularMovies} fallbackItem={featured} onOpen={openDetail} onToggleWatchlist={toggleWatchlist} />
                <div className="mt-12 space-y-0">
                  <Rail title={tr(appLanguage, "latestMovies")} items={latestMovies} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "popularMovies")} items={popularMovies} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "trendingMovies")} items={trendingMovies} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title="Fan Favorites" items={fanFavorites} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "comingSoon")} items={comingSoon} mediaType="movie" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                </div>
              </>
            );
          }

          if (activeTab === "series") {
            return (
              <>
                <Hero items={popularSeries} fallbackItem={featured} onOpen={openDetail} onToggleWatchlist={toggleWatchlist} />
                <div className="mt-9 space-y-0">
                  <Rail title={tr(appLanguage, "latestSeries")} items={latestSeries} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "popularTVSeries")} items={popularSeries} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "topRatedTV")} items={topRatedTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "crimeTV")} items={crimeTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "dramaTV")} items={dramaTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "sciFiFantasyTV")} items={sciFiFantasyTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "animationTV")} items={animationTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                  <Rail title={tr(appLanguage, "comedyTV")} items={comedyTV} mediaType="tv" onOpen={openDetail} onToggleWatchlist={toggleWatchlist} onToggleWatched={toggleWatched} watchlistKeys={watchlistKeys} watchedKeys={watchedKeys} ratings={library.ratings} />
                </div>
              </>
            );
          }

          if (activeTab === "watchlist") {
            return (
              <WatchlistTabView
                library={library}
                watchlistKeys={watchlistKeys}
                watchedKeys={watchedKeys}
                onOpen={openDetail}
                onToggleWatchlist={toggleWatchlist}
                onToggleWatched={toggleWatched}
                onBack={() => setActiveTab("mylist")}
                appLanguage={appLanguage}
              />
            );
          }

          if (activeTab === "watched") {
            return (
              <WatchedTabView
                library={library}
                watchlistKeys={watchlistKeys}
                watchedKeys={watchedKeys}
                onOpen={openDetail}
                onToggleWatchlist={toggleWatchlist}
                onToggleWatched={toggleWatched}
                onBack={() => setActiveTab("mylist")}
                appLanguage={appLanguage}
              />
            );
          }

          return (
            <MyListView
              library={library}
              watchlistKeys={watchlistKeys}
              watchedKeys={watchedKeys}
              onOpen={openDetail}
              onToggleWatchlist={toggleWatchlist}
              onToggleWatched={toggleWatched}
              onExport={exportLibrary}
              onImport={importLibrary}
              onNavigateTab={setActiveTab}
              onBulkLinkTMDB={bulkLinkLibraryToTMDB}
              bulkLinking={bulkLinking}
              appLanguage={appLanguage}
            />
          );
        })()}

        <FooterStats library={library} appLanguage={appLanguage} />
      </main>

      <DetailModal
        open={Boolean(selectedItem && selectedType)}
        item={selectedItem}
        mediaType={selectedType}
        onClose={closeDetail}
        inWatchlist={selectedKey ? watchlistKeys.has(selectedKey) : false}
        inWatched={selectedKey ? watchedKeys.has(selectedKey) : false}
        userRating={selectedKey ? library.ratings[selectedKey] : undefined}
        onToggleWatchlist={() => selectedItem && selectedType && toggleWatchlist(selectedItem, selectedType)}
        onToggleWatched={() => selectedItem && selectedType && toggleWatched(selectedItem, selectedType)}
        onRate={(rating) => selectedItem && selectedType && setRating(selectedItem, selectedType, rating)}
        library={library}
        setWatchingSeason={setWatchingSeason}
        toggleEpisode={toggleEpisode}
        setEpisodeFilter={setEpisodeFilter}
        setCurrentEpisode={setCurrentEpisode}
        continueToNextEpisode={continueToNextEpisode}
        markEpisodesUpTo={markEpisodesUpTo}
        markSeasonComplete={markSeasonComplete}
        clearSeasonEpisodes={clearSeasonEpisodes}
        onResolveLibraryItem={resolveLibraryItemToTMDB}
        onOpenRelated={openDetail}
        onToggleSimilarWatchlist={toggleWatchlist}
        onToggleSimilarWatched={toggleWatched}
        similarWatchlistKeys={watchlistKeys}
        similarWatchedKeys={watchedKeys}
        ratingsMap={library.ratings}
        appLanguage={appLanguage}      />
    </AppShell>
  );
}
