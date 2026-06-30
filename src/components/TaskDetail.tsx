import React, { useState, useEffect } from "react";
import { Task, Subtask } from "../types";
import {
  getTask,
  updateTask,
  toggleSubtask,
  addSubtask,
  deleteTask,
  runPlannerAgent,
  runMonitoringAgent,
  getStudent,
} from "../lib/api";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Minimize2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  BookmarkCheck,
  Circle,
  CheckCircle2,
  Play,
  RotateCcw,
} from "lucide-react";

interface TaskDetailProps {
  taskId: string;
  onBack: () => void;
  onOpenFocusMode: (taskId: string, subtaskId?: string) => void;
}

export default function TaskDetail({ taskId, onBack, onOpenFocusMode }: TaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [newStepTitle, setNewSubtaskTitle] = useState<string>("");
  const [newStepMin, setNewSubtaskMin] = useState<number>(30);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = () => {
    const t = getTask(taskId);
    setTask(t);
    if (t) {
      // Pre-fill reschedule date
      const iso = new Date(t.deadline).toISOString().split("T")[0];
      setRescheduleDate(iso);
    }
  };

  const handleToggleStep = async (subtaskId: string) => {
    if (!task) return;
    const updated = await toggleSubtask(task.id, subtaskId);
    if (updated) {
      setTask(updated);
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newStepTitle.trim()) return;

    const updated = await addSubtask(task.id, newStepTitle.trim(), newStepMin);
    if (updated) {
      setTask(updated);
      setNewSubtaskTitle("");
      setNewSubtaskMin(30);
    }
  };

  const handleRunPlanner = async () => {
    if (!task) return;
    setIsPlanning(true);
    try {
      const updated = await runPlannerAgent(task.id);
      if (updated) setTask(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!task || !rescheduleDate) return;
    const parsed = new Date(rescheduleDate + "T12:00:00");
    if (isNaN(parsed.getTime())) {
      alert("Invalid date selection.");
      return;
    }

    const updated = await updateTask(task.id, {
      deadline: parsed.toISOString(),
      rescheduleCount: (task.rescheduleCount || 0) + 1,
    });
    if (updated) {
      setTask(updated);
      setIsRescheduling(false);
      // Run risk assessment immediately to calibrate priorityScore
      await runMonitoringAgent(task.id);
      loadTaskData();
    }
  };

  const handleToggleGoodEnough = async () => {
    if (!task) return;
    const val = !task.goodEnough;
    const updated = await updateTask(task.id, { goodEnough: val });
    if (updated) setTask(updated);
  };

  const handleShrinkStep = async (sub: Subtask) => {
    if (!task) return;
    const student = getStudent();

    // Create a new microscopic 5-minute task directly above the target step
    const microTitle = `Spend 5 mins on: ${sub.title.slice(0, 30)}... (no quality expectations)`;
    const microSubtask: Subtask = {
      id: "s_micro_" + Date.now(),
      title: microTitle,
      estMinutes: 5,
      firstSentence: `Read just the very first sentence or opening bullet of "${sub.title}" and close it.`,
      status: "pending",
      startedAt: null,
      completedAt: null,
    };

    // Inject micro task at the top of the incomplete list
    const subtasks = [microSubtask, ...(task.subtasks || [])];
    const updated = await updateTask(task.id, {
      subtasks,
      completionPercent: Math.round((subtasks.filter((s) => s.status === "done").length / subtasks.length) * 100),
    });

    if (updated) {
      setTask(updated);
      alert("✂️ Step shrunk! Created a low-friction 5-minute micro-start version at the top of your checklist.");
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (confirm(`Delete "${task.title}" and purge all related logs?`)) {
      await deleteTask(task.id);
      onBack();
    }
  };

  if (!task) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <p className="text-[#9b9fc0]">Study task not found.</p>
        <button onClick={onBack} className="text-[#3b82f6] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const daysLeft = Math.round((new Date(task.deadline).getTime() - Date.now()) / 86400000);
  const isCritical = task.state === "CRITICAL";

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-3xl mx-auto selection:bg-[#8b5cf6]/30">
      
      {/* Back button header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#9b9fc0] hover:text-white font-bold uppercase tracking-wider transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Goals
      </button>

      {/* Main detail card */}
      <div className="bg-[#11131c] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden shadow-2xl">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                task.state === "CRITICAL"
                  ? "bg-red-500/10 text-red-400"
                  : task.state === "AT_RISK"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}>
                {task.state}
              </span>
              <span className="text-[10px] bg-[#252840] text-indigo-300 font-bold px-2.5 py-0.5 rounded-full uppercase">
                {task.category}
              </span>
              <span className="text-xs text-[#9b9fc0] font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {task.gradeWeight}% of grade
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-white font-sans leading-tight">
              {task.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-xs text-[#9b9fc0]">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-4 h-4 text-[#5c6080]" />
                Due {new Date(task.deadline).toLocaleDateString([], { dateStyle: "medium" })}
                <span className={`font-bold ml-1 ${daysLeft < 2 ? "text-red-400" : daysLeft < 5 ? "text-amber-400" : "text-[#9b9fc0]"}`}>
                  ({daysLeft} days remaining)
                </span>
              </span>
              {task.rescheduleCount > 0 && (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  🔄 Rescheduled {task.rescheduleCount}×
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsRescheduling(!isRescheduling)}
              className="bg-white/5 hover:bg-white/10 text-[#e2e4f0] text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              📅 Reschedule
            </button>
            <button
              onClick={handleDeleteTask}
              className="bg-red-500/10 hover:bg-red-500/15 text-red-400 p-2.5 rounded-xl transition"
              title="Delete task"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Rescheduling Form Panel */}
        {isRescheduling && (
          <div className="bg-[#161822] border border-white/5 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold text-[#9b9fc0] uppercase tracking-wider block">Set New Due Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="flex-1 bg-[#252840] border border-white/5 rounded-xl px-3.5 py-2 text-xs text-[#e2e4f0] outline-none"
              />
              <button
                onClick={handleRescheduleSubmit}
                className="bg-[#8b5cf6] text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition"
              >
                Apply
              </button>
              <button
                onClick={() => setIsRescheduling(false)}
                className="bg-white/5 text-[#9b9fc0] text-xs font-bold px-3 py-2 rounded-xl hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#9b9fc0] font-medium">
            <span>Progress through study curriculum</span>
            <span>{task.completionPercent}%</span>
          </div>
          <div className="h-2 w-full bg-[#1c1e2e] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-full transition-all duration-500"
              style={{ width: `${task.completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-[#5c6080] uppercase tracking-wider flex items-center gap-1.5">
            <BookmarkCheck className="w-4 h-4" />
            Decomposed Study Checklist ({task.subtasks?.length || 0})
          </h3>
          <button
            onClick={handleRunPlanner}
            disabled={isPlanning}
            className="text-xs text-[#8b5cf6] hover:text-[#a78bfa] font-bold flex items-center gap-1 disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            {isPlanning ? "Re-planning curriculum..." : "🤖 Decompose with Agent"}
          </button>
        </div>

        {/* List of subtasks */}
        <div className="space-y-3">
          {task.subtasks && task.subtasks.length > 0 ? (
            task.subtasks.map((sub) => {
              const isDone = sub.status === "done";
              return (
                <div
                  key={sub.id}
                  className={`bg-[#11131c] border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isDone ? "border-white/5 opacity-60" : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      onClick={() => handleToggleStep(sub.id)}
                      className="text-[#9b9fc0] hover:text-[#8b5cf6] transition shrink-0 mt-0.5"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5.5 h-5.5 text-emerald-400 fill-emerald-400/10" />
                      ) : (
                        <Circle className="w-5.5 h-5.5" />
                      )}
                    </button>
                    <div className="space-y-1.5 min-w-0">
                      <span className={`text-sm font-semibold leading-normal text-white ${isDone ? "line-through text-[#5c6080]" : ""}`}>
                        {sub.title}
                      </span>
                      
                      {/* First Sentence cheat code */}
                      {!isDone && sub.firstSentence && (
                        <p className="text-xs text-[#3b82f6]/95 italic font-medium leading-relaxed bg-[#3b82f6]/5 border-l-2 border-[#3b82f6]/30 px-3 py-1.5 rounded-r-lg">
                          💬 {sub.firstSentence}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-[#5c6080] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {sub.estMinutes} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for steps */}
                  {!isDone && (
                    <div className="flex gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => handleShrinkStep(sub)}
                        className="bg-white/5 hover:bg-white/10 text-[#9b9fc0] hover:text-white text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1"
                        title="Too intimidating? shrink this step into a 5-minute microscopic version."
                      >
                        <Minimize2 className="w-3.5 h-3.5 text-[#8b5cf6]" />
                        Shrink
                      </button>
                      <button
                        onClick={() => onOpenFocusMode(task.id, sub.id)}
                        className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Focus
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-[#11131c] border border-dashed border-white/5 rounded-3xl p-8 text-center text-[#5c6080] text-xs font-semibold space-y-3">
              <p>Checklist empty. Let our Planner Agent decompose this goal automatically.</p>
              <button
                onClick={handleRunPlanner}
                className="bg-white/5 text-[#9b9fc0] hover:text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/5"
              >
                🤖 Generate Steps
              </button>
            </div>
          )}
        </div>

        {/* Manual Step Adding form */}
        <form onSubmit={handleAddStep} className="bg-[#11131c] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newStepTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            placeholder="Manually add custom study step..."
            className="flex-1 bg-[#161822] border border-white/5 rounded-xl px-4 py-3 text-xs text-[#e2e4f0] outline-none focus:border-[#3b82f6]/40 transition"
          />
          <div className="flex gap-2 shrink-0">
            <select
              value={newStepMin}
              onChange={(e) => setNewSubtaskMin(parseInt(e.target.value))}
              className="bg-[#161822] border border-white/5 rounded-xl px-3 text-xs text-[#9b9fc0] outline-none"
            >
              {[15, 25, 40, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} Min
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newStepTitle.trim()}
              className="bg-white/5 hover:bg-white/10 text-white font-bold p-3 rounded-xl disabled:opacity-40 transition"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Good Enough Mode Toggle */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-white leading-normal">Good Enough Mode</h4>
          <p className="text-xs text-[#9b9fc0] leading-relaxed">
            Low stakes assignment? Skip the meticulous academic workflow — condense the goal into a single focused block.
          </p>
        </div>
        <button onClick={handleToggleGoodEnough} className="text-[#8b5cf6] transition shrink-0">
          {task.goodEnough ? (
            <ToggleRight className="w-12 h-12 text-[#8b5cf6] fill-[#8b5cf6]/10" />
          ) : (
            <ToggleLeft className="w-12 h-12 text-[#5c6080]" />
          )}
        </button>
      </div>

    </div>
  );
}
