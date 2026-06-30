import React, { useState, useEffect } from "react";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import HabitsTracker from "./components/HabitsTracker";
import AgentLogView from "./components/AgentLog";
import TaskDetail from "./components/TaskDetail";
import FocusMode from "./components/FocusMode";
import SettingsView from "./components/Settings";
import NotebookLM from "./components/NotebookLM";
import { getStudent, getStartStreak, addTask, runPlannerAgent } from "./lib/api";
import { Student } from "./types";
import {
  Sparkles,
  LayoutDashboard,
  CalendarCheck,
  Bot,
  Settings as SettingsIcon,
  Flame,
  Plus,
  X,
  TrendingUp,
  Clock,
  Menu,
} from "lucide-react";

export default function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<"dashboard" | "habits" | "notebook" | "logs" | "settings" | "task-detail">("dashboard");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  
  // Immersive Focus Mode Trigger
  const [focusModeTask, setFocusModeTask] = useState<{ taskId: string; subtaskId?: string } | null>(null);
  
  // Add Goal Modal State
  const [showAddGoalModal, setShowAddGoalModal] = useState<boolean>(false);
  const [newGoalTitle, setNewGoalTitle] = useState<string>("");
  const [newGoalCategory, setNewGoalCategory] = useState<string>("Assignment");
  const [newGoalWeight, setNewGoalWeight] = useState<number>(15);
  const [newGoalDeadline, setNewGoalDeadline] = useState<string>("");
  const [isSubmittingGoal, setIsSubmittingGoal] = useState<boolean>(false);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const s = getStudent();
    setStudent(s);
    if (s && s.onboardingComplete) {
      setOnboardingComplete(true);
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    loadProfile();
    setCurrentView("dashboard");
  };

  const handleOpenTask = (taskId: string) => {
    setActiveTaskId(taskId);
    setCurrentView("task-detail");
  };

  const handleOpenFocusMode = (taskId: string, subtaskId?: string) => {
    setFocusModeTask({ taskId, subtaskId });
  };

  const handleCloseFocusMode = () => {
    setFocusModeTask(null);
    // Reload whatever panel was open
    if (currentView === "dashboard") {
      setCurrentView("dashboard");
    } else if (currentView === "task-detail") {
      // triggers reload
      const temp = activeTaskId;
      setActiveTaskId(null);
      setTimeout(() => setActiveTaskId(temp), 50);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalDeadline) return;

    setIsSubmittingGoal(true);
    try {
      const created = await addTask({
        title: newGoalTitle.trim(),
        deadline: new Date(newGoalDeadline + "T12:00:00").toISOString(),
        gradeWeight: Number(newGoalWeight),
        category: newGoalCategory,
      });

      // Run decomposition agent right away
      await runPlannerAgent(created.id);

      // Clean form
      setNewGoalTitle("");
      setNewGoalCategory("Assignment");
      setNewGoalWeight(15);
      setNewGoalDeadline("");
      setShowAddGoalModal(false);

      // Refresh current view
      if (currentView === "dashboard") {
        // Simple force rerender of dashboard
        setCurrentView("dashboard");
      } else {
        setCurrentView("dashboard");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const streak = getStartStreak();

  return (
    <div className="flex h-screen w-screen bg-[#090b10] text-[#e2e4f0] overflow-hidden selection:bg-[#8b5cf6]/30 font-sans">
      
      {/* Main Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0c0d14] border-r border-white/5 h-full py-6 px-4 space-y-6 shrink-0">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8.5 h-8.5 bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] rounded-xl flex items-center justify-center shadow-md shadow-[#8b5cf6]/10 shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight leading-none">StartLine</h1>
            <span className="text-[10px] text-[#5c6080] font-bold uppercase tracking-widest block mt-0.5">Study Agent</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5">
          {[
            { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
            { id: "notebook", label: "Notebook LM", icon: <Sparkles className="w-5 h-5" /> },
            { id: "habits", label: "Habits & Streaks", icon: <CalendarCheck className="w-5 h-5" /> },
            { id: "logs", label: "Agent Reasoner", icon: <Bot className="w-5 h-5" /> },
            { id: "settings", label: "Settings", icon: <SettingsIcon className="w-5 h-5" /> },
          ].map((item) => {
            const isSelected = currentView === item.id || (item.id === "dashboard" && currentView === "task-detail");
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as any);
                  setActiveTaskId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${
                  isSelected
                    ? "bg-[#161822] text-white"
                    : "text-[#9b9fc0] hover:text-white hover:bg-white/5"
                }`}
              >
                {isSelected && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#8b5cf6]" />
                )}
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer profile info */}
        <div className="p-3.5 bg-[#11131c] border border-white/5 rounded-2xl flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <span className="text-xs font-black text-white block truncate">{student?.name}</span>
            <span className="text-[10px] text-[#5c6080] font-bold block uppercase tracking-wider mt-0.5">{student?.tone} tone</span>
          </div>
          <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 font-extrabold text-xs px-2.5 py-1 rounded-lg shrink-0 border border-orange-500/15">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>{streak}d</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Mobile Top Navbar */}
        <header className="md:hidden bg-[#0c0d14] border-b border-white/5 py-4.5 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-extrabold text-white">StartLine</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 text-orange-400 font-extrabold text-xs bg-orange-500/10 border border-orange-500/15 px-2 py-0.5 rounded-md">
              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
              <span>{streak}</span>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-[#9b9fc0] hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0c0d14] border-b border-white/5 py-3 px-4 flex flex-col gap-1.5 shrink-0 animate-fade-in z-50">
            {[
              { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
              { id: "notebook", label: "Notebook LM", icon: <Sparkles className="w-4.5 h-4.5" /> },
              { id: "habits", label: "Habits & Streaks", icon: <CalendarCheck className="w-4.5 h-4.5" /> },
              { id: "logs", label: "Agent Reasoner", icon: <Bot className="w-4.5 h-4.5" /> },
              { id: "settings", label: "Settings", icon: <SettingsIcon className="w-4.5 h-4.5" /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as any);
                  setActiveTaskId(null);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold ${
                  currentView === item.id ? "bg-[#161822] text-white" : "text-[#9b9fc0]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Router Stage */}
        <main className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#090b10]">
          {currentView === "dashboard" && (
            <Dashboard
              onOpenTask={handleOpenTask}
              onOpenFocusMode={handleOpenFocusMode}
              onAddTaskClick={() => setShowAddGoalModal(true)}
            />
          )}

          {currentView === "notebook" && <NotebookLM />}

          {currentView === "habits" && <HabitsTracker />}

          {currentView === "logs" && <AgentLogView />}

          {currentView === "settings" && <SettingsView />}

          {currentView === "task-detail" && activeTaskId && (
            <TaskDetail
              taskId={activeTaskId}
              onBack={() => {
                setCurrentView("dashboard");
                setActiveTaskId(null);
              }}
              onOpenFocusMode={handleOpenFocusMode}
            />
          )}
        </main>
      </div>

      {/* Immersive Focus Mode Frame overlay */}
      {focusModeTask && (
        <FocusMode
          taskId={focusModeTask.taskId}
          subtaskId={focusModeTask.subtaskId}
          onClose={handleCloseFocusMode}
        />
      )}

      {/* Custom dialog/modal for adding a new goal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 selection:bg-[#8b5cf6]/30 animate-fade-in">
          <div className="bg-[#11131c] border border-white/5 rounded-3xl w-full max-w-md p-6 md:p-8 space-y-6 shadow-2xl relative">
            
            {/* Close button */}
            <button
              onClick={() => setShowAddGoalModal(false)}
              className="absolute top-6 right-6 p-1.5 bg-white/5 border border-white/5 text-[#9b9fc0] hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white font-sans leading-tight flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-[#8b5cf6]" />
                Decompose Study Goal
              </h3>
              <p className="text-xs text-[#9b9fc0] leading-relaxed">
                Add an upcoming deadline or syllabus block. Our Agent will immediately breakdown your instructions and inject matched avoidance response rules.
              </p>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs font-semibold">
              
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#9b9fc0] uppercase tracking-wider block" htmlFor="modal-goal-title">Goal Block Title</label>
                <input
                  id="modal-goal-title"
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. CS302 Final Project Guidelines"
                  className="w-full bg-[#161822] border border-white/5 rounded-xl px-3.5 py-3 text-xs text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-[#3b82f6]/40 transition"
                />
              </div>

              {/* Category, weight, and deadline row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#9b9fc0] uppercase tracking-wider block" htmlFor="modal-goal-category">Category</label>
                  <select
                    id="modal-goal-category"
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="w-full bg-[#161822] border border-white/5 rounded-xl px-3 py-3 text-xs text-[#e2e4f0] outline-none"
                  >
                    {["Assignment", "Exam", "Reading", "Problem Set", "Syllabus Review", "Custom"].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#9b9fc0] uppercase tracking-wider block" htmlFor="modal-goal-weight">Grade Weight (%)</label>
                  <input
                    id="modal-goal-weight"
                    type="number"
                    min="1"
                    max="100"
                    value={newGoalWeight}
                    onChange={(e) => setNewGoalWeight(parseInt(e.target.value) || 15)}
                    className="w-full bg-[#161822] border border-white/5 rounded-xl px-3 py-3 text-xs text-[#e2e4f0] outline-none"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#9b9fc0] uppercase tracking-wider block" htmlFor="modal-goal-deadline">Calendar Deadline</label>
                <input
                  id="modal-goal-deadline"
                  type="date"
                  required
                  value={newGoalDeadline}
                  onChange={(e) => setNewGoalDeadline(e.target.value)}
                  className="w-full bg-[#161822] border border-white/5 rounded-xl px-3 py-3 text-xs text-[#e2e4f0] outline-none"
                />
              </div>

              {isSubmittingGoal && (
                <div className="p-3 bg-[#161822] border border-white/5 rounded-xl flex items-center gap-3 text-[#9b9fc0]">
                  <div className="w-4.5 h-4.5 border-2 border-t-transparent border-[#8b5cf6] rounded-full animate-spin shrink-0" />
                  <p className="text-[10px]">Planner Agent analyzing syllabus guidelines and forging checklist...</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="flex-1 bg-white/5 text-[#9b9fc0] py-3 rounded-xl hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGoalTitle.trim() || !newGoalDeadline || isSubmittingGoal}
                  className="flex-[2] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white py-3 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
                >
                  Submit &amp; Plan Goal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
