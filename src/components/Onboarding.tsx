import React, { useState } from "react";
import { Student } from "../types";
import { saveStudent, addTask, runPlannerAgent } from "../lib/api";
import { Sparkles, ArrowRight, CornerDownLeft, Volume2, ShieldAlert, Check } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [tone, setTone] = useState<"direct" | "gentle" | "funny">("gentle");
  
  // Diagnostic quiz answers
  const [answers, setAnswers] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState<string>("");
  const [isPlanning, setIsPlanning] = useState<boolean>(false);

  const QUIZ_QUESTIONS = [
    {
      text: "When you have a big assignment coming up, what usually stops you from starting?",
      options: [
        { label: "I'm not sure how to begin or what the first step is.", type: "ambiguity" },
        { label: "I'm worried it won't be good enough, so I wait.", type: "fear_of_failure" },
        { label: "The task feels extremely tedious or boring.", type: "task_aversiveness" },
        { label: "I keep thinking I have plenty of time left.", type: "time_estimation" },
      ],
    },
    {
      text: "When you open a homework tab and immediately close it, what's the thought?",
      options: [
        { label: "This is way too fuzzy — I don't know where to start.", type: "ambiguity" },
        { label: "What if I get a bad grade? I'll do it when I'm in a 'better' mood.", type: "fear_of_failure" },
        { label: "I'd rather do literally anything else right now.", type: "task_aversiveness" },
        { label: "I can easily finish this tomorrow morning.", type: "time_estimation" },
      ],
    },
    {
      text: "On tasks you finished at the absolute last minute, when did you realize you were in trouble?",
      options: [
        { label: "When I finally sat down and realized I didn't understand the instructions.", type: "ambiguity" },
        { label: "When I kept deleting my paragraphs because they weren't perfect.", type: "fear_of_failure" },
        { label: "When I ran out of excuses to procrastinate.", type: "task_aversiveness" },
        { label: "When I looked at the clock at 2 AM the night before.", type: "time_estimation" },
      ],
    },
    {
      text: "Which of these sounds most like your inner voice right before a study block?",
      options: [
        { label: `"I will start once I figure out the perfect research plan."`, type: "ambiguity" },
        { label: `"I need to feel completely rested and ready to write this paper."`, type: "fear_of_failure" },
        { label: `"I'll just watch one short video to prime my brain first."`, type: "task_aversiveness" },
        { label: `"It's only worth 10% of my grade, it should be super quick."`, type: "time_estimation" },
      ],
    },
  ];

  // Helper to count the dominant obstacle type
  const calculateDominantObstacle = (): string[] => {
    const counts: Record<string, number> = {};
    answers.forEach((ans) => {
      counts[ans] = (counts[ans] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
  };

  const handleNext = () => {
    if (step === 0 && !name.trim()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSelectOption = (qIdx: number, type: string) => {
    const updated = [...answers];
    updated[qIdx] = type;
    setAnswers(updated);
  };

  const handleTaskSubmit = async () => {
    if (!taskInput.trim()) return;
    setIsPlanning(true);

    const dominant = calculateDominantObstacle();
    const finalStudent: Student = {
      name: name.trim(),
      tone,
      obstacleTypes: dominant.length ? dominant : ["ambiguity"],
      onboardingComplete: true,
      weeklyGoal: "Start every focus session within 5 minutes of planning.",
      weeklyGoalSet: Date.now(),
      joined: new Date().toISOString(),
    };

    // Save student profile
    await saveStudent(finalStudent);

    // Parse a quick task
    const parsedWeight = taskInput.match(/(\d+)%/);
    const weight = parsedWeight ? parseInt(parsedWeight[1]) : 15;

    // Create the task in the database
    const createdTask = await addTask({
      title: taskInput.replace(/\d+%/g, "").replace(/due.*/gi, "").trim() || "First Decomposed Study Task",
      deadline: new Date(Date.now() + 4 * 86400000).toISOString(), // 4 days out
      gradeWeight: weight,
      category: "Assignment",
    });

    // Run the real planner agent on the server side
    try {
      await runPlannerAgent(createdTask.id);
    } catch (e) {
      console.error("Planner agent failed during onboarding:", e);
    }

    setIsPlanning(false);
    setStep(step + 1); // Move to the Ready step
  };

  const handleSkipTask = async () => {
    const dominant = calculateDominantObstacle();
    const finalStudent: Student = {
      name: name.trim(),
      tone,
      obstacleTypes: dominant.length ? dominant : ["ambiguity"],
      onboardingComplete: true,
      weeklyGoal: null,
      weeklyGoalSet: null,
      joined: new Date().toISOString(),
    };
    await saveStudent(finalStudent);
    onComplete();
  };

  return (
    <div className="min-height-100vh flex items-center justify-center bg-[#090b10] text-[#e2e4f0] p-6 selection:bg-[#8b5cf6]/30">
      <div className="w-full max-w-xl bg-[#11131c] border border-white/5 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#8b5cf6]/10 to-transparent pointer-events-none rounded-full" />
        
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] rounded-2xl flex items-center justify-center shadow-lg shadow-[#8b5cf6]/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight font-sans">StartLine</h1>
                <p className="text-xs text-[#5c6080] font-semibold tracking-wider uppercase">Agentic Study Companion</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold font-sans text-white leading-tight">Welcome to StartLine.</h2>
              <p className="text-[#9b9fc0] leading-relaxed">
                The productivity companion that learns exactly <em className="text-[#3b82f6] not-italic font-semibold">why</em> you personally avoid starting assignments, and builds precise momentum cheat codes.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#9b9fc0] uppercase tracking-wider block" htmlFor="onboard-name">
                What should I call you?
              </label>
              <input
                id="onboard-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#161822] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-[#3b82f6]/40 focus:ring-4 focus:ring-[#3b82f6]/10 transition"
              />
            </div>

            <div className="bg-[#161822] border border-white/5 rounded-2xl p-5 text-sm text-[#9b9fc0] leading-relaxed space-y-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#8b5cf6]" />
                The Procrastination Paradox
              </span>
              <p>
                Academic research proves that standard planning systems don't work for chronic avoidance. To start, you don't need reminders — you need a paired response to the exact feeling of stalling.
              </p>
            </div>

            <button
              onClick={handleNext}
              disabled={!name.trim()}
              className="w-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition shadow-lg shadow-[#8b5cf6]/20"
            >
              Get Started — 3 minutes
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 1: Voice Tone */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-sans text-white">How should I speak to you?</h2>
              <p className="text-sm text-[#9b9fc0]">
                Choose the voice that actually gets you moving, not what you think you ought to prefer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: "direct", emoji: "🎯", label: "Direct", desc: "No soft padding. Clear, logical, and focused on immediate action." },
                { id: "gentle", emoji: "🌿", label: "Gentle", desc: "Warm and encouraging. Takes it step-by-step with zero guilt." },
                { id: "funny", emoji: "😄", label: "Light / Wit", desc: "A bit of humorous tough love. Makes tedious work bearable." },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id as any)}
                  className={`p-5 rounded-2xl border text-left transition space-y-3 bg-[#161822] hover:border-white/10 ${
                    tone === t.id ? "border-[#8b5cf6] ring-4 ring-[#8b5cf6]/10" : "border-white/5"
                  }`}
                >
                  <span className="text-3xl block">{t.emoji}</span>
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-white block">{t.label}</span>
                    <span className="text-xs text-[#9b9fc0] leading-snug block">{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={handleBack} className="flex-1 bg-white/5 text-[#9b9fc0] font-semibold py-3.5 rounded-xl hover:bg-white/10 transition">
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-[2] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition"
              >
                Continue to Diagnostic
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Diagnostic Quiz */}
        {step >= 2 && step <= 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5c6080] font-bold uppercase tracking-wider">
                <span>Diagnostic Quiz</span>
                <span>Question {step - 1} of 4</span>
              </div>
              <h2 className="text-xl font-bold font-sans text-white leading-tight">
                {QUIZ_QUESTIONS[step - 2].text}
              </h2>
            </div>

            <div className="space-y-3">
              {QUIZ_QUESTIONS[step - 2].options.map((opt, idx) => {
                const isSelected = answers[step - 2] === opt.type;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(step - 2, opt.type)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition ${
                      isSelected
                        ? "bg-[#8b5cf6]/5 border-[#8b5cf6] text-white"
                        : "bg-[#161822] border-white/5 text-[#9b9fc0] hover:bg-white/5"
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-[#252840] flex items-center justify-center text-xs font-bold text-[#e2e4f0] shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm font-medium leading-normal">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={handleBack} className="flex-1 bg-white/5 text-[#9b9fc0] font-semibold py-3.5 rounded-xl hover:bg-white/10 transition">
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!answers[step - 2]}
                className="flex-[2] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-45 disabled:pointer-events-none transition"
              >
                {step === 5 ? "See My Profile" : "Next Question"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Initial Task Capture */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8b5cf6]">
                <Sparkles className="w-4 h-4" />
                Dominant Pattern Identified
              </div>
              <h2 className="text-2xl font-bold font-sans text-white">Let's plan your first task.</h2>
              <p className="text-sm text-[#9b9fc0]">
                Our AI Planner will immediately decompose it into micro-focus blocks, injecting procrastination cheat codes.
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="e.g. 'CS301 final project due Friday, worth 25%' or paste syllabus requirements"
                className="w-full bg-[#161822] border border-white/5 rounded-2xl p-4 text-sm text-[#e2e4f0] placeholder:text-[#5c6080] outline-none min-h-[100px] focus:border-[#3b82f6]/40 focus:ring-4 focus:ring-[#3b82f6]/10 transition resize-y"
              />
              <p className="text-xs text-[#5c6080] font-medium leading-relaxed">
                💡 Tip: Mentioning grades (e.g. "worth 20%") or deadlines helps our agent calibrate the risk and urgency scores.
              </p>
            </div>

            {isPlanning && (
              <div className="bg-[#161822] border border-white/5 rounded-2xl p-4 flex items-center gap-4 text-sm text-[#9b9fc0]">
                <div className="w-5 h-5 border-2 border-t-transparent border-[#8b5cf6] rounded-full animate-spin shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-white">🤖 Planner Agent active</p>
                  <p className="text-xs">Decomposing project guidelines and forging procrastination safeguards...</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSkipTask}
                disabled={isPlanning}
                className="flex-1 bg-white/5 text-[#9b9fc0] font-semibold py-3.5 rounded-xl hover:bg-white/10 disabled:opacity-40 transition text-sm"
              >
                Skip Task
              </button>
              <button
                onClick={handleTaskSubmit}
                disabled={!taskInput.trim() || isPlanning}
                className="flex-[2] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-45 disabled:pointer-events-none transition text-sm"
              >
                Plan &amp; Finish
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Ready */}
        {step === 7 && (
          <div className="text-center space-y-6 py-4 animate-fade-in">
            <div className="w-20 h-24 text-6xl mx-auto">🚀</div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">You are ready.</h2>
              <p className="text-sm text-[#9b9fc0] max-w-sm mx-auto">
                I've locked in your profile, configured your Study Assistant, and loaded your checklist. Let's make some headway.
              </p>
            </div>

            <div className="space-y-2.5 max-w-sm mx-auto text-left">
              {[
                "Customized interventions matched to your precise study blocks",
                "Background risk monitoring checking in periodically to prevent stalling",
                "Immersive Pomodoro Focus Mode loaded with embedded ambient tracks",
              ].map((text, idx) => (
                <div key={idx} className="flex gap-3 items-start p-3 bg-[#161822] border border-white/5 rounded-xl text-xs text-[#9b9fc0]">
                  <Check className="w-4 h-4 text-[#8b5cf6] shrink-0 mt-0.5" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onComplete}
              className="w-full max-w-xs bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition mx-auto shadow-lg shadow-[#8b5cf6]/20"
            >
              Open Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
