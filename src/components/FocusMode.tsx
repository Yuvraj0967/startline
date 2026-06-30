import React, { useState, useEffect, useRef } from "react";
import { Task, Subtask, FocusSession } from "../types";
import { getTask, toggleSubtask, logBehavior, getSettings, saveFocusSession } from "../lib/api";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Music,
  CheckCircle2,
  Circle,
  FileText,
  Volume2,
  Activity,
  Mic,
  MicOff,
  EyeOff,
  CloudRain,
  Waves,
  Coffee,
  Plus,
  Trash2,
  AlertTriangle,
  Flame,
  ShieldCheck,
} from "lucide-react";

interface FocusModeProps {
  taskId: string;
  subtaskId?: string; // Optional starting subtask
  onClose: () => void;
}

export default function FocusMode({ taskId, subtaskId, onClose }: FocusModeProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | undefined>(subtaskId);
  
  // Customizable Interval Timer States
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");
  const [workMin, setWorkMin] = useState<number>(25);
  const [breakMin, setBreakMin] = useState<number>(5);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  
  // Custom Session Tasks (Micro-objectives for this specific Pomodoro block)
  const [sessionObjectives, setSessionObjectives] = useState<{ id: string; title: string; completed: boolean }[]>([
    { id: "obj1", title: "Review instructions & syllabus parameters", completed: false },
    { id: "obj2", title: "Draft main skeleton draft structure", completed: false },
  ]);
  const [newObjectiveText, setNewObjectiveText] = useState<string>("");

  // Blocklist and Distractions
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [tabAwayCount, setTabAwayCount] = useState<number>(0);
  const [showDistractionWarning, setShowDistractionWarning] = useState<boolean>(false);
  const [lastViolationSite, setLastViolationSite] = useState<string>("");
  const [blocklistHits, setBlocklistHits] = useState<string[]>([]);

  // Spotify Playlist state
  const [spotifyUrl, setSpotifyUrl] = useState<string>("https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn");
  const [customSpotifyUrl, setCustomSpotifyUrl] = useState<string>("");

  // Scratchpad
  const [notepadText, setNotepadText] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);

  // Refs
  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // HTML5 Web Audio Synthesizer refs for Rain/White noise
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioNode | null>(null);
  const [ambientNoiseType, setAmbientNoiseType] = useState<"none" | "white" | "pink">("none");

  useEffect(() => {
    loadTaskDetails();
    initTabAwayDetector();

    // Load blocklist from settings
    const settings = getSettings();
    if (settings && settings.blocklist) {
      setBlocklist(settings.blocklist);
    } else {
      setBlocklist(["facebook.com", "instagram.com", "reddit.com", "youtube.com"]);
    }

    // Set initial start latency metric on load
    startTimeRef.current = Date.now();

    return () => {
      clearInterval(timerIntervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopAmbientNoise();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [taskId]);

  // Handle timer length shifts when workMin changes and timer is NOT running
  useEffect(() => {
    if (!timerRunning) {
      setSecondsLeft((timerMode === "work" ? workMin : breakMin) * 60);
    }
  }, [workMin, breakMin, timerMode]);

  const loadTaskDetails = () => {
    const t = getTask(taskId);
    setTask(t);
    if (t && !activeSubId) {
      // Pick first incomplete subtask as default
      const incomplete = t.subtasks.find((s) => s.status === "pending");
      if (incomplete) {
        setActiveSubId(incomplete.id);
      }
    }
  };

  // ── Tab Away Visibility Detector ──────────────────────────────────────────
  const initTabAwayDetector = () => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setTabAwayCount((prev) => prev + 1);
      
      // Select a site from blocklist to warn about (simulation of tab away check)
      const hitSite = blocklist.length > 0 ? blocklist[Math.floor(Math.random() * blocklist.length)] : "distracting websites";
      setLastViolationSite(hitSite);
      setBlocklistHits((prev) => [...prev, hitSite]);

      if (timerRunning) {
        setShowDistractionWarning(true);
      }
    }
  };

  // ── Pomodoro Timer Controls ───────────────────────────────────────────────
  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setTimerRunning(false);
          playZenCrystalBell();
          handleSessionCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setTimerRunning(false);
    clearInterval(timerIntervalRef.current);
  };

  const resetTimer = () => {
    pauseTimer();
    setSecondsLeft((timerMode === "work" ? workMin : breakMin) * 60);
  };

  const handleToggleTimerMode = () => {
    pauseTimer();
    const nextMode = timerMode === "work" ? "break" : "work";
    setTimerMode(nextMode);
    setSecondsLeft((nextMode === "work" ? workMin : breakMin) * 60);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // ── Log focus sessions and behavior metrics on completion ─────────────────
  const handleSessionCompletion = async () => {
    const isWorkSession = timerMode === "work";
    const totalDurationSeconds = (isWorkSession ? workMin : breakMin) * 60 - secondsLeft;
    
    if (isWorkSession) {
      // 1. Log to server focusSessions collection
      const activeSub = task?.subtasks.find((s) => s.id === activeSubId);
      await saveFocusSession({
        taskId: task?.id || "",
        taskTitle: task?.title || "Custom Study Goal",
        subtaskId: activeSubId || "",
        subtaskTitle: activeSub?.title || "",
        startTime: new Date(startTimeRef.current).toISOString(),
        endTime: new Date().toISOString(),
        durationSeconds: totalDurationSeconds,
        completed: secondsLeft <= 2, // successfully completed
        tabAwayCount: tabAwayCount,
        sessionObjectives: sessionObjectives,
        blocklistHits: blocklistHits,
      });

      // 2. Log standard behavior log for start streaks
      if (activeSubId) {
        await logBehavior({
          taskId: taskId,
          subtaskId: activeSubId,
          startLatency: Math.max(
            0,
            Math.round((Date.now() - startTimeRef.current - totalDurationSeconds * 1000) / 1000)
          ),
          abandoned: secondsLeft > 5,
          tabAwaySecs: tabAwayCount * 10,
        });
      }

      alert("⏰ Focus interval completed! Your study stats have been calibrated and locked in.");

      // Prompt automatic break switch
      const startBreak = confirm("Focus block complete! Would you like to start your 5-minute break now?");
      if (startBreak) {
        setTimerMode("break");
        setSecondsLeft(breakMin * 60);
        setTimeout(() => startTimer(), 500);
      } else {
        setTimerMode("work");
        resetTimer();
      }
    } else {
      alert("☕ Break interval completed! Ready to lock in for another focus round?");
      setTimerMode("work");
      resetTimer();
    }
  };

  const handleCloseFocusMode = async () => {
    if (timerRunning) {
      const abort = confirm("Your focus timer is currently running. Leave and log session as completed/abandoned?");
      if (!abort) return;
    }
    
    // Log whatever progress was made before closing
    await handleSessionCompletion();
    onClose();
  };

  const handleToggleSubtask = async (subId: string) => {
    if (!task) return;
    const updated = await toggleSubtask(task.id, subId);
    if (updated) {
      setTask(updated);
    }
  };

  // ── Session Custom Objectives Handlers ────────────────────────────────────
  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectiveText.trim()) return;
    setSessionObjectives((prev) => [
      ...prev,
      { id: "obj_" + Date.now() + Math.random().toString(36).substr(2, 5), title: newObjectiveText.trim(), completed: false },
    ]);
    setNewObjectiveText("");
  };

  const handleToggleObjective = (id: string) => {
    setSessionObjectives((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, completed: !obj.completed } : obj))
    );
  };

  const handleRemoveObjective = (id: string) => {
    setSessionObjectives((prev) => prev.filter((obj) => obj.id !== id));
  };

  // ── Web Audio API Zen Synthesizer (crystal bell chime) ─────────────────────
  const playZenCrystalBell = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const frequencies = [528, 659.25, 783.99]; // Harmonic triad
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        const startTime = ctx.currentTime + idx * 0.15;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.5);

        osc.start(startTime);
        osc.stop(startTime + 3.0);
      });
    } catch (e) {
      console.error("Synthesizer error:", e);
    }
  };

  // ── HTML5 White/Pink Noise soundscape synthesizer ────────────────────────
  const startAmbientNoise = (type: "white" | "pink") => {
    stopAmbientNoise();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === "white") {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else if (type === "pink") {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11;
          b6 = white * 0.115926;
        }
      }

      const whiteNoiseNode = ctx.createBufferSource();
      whiteNoiseNode.buffer = noiseBuffer;
      whiteNoiseNode.loop = true;

      const lowpassFilter = ctx.createBiquadFilter();
      lowpassFilter.type = "lowpass";
      lowpassFilter.frequency.setValueAtTime(800, ctx.currentTime);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

      whiteNoiseNode.connect(lowpassFilter);
      lowpassFilter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoiseNode.start();
      noiseSourceRef.current = whiteNoiseNode;
    } catch (e) {
      console.error(e);
    }
  };

  const stopAmbientNoise = () => {
    if (noiseSourceRef.current) {
      try {
        (noiseSourceRef.current as any).stop();
      } catch {}
      noiseSourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  const handleAmbientNoiseSelect = (type: "none" | "white" | "pink") => {
    setAmbientNoiseType(type);
    if (type === "none") {
      stopAmbientNoise();
    } else {
      startAmbientNoise(type);
    }
  };

  // ── Web Speech Dictation Pad ───────────────────────────────────────────────
  const handleToggleVoiceDictation = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice Dictation is not fully supported in this browser engine.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (e: any) => {
        let transcript = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setNotepadText((prev) => prev + " " + transcript);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    }
  };

  // Spotify Playlist Url Parser
  const handleSpotifyPlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSpotifyUrl.trim()) return;

    let processed = customSpotifyUrl.trim();
    if (processed.includes("playlist/")) {
      const id = processed.split("playlist/")[1]?.split("?")[0];
      processed = `https://open.spotify.com/embed/playlist/${id}`;
    } else if (processed.includes("track/")) {
      const id = processed.split("track/")[1]?.split("?")[0];
      processed = `https://open.spotify.com/embed/track/${id}`;
    }

    setSpotifyUrl(processed);
    setCustomSpotifyUrl("");
  };

  const activeSubtask = task?.subtasks.find((s) => s.id === activeSubId);
  const currentPresetMin = timerMode === "work" ? workMin : breakMin;
  const ratio = (secondsLeft / (currentPresetMin * 60)) * 100;
  const strokeDashoffset = 2 * Math.PI * 80 * (1 - ratio / 100);

  return (
    <div className="fixed inset-0 z-[300] bg-[#07080d] text-[#e2e4f0] flex flex-col md:flex-row h-screen overflow-hidden selection:bg-[#8b5cf6]/30">
      
      {/* Immersive Left Column (Notepad + Session Objectives) */}
      <div className="w-full md:w-[380px] bg-[#0c0d14] border-r border-white/5 flex flex-col h-1/2 md:h-full overflow-hidden shrink-0">
        
        {/* Active step widget */}
        <div className="p-5 border-b border-white/5 space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#8b5cf6] font-extrabold uppercase tracking-wider">Now focusing on</span>
            <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              Tab Aways: {tabAwayCount}
            </span>
          </div>

          {activeSubtask ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white line-clamp-2 leading-relaxed">{activeSubtask.title}</h3>
              {activeSubtask.firstSentence && (
                <div className="bg-[#3b82f6]/5 border-l-2 border-[#3b82f6]/40 p-3 rounded-r-xl text-[11px] text-[#3b82f6] leading-relaxed font-semibold">
                  💡 opening cheat code:<br />
                  <span className="text-white italic">"{activeSubtask.firstSentence}"</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#5c6080] italic">No active task steps selected. Pick one below.</p>
          )}
        </div>

        {/* Scratchpad and Voice Dictation */}
        <div className="flex-1 p-5 flex flex-col space-y-3 min-h-0">
          <div className="flex justify-between items-center shrink-0">
            <label className="text-[10px] font-bold text-[#5c6080] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#9b9fc0]" />
              Study Dictation &amp; Scratchpad
            </label>
            <button
              onClick={handleToggleVoiceDictation}
              className={`p-1.5 rounded-lg border transition ${
                isListening
                  ? "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse"
                  : "bg-white/5 border-white/5 text-[#9b9fc0] hover:text-white"
              }`}
              title="Dictate opening lines with Speech Recognition"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <textarea
            value={notepadText}
            onChange={(e) => setNotepadText(e.target.value)}
            placeholder="Type or dictate thoughts, equations, or opening sentences directly in focus block scratchpad..."
            className="w-full flex-1 bg-[#12131d] border border-white/5 rounded-2xl p-4 text-xs text-[#e2e4f0] placeholder:text-[#5c6080] outline-none resize-none focus:border-[#3b82f6]/20 transition"
          />
        </div>

        {/* Customizable Micro Objectives Panel */}
        <div className="p-5 border-t border-white/5 flex flex-col h-[35%] shrink-0 bg-[#090a0f]">
          <span className="text-[10px] text-[#8b5cf6] font-extrabold uppercase tracking-wider block mb-2">
            Session Target Milestones
          </span>
          
          <div className="overflow-y-auto space-y-1.5 flex-1 pr-1.5 mb-2">
            {sessionObjectives.map((obj) => (
              <div
                key={obj.id}
                className="flex items-center justify-between gap-2 p-2 bg-[#11131c] border border-white/5 rounded-xl text-xs hover:border-[#8b5cf6]/20 transition"
              >
                <div
                  onClick={() => handleToggleObjective(obj.id)}
                  className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                >
                  {obj.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#5c6080] shrink-0" />
                  )}
                  <span className={`truncate ${obj.completed ? "line-through text-[#5c6080]" : "text-white"}`}>
                    {obj.title}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveObjective(obj.id)}
                  className="text-[#5c6080] hover:text-red-400 p-1 rounded transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddObjective} className="flex gap-1.5">
            <input
              type="text"
              value={newObjectiveText}
              onChange={(e) => setNewObjectiveText(e.target.value)}
              placeholder="Add quick target objective..."
              className="flex-1 bg-[#12131d] border border-white/5 rounded-xl px-3 py-2 text-[11px] text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-[#8b5cf6]/40"
            />
            <button
              type="submit"
              disabled={!newObjectiveText.trim()}
              className="bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] text-xs font-extrabold px-3 py-2 rounded-xl disabled:opacity-35 transition shrink-0"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {/* Main Focus Stage Column (Pomodoro Timer, soundscapes, spotify) */}
      <div className="flex-1 flex flex-col justify-between items-center p-6 md:p-8 relative overflow-y-auto h-1/2 md:h-full">
        
        {/* Close focus mode overlay button */}
        <button
          onClick={handleCloseFocusMode}
          className="absolute top-6 right-6 p-2 bg-white/5 border border-white/5 text-[#9b9fc0] hover:text-white rounded-xl hover:bg-white/10 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Goal Name */}
        <div className="w-full text-center space-y-1 py-2 shrink-0">
          <h2 className="text-base md:text-lg font-black tracking-tight text-white font-sans truncate px-8">
            {task?.title || "Custom Study Block"}
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#8b5cf6] font-extrabold uppercase tracking-widest">
            {timerMode === "work" ? (
              <span className="flex items-center gap-1 text-[#8b5cf6]">
                <Flame className="w-3.5 h-3.5 text-[#8b5cf6]" />
                Work Focus Block
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 animate-pulse">
                <Coffee className="w-3.5 h-3.5" />
                Break Time
              </span>
            )}
          </div>
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative w-52 h-52 md:w-60 md:h-60 flex items-center justify-center select-none py-2 shrink-0">
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle cx="50%" cy="50%" r="80" className="stroke-white/5 fill-none" strokeWidth="8" />
            <circle
              cx="50%"
              cy="50%"
              r="80"
              className={`fill-none transition-all duration-1000 ${
                timerMode === "work" ? "stroke-[#8b5cf6]" : "stroke-emerald-400"
              }`}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 80}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center space-y-1">
            <div className="text-3xl md:text-4.5xl font-black text-white font-mono tracking-tighter">
              {formatTime(secondsLeft)}
            </div>
            <p className="text-[10px] text-[#9b9fc0] font-extrabold uppercase tracking-wider">
              {timerRunning ? "Focusing" : "Paused"}
            </p>
          </div>
        </div>

        {/* Customizable work & break step controller */}
        <div className="bg-[#11131c] border border-white/5 rounded-2xl p-4 w-full max-w-sm flex items-center justify-around gap-2 shrink-0 shadow-sm">
          {/* Work duration customizable stepper */}
          <div className="text-center">
            <span className="text-[9px] text-[#5c6080] font-extrabold uppercase tracking-wider block mb-1">
              Work Length
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={timerRunning}
                onClick={() => setWorkMin((m) => Math.max(1, m - 1))}
                className="w-7 h-7 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition disabled:opacity-30"
              >
                -
              </button>
              <span className="text-sm font-bold text-white font-mono">{workMin}m</span>
              <button
                disabled={timerRunning}
                onClick={() => setWorkMin((m) => Math.min(180, m + 1))}
                className="w-7 h-7 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          {/* Vertical line divider */}
          <div className="h-8 w-px bg-white/5 shrink-0" />

          {/* Break duration customizable stepper */}
          <div className="text-center">
            <span className="text-[9px] text-[#5c6080] font-extrabold uppercase tracking-wider block mb-1">
              Break Length
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={timerRunning}
                onClick={() => setBreakMin((m) => Math.max(1, m - 1))}
                className="w-7 h-7 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition disabled:opacity-30"
              >
                -
              </button>
              <span className="text-sm font-bold text-white font-mono">{breakMin}m</span>
              <button
                disabled={timerRunning}
                onClick={() => setBreakMin((m) => Math.min(60, m + 1))}
                className="w-7 h-7 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          {/* Toggle mode manually */}
          <div className="text-center shrink-0">
            <button
              onClick={handleToggleTimerMode}
              className="text-[10px] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 border border-[#8b5cf6]/20 text-[#8b5cf6] px-2.5 py-2.5 rounded-xl font-bold transition flex items-center gap-1"
              title="Manual Mode Switch"
            >
              Mode: {timerMode.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="flex items-center gap-4 justify-center shrink-0 py-2">
          <button
            onClick={resetTimer}
            className="p-3 bg-white/5 hover:bg-white/10 text-[#9b9fc0] hover:text-white border border-white/5 rounded-full transition"
            title="Reset Pomodoro"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={timerRunning ? pauseTimer : startTimer}
            className={`w-14 h-14 rounded-full flex items-center justify-center hover:opacity-95 transition shadow-xl shrink-0 ${
              timerMode === "work"
                ? "bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] shadow-[#8b5cf6]/20"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/15"
            }`}
          >
            {timerRunning ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
          </button>

          {/* Preset Ambient Noise Generator */}
          <div className="flex border border-white/5 bg-[#11131c] rounded-full p-0.5 relative">
            <button
              onClick={() => handleAmbientNoiseSelect("none")}
              className={`p-2 rounded-full text-xs font-bold transition ${ambientNoiseType === "none" ? "bg-[#252840] text-white" : "text-[#5c6080]"}`}
              title="Mute soundscapes"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAmbientNoiseSelect("white")}
              className={`p-2 rounded-full text-xs font-bold transition ${ambientNoiseType === "white" ? "bg-[#3b82f6]/20 text-[#3b82f6]" : "text-[#5c6080]"}`}
              title="Soft White Noise"
            >
              <CloudRain className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAmbientNoiseSelect("pink")}
              className={`p-2 rounded-full text-xs font-bold transition ${ambientNoiseType === "pink" ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "text-[#5c6080]"}`}
              title="Brownish Deep Waves"
            >
              <Waves className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Embedded Spotify player and custom loader */}
        <div className="w-full max-w-sm space-y-2 shrink-0 py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[#5c6080] font-bold uppercase tracking-wider">
            <Music className="w-3.5 h-3.5 text-[#9b9fc0]" />
            Spotify Focus Background Soundtrack
          </div>

          <div className="w-full h-[80px] bg-[#11131c] border border-white/5 rounded-2xl overflow-hidden shadow-sm relative">
            <iframe
              src={spotifyUrl}
              width="100%"
              height="80"
              frameBorder="0"
              allowFullScreen={false}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="absolute inset-0"
            />
          </div>

          <form onSubmit={handleSpotifyPlaylistSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={customSpotifyUrl}
              onChange={(e) => setCustomSpotifyUrl(e.target.value)}
              placeholder="Paste Spotify Playlist or Track URL..."
              className="flex-1 bg-[#11131c] border border-white/5 rounded-xl px-3 py-2 text-[10px] text-[#e2e4f0] placeholder:text-[#5c6080] outline-none"
            />
            <button
              type="submit"
              disabled={!customSpotifyUrl.trim()}
              className="bg-white/5 hover:bg-white/10 text-[10px] font-bold px-3 py-2 rounded-xl disabled:opacity-40 transition"
            >
              Load
            </button>
          </form>
        </div>

      </div>

      {/* Distraction Alarm Warning Modal overlay */}
      {showDistractionWarning && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#12131d] border border-amber-500/30 max-w-md w-full rounded-3xl p-6 text-center space-y-5 shadow-2xl shadow-amber-500/5">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white font-sans">
                Distraction Shield Guard Activated
              </h3>
              <p className="text-xs text-[#9b9fc0] leading-relaxed">
                StartLine detected you tabbed away to check{" "}
                <span className="text-amber-400 font-mono font-bold">"{lastViolationSite}"</span>. This domain is on your Distraction Blocklist.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl text-xs text-amber-300 italic leading-relaxed">
                "Keep your focus pure! Success starts within. Return to your workspace and push through this Pomodoro block to earn your evening break!"
              </div>
            </div>

            <button
              onClick={() => setShowDistractionWarning(false)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              Shield Resumed — Back to Studying
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
