import React, { useState, useEffect } from "react";
import { Student, Task, PendingAction } from "../types";
import {
  getTasks,
  getStudent,
  generateDailyDigest,
  runMonitoringAgent,
  deleteTask,
  getSettings,
} from "../lib/api";
import {
  Sparkles,
  AlertCircle,
  Calendar,
  Clock,
  ChevronRight,
  TrendingUp,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

interface DashboardProps {
  onOpenTask: (taskId: string) => void;
  onOpenFocusMode: (taskId: string, subtaskId?: string) => void;
  onAddTaskClick: () => void;
}

export default function Dashboard({ onOpenTask, onOpenFocusMode, onAddTaskClick }: DashboardProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [digest, setDigest] = useState<string>("Generating personalized advice...");
  const [loadingDigest, setLoadingDigest] = useState<boolean>(true);
  const [agentRunningMap, setAgentRunningMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = getStudent();
    const t = getTasks().sort((a, b) => b.priorityScore - a.priorityScore);
    setStudent(s);
    setTasks(t);

    // Fetch dynamic daily digest from server
    setLoadingDigest(true);
    try {
      const d = await generateDailyDigest();
      setDigest(d);
    } catch (e) {
      setDigest("Focus on completing steps today to maintain your streak.");
    } finally {
      setLoadingDigest(false);
    }
  };

  // Run real-time monitoring agent
  const handleRunAgent = async (taskId: string) => {
    setAgentRunningMap((prev) => ({ ...prev, [taskId]: true }));
    try {
      await runMonitoringAgent(taskId);
      loadData(); // reload tasks with fresh score/risk/actions
    } catch (e) {
      console.error(e);
    } finally {
      setAgentRunningMap((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleApproveEmail = (action: PendingAction, taskId: string) => {
    navigator.clipboard.writeText(action.data.body || "");
    alert("📋 Drafted email copied to clipboard! Paste it in your mail client to send.");
    dismissAction(action.id, taskId);
  };

  const handleApproveCalendarHold = (action: PendingAction, taskId: string) => {
    const d = action.data;
    const start = new Date(d.start_time);
    const end = new Date(start.getTime() + (d.duration_min || 120) * 60000);

    // Timezone-safe UTC date format YYYYMMDDTHHMMSSZ
    const startUTC = start.toISOString().split(".")[0].replace(/[-:]/g, "") + "Z";
    const endUTC = end.toISOString().split(".")[0].replace(/[-:]/g, "") + "Z";

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      d.title || "Catch-up block"
    )}&dates=${startUTC}/${endUTC}&details=${encodeURIComponent(
      "Emergency catch-up study block scheduled by StartLine study agent."
    )}`;

    window.open(gcalUrl, "_blank");
    dismissAction(action.id, taskId);
  };

  const dismissAction = async (actionId: string, taskId: string) => {
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          pendingActions: t.pendingActions.filter((a) => a.id !== actionId),
        };
      }
      return t;
    });
    setTasks(updatedTasks);
    // Persist
    const tToSave = updatedTasks.find((t) => t.id === taskId);
    if (tToSave) {
      const allTasks = getTasks().map((t) => (t.id === taskId ? tToSave : t));
      localStorage.setItem("sl_tasks", JSON.stringify(allTasks));
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this study block?")) {
      await deleteTask(id);
      loadData();
    }
  };

  // Obstacle configurations helper
  const OBSTACLE_METAS: Record<string, { label: string; emoji: string; text: string; bg: string; border: string }> = {
    ambiguity: {
      label: "Task Ambiguity",
      emoji: "🌫️",
      text: "The instructions feel fuzzy. Let's fix that by opening only the first step.",
      bg: "bg-purple-500/5",
      border: "border-purple-500/20",
    },
    fear_of_failure: {
      label: "Fear of Failure",
      emoji: "🛡️",
      text: "Writing a 'terrible rough draft' is allowed and encouraged here. Let's get something down.",
      bg: "bg-blue-500/5",
      border: "border-blue-500/20",
    },
    task_aversiveness: {
      label: "Task Aversiveness",
      emoji: "🥱",
      text: "This block feels boring. Let's do a 15-minute quick contract, then claim your reward.",
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
    },
    time_estimation: {
      label: "Time Distortion",
      emoji: "⏱️",
      text: "Time is slippery. Let's look at the AI calibrated estimates instead of guessing.",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
    },
  };

  const firstTask = tasks[0];
  const primaryObstacle = student?.obstacleTypes?.[0] || "ambiguity";
  const obstacleMeta = OBSTACLE_METAS[primaryObstacle] || OBSTACLE_METAS.ambiguity;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-5xl mx-auto selection:bg-[#8b5cf6]/30">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
            Good morning, {student?.name || "Scholar"} 👋
          </h1>
          <p className="text-sm text-[#9b9fc0] mt-1">
            You have <span className="text-white font-semibold">{tasks.length} active</span> study goals. Let's start with high impact.
          </p>
        </div>
        <button
          onClick={onAddTaskClick}
          className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition shadow-lg shadow-[#8b5cf6]/10 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          Add Study Goal
        </button>
      </div>

      {/* Daily AI-Digest banner */}
      <div className="bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border border-[#8b5cf6]/10 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2.5 bg-[#8b5cf6]/15 rounded-xl text-[#8b5cf6] shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-[#8b5cf6] tracking-wider uppercase">Active Study Assistant Guidance</h2>
          {loadingDigest ? (
            <div className="flex items-center gap-2 py-1">
              <div className="w-4 h-4 border-2 border-t-transparent border-[#8b5cf6] rounded-full animate-spin" />
              <p className="text-sm text-[#9b9fc0] italic">Generating personalized study pathways...</p>
            </div>
          ) : (
            <p className="text-sm text-[#9b9fc0] leading-relaxed font-medium">{digest}</p>
          )}
        </div>
      </div>

      {/* Pending Actions approvals section */}
      {tasks.some((t) => t.pendingActions && t.pendingActions.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#5c6080] uppercase tracking-wider">Awaiting Approved Intervention</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.flatMap((t) =>
              (t.pendingActions || []).map((action) => (
                <div key={action.id} className="bg-[#161822] border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-white/10 transition">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-[#252840] rounded-xl text-[#e2e4f0] shrink-0">
                      {action.type === "email" ? <Clock className="w-5 h-5 text-indigo-400" /> : <Calendar className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{action.title}</h4>
                      <p className="text-xs text-[#9b9fc0] leading-relaxed">{action.desc}</p>
                      <p className="text-[10px] text-[#5c6080] font-semibold uppercase">{t.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {action.type === "email" ? (
                      <button
                        onClick={() => handleApproveEmail(action, t.id)}
                        className="flex-1 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 text-xs font-bold py-2 rounded-lg hover:bg-[#8b5cf6]/15 transition"
                      >
                        ✓ Copy Email
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApproveCalendarHold(action, t.id)}
                        className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold py-2 rounded-lg hover:bg-amber-500/15 transition"
                      >
                        ✓ Add Calendar
                      </button>
                    )}
                    <button
                      onClick={() => dismissAction(action.id, t.id)}
                      className="bg-white/5 text-[#9b9fc0] text-xs font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Two-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Top priority */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-[#5c6080] uppercase tracking-wider">Top Priority Block</h3>
          {firstTask ? (
            <div className="bg-[#11131c] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden shadow-2xl">
              {/* Highlight header */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]" />

              <div className="flex justify-between items-start gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      firstTask.state === "CRITICAL"
                        ? "bg-red-500/10 text-red-400"
                        : firstTask.state === "AT_RISK"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {firstTask.state.replace("_", " ")}
                    </span>
                    <span className="text-[10px] bg-[#252840] text-[#9b9fc0] font-bold px-2 py-0.5 rounded-full uppercase">
                      {firstTask.category}
                    </span>
                    <span className="text-xs text-[#9b9fc0] font-medium flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {firstTask.gradeWeight}% of grade
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-black text-white font-sans leading-tight">
                    {firstTask.title}
                  </h2>

                  <p className="text-xs text-[#9b9fc0] font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#5c6080]" />
                    Due on {new Date(firstTask.deadline).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                {/* Priority Progress SVG Ring */}
                <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="30" className="stroke-white/5 fill-none" strokeWidth="5" />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="30"
                      className={`fill-none transition-all duration-1000 ${
                        firstTask.state === "CRITICAL"
                          ? "stroke-red-500"
                          : firstTask.state === "AT_RISK"
                          ? "stroke-amber-500"
                          : "stroke-emerald-500"
                      }`}
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 30}
                      strokeDashoffset={2 * Math.PI * 30 * (1 - firstTask.priorityScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-lg md:text-xl font-extrabold text-white">{firstTask.priorityScore}</span>
                    <span className="text-[8px] text-[#5c6080] font-bold uppercase tracking-wider">Score</span>
                  </div>
                </div>
              </div>

              {/* Matched Procrastination Response Card */}
              <div className={`p-4 rounded-2xl border ${obstacleMeta.bg} ${obstacleMeta.border} space-y-2`}>
                <div className="flex items-center gap-2 text-[#e2e4f0] font-bold text-sm">
                  <span>{obstacleMeta.emoji}</span>
                  <span>Matched Cue-Response Plan</span>
                </div>
                <p className="text-xs text-[#9b9fc0] leading-relaxed">{obstacleMeta.text}</p>
              </div>

              {/* Progress Bar */}
              {firstTask.subtasks && firstTask.subtasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#9b9fc0] font-medium">
                    <span>Checklist items completed</span>
                    <span>{firstTask.completionPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#1c1e2e] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full transition-all duration-500"
                      style={{ width: `${firstTask.completionPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => onOpenTask(firstTask.id)}
                  className="bg-[#252840] text-white hover:bg-[#2e314d] text-xs font-bold px-4 py-3 rounded-xl transition"
                >
                  Configure &amp; Edit Checklist
                </button>
                {firstTask.subtasks && firstTask.subtasks.some((s) => s.status === "pending") ? (
                  <button
                    onClick={() => {
                      const nextStep = firstTask.subtasks.find((s) => s.status === "pending");
                      onOpenFocusMode(firstTask.id, nextStep?.id);
                    }}
                    className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-1.5 hover:opacity-90 transition"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Pomodoro Focus
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenFocusMode(firstTask.id)}
                    className="bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 text-xs font-bold px-5 py-3 rounded-xl hover:bg-[#3b82f6]/15 transition"
                  >
                    Open Immersive Timer
                  </button>
                )}
                <button
                  onClick={() => handleRunAgent(firstTask.id)}
                  disabled={agentRunningMap[firstTask.id]}
                  className="border border-[#5c6080]/30 hover:border-white/20 text-[#9b9fc0] text-xs font-bold px-4 py-3 rounded-xl hover:text-white transition disabled:opacity-40"
                >
                  {agentRunningMap[firstTask.id] ? "Running check..." : "🤖 Run Agent Audit"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#11131c] border border-white/5 rounded-3xl p-10 text-center space-y-4 shadow-sm">
              <span className="text-4xl">✨</span>
              <div className="space-y-1">
                <h4 className="font-extrabold text-white text-lg font-sans">All study items on track.</h4>
                <p className="text-sm text-[#9b9fc0] max-w-sm mx-auto">
                  Excellent work. There are currently no high-urgency goals configured. Add a task or enjoy your evening block.
                </p>
              </div>
              <button
                onClick={onAddTaskClick}
                className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition mx-auto"
              >
                + Add Goal Block
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Other Active Study Blocks */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#5c6080] uppercase tracking-wider">Other Study Items ({tasks.length - 1})</h3>
          <div className="space-y-3.5">
            {tasks.slice(1).map((task) => (
              <div
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="bg-[#161822] border border-white/5 hover:border-white/10 rounded-2xl p-4.5 flex justify-between items-center gap-4 cursor-pointer hover:bg-[#1a1c27] transition shadow-sm"
              >
                <div className="min-w-0 space-y-1.5">
                  <h4 className="text-sm font-bold text-white leading-normal truncate">{task.title}</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      task.state === "CRITICAL"
                        ? "bg-red-500/10 text-red-400"
                        : task.state === "AT_RISK"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {task.state}
                    </span>
                    <span className="text-[10px] text-[#9b9fc0] font-medium uppercase">{task.category}</span>
                    <span className="text-[10px] text-[#5c6080] font-bold flex items-center gap-0.5">
                      {task.completionPercent}% complete
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-white">{task.priorityScore}</div>
                    <div className="text-[8px] text-[#5c6080] uppercase tracking-wider font-bold">Score</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#5c6080]" />
                </div>
              </div>
            ))}

            {tasks.length <= 1 && (
              <div className="border border-dashed border-white/5 rounded-2xl p-6 text-center text-[#5c6080] text-xs font-medium">
                No secondary active blocks.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
