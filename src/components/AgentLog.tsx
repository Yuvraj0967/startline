import React, { useState, useEffect } from "react";
import { AgentLog } from "../types";
import { getAgentLogs, clearAgentLogs, logAgentReasoning, getTasks } from "../lib/api";
import { ShieldCheck, Trash2, ChevronDown, ChevronUp, Bot, CornerDownRight, HelpCircle } from "lucide-react";

export default function AgentLogView() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLogs(getAgentLogs());
  };

  const handleClearLogs = async () => {
    if (confirm("Are you sure you want to purge all agent audit traces?")) {
      await clearAgentLogs();
      loadLogs();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const handleSeedDemoLog = async () => {
    const tasks = getTasks();
    const task = tasks[0];
    if (!task) {
      alert("Please add a study block first to seed audit traces!");
      return;
    }
    await logAgentReasoning({
      taskId: task.id,
      taskTitle: task.title,
      summary: "Manual Audit Trigger: High-latency avoidance detected",
      toolChain: [
        { tool: "assess_risk", result: "AT_RISK", reasoning: "Task opened three times in the last 24 hours without timer activation." },
        { tool: "classify_obstacle_type", result: "task_aversiveness", reasoning: "Student is actively opening other apps while tab is loaded." },
        { tool: "deploy_if_then_response", result: "Aversive Work Contract (25m clock)", reasoning: "Establishing a short, finite contract to overcome initiation friction." },
      ],
      outcome: "Proactive Pomodoro prompt injected into student panel",
    });
    loadLogs();
  };

  // Helper icons for tools
  const getToolIcon = (tool: string) => {
    switch (tool) {
      case "assess_risk":
        return "⚡";
      case "classify_obstacle_type":
        return "🔍";
      case "deploy_if_then_response":
        return "🎯";
      case "shrink_subtask":
        return "✂";
      case "draft_extension_email":
        return "✉️";
      case "create_calendar_hold":
        return "📅";
      default:
        return "🔧";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-4xl mx-auto selection:bg-[#8b5cf6]/30">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-2">
            <Bot className="w-8 h-8 text-[#8b5cf6]" />
            Agent Audit Logs
          </h1>
          <p className="text-sm text-[#9b9fc0] mt-1">
            See every decision made by the Planner and Monitoring Agents — fully transparent and explainable.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={handleSeedDemoLog}
            className="border border-[#5c6080]/30 hover:border-white/20 text-[#9b9fc0] hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            + Seed Audit Trace
          </button>
          <button
            onClick={handleClearLogs}
            disabled={!logs.length}
            className="bg-red-500/10 text-red-400 hover:bg-red-500/15 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-4 h-4" />
            Purge Traces
          </button>
        </div>
      </div>

      {/* Intro info box */}
      <div className="bg-[#11131c] border border-white/5 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white leading-normal">Explainable Study AI</h2>
          <p className="text-xs text-[#9b9fc0] leading-relaxed">
             StartLine operates with absolute architectural honesty. We log every tool call, risk scoring heuristic, and prompt strategy. If the AI suggests you ask for an extension, you can see the reasoning logic below.
          </p>
        </div>
      </div>

      {/* Logs container */}
      <div className="space-y-4">
        {logs.length > 0 ? (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="bg-[#11131c] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition shadow-sm"
              >
                {/* Header block (clickable) */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-5 flex justify-between items-center gap-4 cursor-pointer select-none"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-[#252840] text-white font-bold px-2 py-0.5 rounded-full uppercase">
                        {log.taskTitle}
                      </span>
                      <span className="text-[10px] text-[#5c6080] font-semibold">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate leading-normal">
                      {log.summary}
                    </h3>
                  </div>

                  <div className="shrink-0 text-[#5c6080] hover:text-white transition">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Collapsible body */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-[#161822] p-5 space-y-4">
                    {/* ToolChain list */}
                    <div className="space-y-3.5">
                      <h4 className="text-[10px] font-bold text-[#5c6080] uppercase tracking-wider">Reasoning Trace (Heuristics)</h4>
                      <div className="space-y-3 pl-2 border-l-2 border-[#5c6080]/20">
                        {log.toolChain && log.toolChain.length > 0 ? (
                          log.toolChain.map((step, idx) => (
                            <div key={idx} className="space-y-1 relative">
                              {/* Dot decorator */}
                              <span className="absolute -left-[14px] top-1 w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                              
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-white flex items-center gap-1">
                                  <span>{getToolIcon(step.tool)}</span>
                                  <span>{step.tool}</span>
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.1 bg-[#252840] text-emerald-400 rounded">
                                  {step.result}
                                </span>
                              </div>
                              <p className="text-xs text-[#9b9fc0] leading-relaxed pl-1.5">
                                {step.reasoning}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#5c6080] italic">No nested tool steps logged for this trace.</p>
                        )}
                      </div>
                    </div>

                    {/* Outcome line */}
                    <div className="bg-[#1c1e2e] border border-white/5 rounded-xl p-3.5 flex items-start gap-2.5">
                      <CornerDownRight className="w-4.5 h-4.5 text-[#8b5cf6] shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-xs">
                        <span className="font-extrabold text-[#8b5cf6] uppercase tracking-wider text-[9px] block">Final Outcomes</span>
                        <p className="text-[#e2e4f0] font-medium leading-relaxed">{log.outcome}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-[#11131c] border border-dashed border-white/5 rounded-3xl p-12 text-center text-[#5c6080] space-y-2">
            <Bot className="w-12 h-12 text-[#5c6080] mx-auto animate-bounce" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#9b9fc0]">Audit Timelines Clear</h4>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                StartLine study agents haven't executed audits or generated curricular steps yet. These populate automatically as you schedule and audit.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
