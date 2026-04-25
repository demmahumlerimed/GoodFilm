import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Film, Lock, LogIn, Mail, RefreshCw, User, X } from "lucide-react";
import { validatePasswordStrength, normalizeAuthErrorMessage, buildDefaultProfile } from "../../utils/auth";
import { loadUserProfile, saveUserProfile } from "../../utils/storage";
import { supabase } from "../../services/supabase";
import type { AuthMode, CloudUser, UserProfile } from "../../types";

function AuthTypewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setDisplayed(""); setIdx(0);
  }, [text]);
  useEffect(() => {
    if (idx >= text.length) return;
    const t = setTimeout(() => {
      setDisplayed(p => p + text[idx]);
      setIdx(p => p + 1);
    }, 42);
    return () => clearTimeout(t);
  }, [idx, text]);
  return (
    <span>
      {displayed}
      <span className="animate-pulse opacity-70">|</span>
    </span>
  );
}

const AUTH_PANELS = {
  login: {
    backdrop: "https://image.tmdb.org/t/p/original/628Dep6AxEtDxjZoGP78TsOxYbK.jpg",
    quote: "The stuff that dreams are made of.",
    film: "The Maltese Falcon"
  },
  signup: {
    backdrop: "https://image.tmdb.org/t/p/original/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    quote: "Every passing minute is another chance to turn it all around.",
    film: "Vanilla Sky"
  },
};

export function AuthModal({
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
  onSuccess: (user: CloudUser, mode: AuthMode, profile?: UserProfile) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail(""); setPassword(""); setConfirmPassword(""); setUsername("");
      setMessage(null); setLoading(false); setShowPass(false); setShowConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !loading) handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, email, password, confirmPassword, username, loading]);

  const handleSubmit = async () => {
    if (!email.trim()) { setMessage("Enter a valid email address."); return; }
    if (mode === "signup") {
      if (!username.trim() || username.trim().length < 3) { setMessage("Choose a username with at least 3 characters."); return; }
      if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
      const passwordError = validatePasswordStrength(password);
      if (passwordError) { setMessage(passwordError); return; }
    } else {
      if (password.length < 6) { setMessage("Enter your password."); return; }
    }
    setLoading(true);
    setMessage(null);
    try {
      if (!supabase) { setMessage("Supabase authentication is not configured."); return; }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user?.id && data.user.email) {
          const profile = buildDefaultProfile(data.user.email, username.trim());
          saveUserProfile(data.user.email, profile);
          onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode, profile);
          onClose();
        } else {
          setMessage("Check your email to confirm your account.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user?.id && data.user.email) {
          const profile = loadUserProfile(data.user.email);
          const nextProfile = { ...profile, lastLogin: new Date().toISOString() };
          saveUserProfile(data.user.email, nextProfile);
          onSuccess({ id: data.user.id, email: data.user.email, provider: "supabase" }, mode, nextProfile);
          onClose();
        }
      }
    } catch (err: unknown) {
      setMessage(normalizeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";
  const inputClass = "flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.06] px-4 py-3.5 focus-within:border-[#e8a020]/50 focus-within:bg-white/[0.09] transition";
  const panel = AUTH_PANELS[isLogin ? "login" : "signup"];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={e => e.stopPropagation()}
            className="flex w-full max-w-[860px] overflow-hidden rounded-[16px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] mx-3 md:mx-4 md:rounded-[24px]"
          >
            {/* LEFT: Form panel */}
            <div className="flex w-full flex-col justify-center bg-[#0c0d14] px-5 py-8 sm:px-8 md:w-[420px] md:shrink-0 md:px-10">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8a020]">
                    <Film size={14} className="text-black" />
                  </div>
                  <span className="text-[15px] font-black tracking-[-0.02em] text-white">GoodFilm</span>
                </div>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/40 transition hover:bg-white/14 hover:text-white">
                  <X size={15} />
                </button>
              </div>

              <div className="mb-7">
                <h2 className="text-[26px] font-black tracking-[-0.04em] text-white">
                  {isLogin ? "Welcome back" : "Create account"}
                </h2>
                <p className="mt-1 text-[13px] text-white/40">
                  {isLogin ? "Sign in to sync your list across devices" : "Join GoodFilm and start tracking films"}
                </p>
              </div>

              <div className="space-y-3.5">
                {!isLogin && (
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-white/50">Username</div>
                    <div className={inputClass}>
                      <User size={15} className="shrink-0 text-white/25" />
                      <input value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="Choose a username" autoComplete="username"
                        className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-white/50">Email</div>
                  <div className={inputClass}>
                    <Mail size={15} className="shrink-0 text-white/25" />
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" type="email" autoComplete="email"
                      className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-white/50">Password</div>
                  <div className={inputClass}>
                    <Lock size={15} className="shrink-0 text-white/25" />
                    <input type={showPass ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isLogin ? "Your password" : "Create a strong password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="shrink-0 text-white/25 transition hover:text-white/60">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <div className="mb-1.5 text-[12px] font-semibold text-white/50">Confirm Password</div>
                    <div className={inputClass}>
                      <Lock size={15} className="shrink-0 text-white/25" />
                      <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password" autoComplete="new-password"
                        className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/20" />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="shrink-0 text-white/25 transition hover:text-white/60">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {message && (
                  <div className="flex items-center gap-2 rounded-[12px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[12px] text-red-400">
                    <X size={13} className="shrink-0" /> {message}
                  </div>
                )}

                <button onClick={handleSubmit} disabled={loading}
                  className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[13px] bg-[#e8a020] text-[14px] font-black text-black shadow-[0_4px_20px_rgba(239,180,63,0.35)] transition hover:brightness-110 disabled:opacity-50">
                  {loading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}><RefreshCw size={16} /></motion.div>
                    : isLogin ? <LogIn size={16} /> : <User size={16} />}
                  {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
                </button>

                <div className="pt-1 text-center text-[12px] text-white/35">
                  {isLogin ? "No account yet? " : "Already have one? "}
                  <button onClick={() => { setMode(isLogin ? "signup" : "login"); setMessage(null); }}
                    className="font-semibold text-[#e8a020] transition hover:underline">
                    {isLogin ? "Create account" : "Sign in"}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Cinematic backdrop — hidden on mobile */}
            <div className="relative hidden flex-1 md:block">
              <AnimatePresence mode="sync">
                <motion.div key={panel.backdrop}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0"
                >
                  <img src={panel.backdrop} alt="" className="pointer-events-none h-full w-full object-cover object-center" />
                </motion.div>
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_40%,rgba(0,0,0,0.75)_100%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(12,13,20,0.6)_0%,transparent_50%)]" />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <blockquote className="space-y-2">
                  <p className="text-[16px] font-semibold italic leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    "<AnimatePresence mode="wait">
                      <motion.span key={panel.quote} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                        <AuthTypewriter text={panel.quote} />
                      </motion.span>
                    </AnimatePresence>"
                  </p>
                  <cite className="block text-[12px] font-medium not-italic text-white/50">— {panel.film}</cite>
                </blockquote>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
