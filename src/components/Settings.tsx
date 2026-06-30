import React, { useState, useEffect } from "react";
import { Settings, Task } from "../types";
import { getSettings, saveSettings, syncGoogleCalendar, initializeDatabase } from "../lib/api";
import {
  googleSignIn,
  logout as googleLogout,
  initAuth,
  getAccessToken,
} from "../lib/firebaseAuth";
import { User as FirebaseUser } from "firebase/auth";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Music,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  RefreshCw,
  UserCheck,
  Globe,
} from "lucide-react";

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Blocklist form state
  const [newDomain, setNewDomain] = useState<string>("");

  useEffect(() => {
    // 1. Load general settings
    setSettings(getSettings());

    // 2. Load Google auth state from Firebase Auth
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        // Set setting flag if true
        updateCalendarConnected(true);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        updateCalendarConnected(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateCalendarConnected = async (connected: boolean) => {
    const current = getSettings();
    if (current.calendarConnected !== connected) {
      const updated = { ...current, calendarConnected: connected };
      setSettings(updated);
      await saveSettings(updated);
    }
  };

  const handleToggleDemoMode = async () => {
    if (!settings) return;
    const val = !settings.demoMode;
    const updated = { ...settings, demoMode: val };
    setSettings(updated);
    await saveSettings(updated);
    alert(
      val
        ? "Demo Mode is now active. AI features will run in local simulation."
        : "Live API Mode is active. StartLine will query Gemini on the backend!"
    );
  };

  const handleConnectCalendar = async () => {
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        await updateCalendarConnected(true);
        // Automatically run initial sync!
        await handleTriggerSync(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      setSyncError("Google Sign-In was cancelled or failed to authenticate.");
    }
  };

  const handleDisconnectCalendar = async () => {
    const confirmed = confirm(
      "Are you sure you want to disconnect Google Calendar integration? This will stop synchronizing your deadlines."
    );
    if (!confirmed) return;

    setSyncError(null);
    setSyncStatus("idle");
    try {
      await googleLogout();
      setCurrentUser(null);
      setAccessToken(null);
      await updateCalendarConnected(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleTriggerSync = async (forcedToken?: string) => {
    const token = forcedToken || accessToken;
    if (!token) {
      setSyncStatus("error");
      setSyncError("Not connected to Google. Please authenticate first.");
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      // Sync Google Calendar dual direction
      await syncGoogleCalendar(token);
      setSyncStatus("success");
      setLastSynced(new Date().toLocaleTimeString());
      // Refresh local tasks inside React if there are observers, or reload task index
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err: any) {
      console.error("Sync failed:", err);
      setSyncStatus("error");

      // Handle token expiration / revocation
      if (err.message && err.message.includes("AUTH_ERROR")) {
        setSyncError("Google Calendar authorization has been revoked or expired. Please sign in again.");
        // De-authenticate
        await googleLogout();
        setCurrentUser(null);
        setAccessToken(null);
        await updateCalendarConnected(false);
      } else {
        setSyncError(err.message || "Unable to sync with Google Calendar. Check connection and retry.");
      }
    }
  };

  // Blocklist handlers
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !newDomain.trim()) return;

    // Sanitize domain (e.g. lowercase, remove protocols)
    let domain = newDomain.trim().toLowerCase();
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "");
    domain = domain.split("/")[0]; // keep only host

    if (!domain) return;

    if (settings.blocklist.includes(domain)) {
      alert("This domain is already on your distraction blocklist.");
      setNewDomain("");
      return;
    }

    const updated = {
      ...settings,
      blocklist: [...settings.blocklist, domain],
    };
    setSettings(updated);
    await saveSettings(updated);
    setNewDomain("");
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      blocklist: settings.blocklist.filter((d) => d !== domain),
    };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleResetDatabase = () => {
    if (
      confirm(
        "⚠️ WARNING: This will completely wipe all student profiles, task lists, and focus history. This action is irreversible. Proceed?"
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!settings) return null;

  const hasSystemKey = settings.geminiApiKey === "CONFIGURED_IN_ENV";

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-3xl mx-auto selection:bg-[#8b5cf6]/30">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-[#8b5cf6]" />
          Configure Study Workspace
        </h1>
        <p className="text-sm text-[#9b9fc0] mt-1">
          Customize model endpoints, Google Calendar synchronization, and Pomodoro blocklists.
        </p>
      </div>

      {/* Google Calendar Two-Way Synchronization */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Google Calendar Sync (Two-Way)
          </h3>
        </div>

        <p className="text-xs text-[#9b9fc0] leading-relaxed">
          Synchronize your academic deadlines in real time. Creating study blocks in StartLine automatically exports them as calendar events, and adding academic events on Google Calendar automatically imports them as high-priority goals.
        </p>

        {accessToken && currentUser ? (
          <div className="space-y-4">
            {/* Status Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Google Calendar Connected
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-extrabold uppercase">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[#9b9fc0] flex items-center gap-1.5 font-medium">
                    <UserCheck className="w-3.5 h-3.5" />
                    Authenticated as <span className="text-white font-semibold">{currentUser.email}</span>
                  </p>
                  {lastSynced && (
                    <p className="text-[10px] text-[#5c6080] font-bold uppercase">
                      Last synchronized at: {lastSynced}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleTriggerSync()}
                  disabled={syncStatus === "syncing"}
                  className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                  {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={handleDisconnectCalendar}
                  className="bg-white/5 border border-white/5 hover:bg-white/10 text-[#9b9fc0] hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Sync status messages */}
            {syncStatus === "success" && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-semibold animate-pulse">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Workspace deadlines synchronized successfully! Check your primary Google Calendar.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4.5 bg-[#161822] border border-white/5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold text-white">Google Workspace integration is inactive</h4>
                <p className="text-xs text-[#9b9fc0]">
                  Authorize calendar permissions to enable bidirection schedule syncing on your personal timeline.
                </p>
              </div>

              {/* Official Google Material Button design */}
              <button
                onClick={handleConnectCalendar}
                className="gsi-material-button shrink-0 hover:opacity-95 transition"
                style={{
                  backgroundColor: "white",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.3)",
                  cursor: "pointer",
                  display: "flex",
                  padding: "0 16px",
                  height: "40px",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: "block", width: "18px", height: "18px" }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                  </svg>
                  <span
                    style={{
                      color: "#1f1f1f",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Connect Google Calendar
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {syncError && (
          <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-xl flex items-start gap-3 text-xs text-red-400 font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider block text-[10px]">Sync Alert</span>
              <p>{syncError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Pomodoro Focus Blocklist Guard */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Distraction Shield Blocklist
          </h3>
        </div>

        <p className="text-xs text-[#9b9fc0] leading-relaxed">
          Configure domains that degrade focus grades. While Pomodoro sessions are running, StartLine monitors visibility status. If you tab away to these listed domains, the system records it as a distraction violation and logs it under calibration history.
        </p>

        {/* List of current domains */}
        <div className="flex flex-wrap gap-2 py-1">
          {settings.blocklist && settings.blocklist.length > 0 ? (
            settings.blocklist.map((domain) => (
              <div
                key={domain}
                className="bg-white/5 border border-white/5 pl-3 pr-2 py-1.5 rounded-xl flex items-center gap-2 text-xs text-[#e2e4f0] font-mono hover:border-red-500/20 hover:bg-red-500/5 transition group"
              >
                <span>{domain}</span>
                <button
                  onClick={() => handleRemoveDomain(domain)}
                  className="text-[#5c6080] group-hover:text-red-400 hover:scale-105 transition p-0.5"
                  title={`Remove ${domain}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <span className="text-xs text-[#5c6080] italic">No active blocks configured. Your workspace is fully open.</span>
          )}
        </div>

        {/* Add new domain form */}
        <form onSubmit={handleAddDomain} className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g. reddit.com, twitter.com"
            className="flex-1 bg-[#161822] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-amber-500/40 focus:ring-4 focus:ring-amber-500/10 transition"
          />
          <button
            type="submit"
            disabled={!newDomain.trim()}
            className="bg-white/5 hover:bg-amber-500/15 border border-white/5 text-amber-400 text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-40 transition flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Site
          </button>
        </form>
      </div>

      {/* Model & Secrets Overrides */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Security &amp; Keys</h3>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4 p-4.5 bg-[#161822] border border-white/5 rounded-xl">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Backend Gemini Secret Key
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  hasSystemKey ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {hasSystemKey ? "Configured" : "Missing"}
                </span>
              </h4>
              <p className="text-xs text-[#9b9fc0] leading-relaxed">
                StartLine is fully integrated on the backend. Your API key is injected automatically from the AI Studio Secrets panel.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center gap-4 p-4.5 bg-[#161822] border border-white/5 rounded-xl">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                AI Demo Simulation Mode
              </h4>
              <p className="text-xs text-[#9b9fc0] leading-relaxed">
                When active, study blocks are planned and audited locally using fast simulations. Toggle off to connect real Gemini API.
              </p>
            </div>
            <button
              onClick={handleToggleDemoMode}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                settings.demoMode ? "bg-[#8b5cf6]" : "bg-[#252840]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                  settings.demoMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Curated Spotify Playlists List */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Curated Playlists</h3>
        </div>

        <div className="space-y-2">
          {settings.spotifyPlaylists?.map((p) => (
            <div key={p.id} className="flex justify-between items-center p-3 bg-[#161822] border border-white/5 rounded-xl text-xs">
              <span className="font-bold text-white">{p.name}</span>
              <a
                href={p.url.replace("/embed", "")}
                target="_blank"
                rel="noreferrer"
                className="text-[#3b82f6] hover:underline"
              >
                Open in App
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Operations */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Database Operations</h3>
        </div>

        <div className="p-4.5 bg-red-500/5 border border-red-500/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-red-400">Hard Reset Workspace</h4>
            <p className="text-xs text-[#9b9fc0] leading-relaxed">
              Completely wipe your local cache and clear all task databases. This will restart the onboarding wizard.
            </p>
          </div>
          <button
            onClick={handleResetDatabase}
            className="bg-red-500/15 hover:bg-red-500/20 text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0 self-start sm:self-auto"
          >
            Wipe &amp; Purge DB
          </button>
        </div>
      </div>

    </div>
  );
}
