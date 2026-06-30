import React, { useState, useEffect } from "react";
import { Student, BehaviorLog } from "../types";
import { getStudent, getBehaviors, getStartStreak, saveStudent } from "../lib/api";
import { Flame, CheckCircle, Award, Target, HelpCircle, Check, Play } from "lucide-react";

export default function HabitsTracker() {
  const [student, setStudent] = useState<Student | null>(null);
  const [behaviors, setBehaviors] = useState<BehaviorLog[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [weeklyGoalInput, setWeeklyGoalInput] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setStudent(getStudent());
    setBehaviors(getBehaviors());
    setStreak(getStartStreak());
  };

  const handleSetWeeklyGoal = async () => {
    if (!student || !weeklyGoalInput.trim()) return;
    const updated = {
      ...student,
      weeklyGoal: weeklyGoalInput.trim(),
      weeklyGoalSet: Date.now(),
    };
    setStudent(updated);
    await saveStudent(updated);
    setWeeklyGoalInput("");
    loadData();
  };

  const handleClearGoal = async () => {
    if (!student) return;
    const updated = {
      ...student,
      weeklyGoal: null,
      weeklyGoalSet: null,
    };
    setStudent(updated);
    await saveStudent(updated);
    loadData();
  };

  // Generate 21-day start latency calendar data
  const renderCalendar = () => {
    const cells = [];
    const now = Date.now();
    const dayMs = 86400000;

    for (let i = 20; i >= 0; i--) {
      const targetDate = new Date(now - i * dayMs);
      targetDate.setHours(0, 0, 0, 0);
      const startRange = targetDate.getTime();
      const endRange = startRange + dayMs;

      // Filter behavior logs for this specific day
      const dayLogs = behaviors.filter((b) => {
        const t = new Date(b.timestamp).getTime();
        return t >= startRange && t < endRange;
      });

      // Find if we had any on-time starts (latency <= 300s/5mins)
      const onTimeStarts = dayLogs.filter((b) => !b.abandoned && b.startLatency <= 300);
      const totalStarts = dayLogs.length;

      let cellColorClass = "bg-[#161822] border-white/5";
      let title = `${targetDate.toLocaleDateString([], { month: "short", day: "numeric" })}: No sessions logged.`;

      if (totalStarts > 0) {
        if (onTimeStarts.length === totalStarts) {
          cellColorClass = "bg-[#10b981]/25 border-[#10b981]/40 text-[#10b981]";
          title = `${targetDate.toLocaleDateString([], { month: "short", day: "numeric" })}: ${onTimeStarts.length}/${totalStarts} starts were on-time (streak maintained!).`;
        } else if (onTimeStarts.length > 0) {
          cellColorClass = "bg-[#f59e0b]/20 border-[#f59e0b]/35 text-[#f59e0b]";
          title = `${targetDate.toLocaleDateString([], { month: "short", day: "numeric" })}: ${onTimeStarts.length}/${totalStarts} starts on-time (partial).`;
        } else {
          cellColorClass = "bg-[#ef4444]/15 border-[#ef4444]/25 text-[#ef4444]";
          title = `${targetDate.toLocaleDateString([], { month: "short", day: "numeric" })}: All sessions were delayed.`;
        }
      }

      cells.push(
        <div
          key={i}
          className={`aspect-square w-full rounded-xl border flex items-center justify-center text-xs font-bold font-mono transition-all ${cellColorClass}`}
          title={title}
        >
          {targetDate.getDate()}
        </div>
      );
    }
    return cells;
  };

  // Compute stats on obstacles
  const getObstacleStats = () => {
    const counts: Record<string, { total: number; onTime: number }> = {
      ambiguity: { total: 0, onTime: 0 },
      fear_of_failure: { total: 0, onTime: 0 },
      task_aversiveness: { total: 0, onTime: 0 },
      time_estimation: { total: 0, onTime: 0 },
    };

    // Aggregate stats from behavior logs
    behaviors.forEach((b) => {
      // Find what obstacle is mapped (we approximate using student diagnostic or preset)
      const obsType = student?.obstacleTypes?.[0] || "ambiguity";
      if (counts[obsType]) {
        counts[obsType].total++;
        if (!b.abandoned && b.startLatency <= 300) {
          counts[obsType].onTime++;
        }
      }
    });

    return Object.entries(counts).map(([type, stats]) => {
      const percentage = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 100;
      return { type, percentage, total: stats.total };
    });
  };

  const OBSTACLE_LABELS: Record<string, { label: string; emoji: string; colorClass: string }> = {
    ambiguity: { label: "Ambiguity Clarification", emoji: "🌫️", colorClass: "bg-purple-500" },
    fear_of_failure: { label: "Draft Perfectionism", emoji: "🛡️", colorClass: "bg-blue-500" },
    task_aversiveness: { label: "Aversive Work Contracts", emoji: "🥱", colorClass: "bg-amber-500" },
    time_estimation: { label: "Temporal Accuracy", emoji: "⏱️", colorClass: "bg-emerald-500" },
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-4xl mx-auto selection:bg-[#8b5cf6]/30">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
          Habits &amp; Procrastination Calibration
        </h1>
        <p className="text-sm text-[#9b9fc0] mt-1">
          StartLine tracks your start latency, not just logs. High habit grades reflect starting inside your scheduled window.
        </p>
      </div>

      {/* Row of stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Flame className="w-6 h-6 text-orange-500 animate-pulse" />, value: `${streak} Days`, label: "Start Streak", sub: "Blocks started on-time" },
          { icon: <CheckCircle className="w-6 h-6 text-emerald-500" />, value: `${behaviors.length}`, label: "Total Sessions", sub: "Pomodoros completed" },
          { icon: <Award className="w-6 h-6 text-[#8b5cf6]" />, value: `${behaviors.filter(b => b.tabAwaySecs < 10 && !b.abandoned).length}`, label: "Pure Focus", sub: "Sessions with zero tab aways" },
        ].map((item, idx) => (
          <div key={idx} className="bg-[#11131c] border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-[#252840] rounded-xl shrink-0">
              {item.icon}
            </div>
            <div>
              <div className="text-xl font-extrabold text-white font-sans">{item.value}</div>
              <div className="text-xs font-bold text-[#9b9fc0] mt-0.5">{item.label}</div>
              <div className="text-[10px] text-[#5c6080] font-semibold uppercase mt-0.5">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Goal Set card */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Weekly Challenge Goal</h3>
        </div>

        {student?.weeklyGoal ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161822] border border-white/5 rounded-xl p-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white leading-normal">"{student.weeklyGoal}"</p>
              <p className="text-xs text-[#5c6080] font-medium">Set on {new Date(student.weeklyGoalSet || Date.now()).toLocaleDateString()}</p>
            </div>
            <button
              onClick={handleClearGoal}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/15 text-xs font-bold px-4 py-2 rounded-xl transition self-start sm:self-auto"
            >
              Reset Goal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#9b9fc0]">
              State one concrete, positive rule you want to maintain for yourself this week (e.g. "Take a 5-minute break every hour" or "Complete one block before noon").
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={weeklyGoalInput}
                onChange={(e) => setWeeklyGoalInput(e.target.value)}
                placeholder="e.g. Start all study blocks before 6:00 PM"
                className="flex-1 bg-[#161822] border border-white/5 rounded-xl px-4 py-3 text-sm text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-[#3b82f6]/40 focus:ring-4 focus:ring-[#3b82f6]/10 transition"
              />
              <button
                onClick={handleSetWeeklyGoal}
                disabled={!weeklyGoalInput.trim()}
                className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-bold px-5 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-40"
              >
                Establish Challenge
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 21-Day Contribution Start Grid */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">21-Day Latency Calendar</h3>
          <div className="flex gap-4 text-[10px] text-[#5c6080] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]/25 border border-[#10b981]/40" />
              On-time Start
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]/20 border border-[#f59e0b]/35" />
              Delayed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]/15 border border-[#ef4444]/25" />
              Missed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
            <div key={idx} className="text-center text-[10px] text-[#5c6080] font-bold">
              {day}
            </div>
          ))}
          {renderCalendar()}
        </div>
        <p className="text-[10px] text-[#5c6080] leading-normal font-semibold">
          💡 latency is calculated between opening an study block and starting the focus timer. Getting to work inside of 5 minutes locks in the green contribution index.
        </p>
      </div>

      {/* Obstacle Stats Progress */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Success Rates by Obstacle Type</h3>
        <div className="space-y-4">
          {getObstacleStats().map(({ type, percentage, total }) => {
            const meta = OBSTACLE_LABELS[type] || { label: type, emoji: "🎓", colorClass: "bg-indigo-500" };
            return (
              <div key={type} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-[#e2e4f0] flex items-center gap-1.5">
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                    <span className="text-[10px] text-[#5c6080] font-bold">({total} attempts)</span>
                  </span>
                  <span className="text-white font-bold">{percentage}%</span>
                </div>
                <div className="h-2 w-full bg-[#161822] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${meta.colorClass}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
