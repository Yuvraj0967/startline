import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Brain,
  Sparkles,
  MessageSquare,
  Bookmark,
  CheckSquare,
  Layers,
  Send,
  Copy,
  RotateCcw,
  PenSquare,
  HelpCircle,
  Info,
  X,
  FileSpreadsheet,
  Check
} from "lucide-react";
import { getNotebookSources, saveNotebookSources, getNotebookChat, saveNotebookChat, queryNotebookLM } from "../lib/api";
import { NotebookSource, NotebookChatMessage } from "../types";
import Markdown from "react-markdown";

export default function NotebookLM() {
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [messages, setMessages] = useState<NotebookChatMessage[]>([]);
  
  // Selection of sources for grounded query context
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  
  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<"chat" | "study_guide" | "quiz" | "outline">("chat");
  
  // New Source Form Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"document" | "note" | "syllabus" | "url">("document");
  
  // Chat inputs
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Cached generated content for tools
  const [studyGuide, setStudyGuide] = useState<string>("");
  const [quiz, setQuiz] = useState<string>("");
  const [outline, setOutline] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load state on mount
  useEffect(() => {
    const loadedSources = getNotebookSources();
    setSources(loadedSources);
    setSelectedSourceIds(loadedSources.map(s => s.id));
    
    const loadedChat = getNotebookChat();
    setMessages(loadedChat);
  }, []);

  // Update selection when sources change (auto-select new sources)
  const handleSaveSources = async (updatedSources: NotebookSource[]) => {
    setSources(updatedSources);
    await saveNotebookSources(updatedSources);
  };

  const handleSaveChat = async (updatedChat: NotebookChatMessage[]) => {
    setMessages(updatedChat);
    await saveNotebookChat(updatedChat);
  };

  // Source operations
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newSource: NotebookSource = {
      id: "source_" + Date.now(),
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
      created: new Date().toISOString()
    };

    const updated = [newSource, ...sources];
    await handleSaveSources(updated);
    setSelectedSourceIds(prev => [...prev, newSource.id]);
    
    // Reset form
    setNewTitle("");
    setNewContent("");
    setNewType("document");
    setShowAddModal(false);
  };

  const handleDeleteSource = async (id: string) => {
    const updated = sources.filter(s => s.id !== id);
    await handleSaveSources(updated);
    setSelectedSourceIds(prev => prev.filter(sid => sid !== id));
  };

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleAllSources = () => {
    if (selectedSourceIds.length === sources.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(sources.map(s => s.id));
    }
  };

  // Get active selected sources for grounding
  const getSelectedSources = () => sources.filter(s => selectedSourceIds.includes(s.id));

  // Chat action
  const handleSendMessage = async (e?: React.FormEvent, presetPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = presetPrompt || inputMessage;
    if (!promptText.trim()) return;

    const selectedSources = getSelectedSources();
    if (selectedSources.length === 0) {
      alert("Please select at least one study source from the left panel to ground the AI's knowledge!");
      return;
    }

    const userMessage: NotebookChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: promptText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    await handleSaveChat(updatedMessages);
    if (!presetPrompt) setInputMessage("");
    setIsGenerating(true);

    try {
      const reply = await queryNotebookLM(updatedMessages, selectedSources, "chat");
      const modelMessage: NotebookChatMessage = {
        id: "msg_" + (Date.now() + 1),
        role: "model",
        content: reply,
        timestamp: new Date().toISOString()
      };
      await handleSaveChat([...updatedMessages, modelMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: NotebookChatMessage = {
        id: "msg_err_" + Date.now(),
        role: "model",
        content: `⚠️ Error generating response: ${err.message || "Please verify your Gemini API key in Settings."}`,
        timestamp: new Date().toISOString()
      };
      await handleSaveChat([...updatedMessages, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Preset quick study assistants
  const handleGenerateTool = async (tab: "study_guide" | "quiz" | "outline") => {
    const selectedSources = getSelectedSources();
    if (selectedSources.length === 0) {
      alert("Please select at least one study source from the left panel first!");
      return;
    }

    setActiveTab(tab);
    setIsGenerating(true);

    try {
      const response = await queryNotebookLM([], selectedSources, tab);
      if (tab === "study_guide") setStudyGuide(response);
      if (tab === "quiz") setQuiz(response);
      if (tab === "outline") setOutline(response);
    } catch (err: any) {
      console.error(err);
      const errorResponse = `⚠️ Failed to generate resource: ${err.message || "Ensure server Gemini key is configured."}`;
      if (tab === "study_guide") setStudyGuide(errorResponse);
      if (tab === "quiz") setQuiz(errorResponse);
      if (tab === "outline") setOutline(errorResponse);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm("Are you sure you want to clear your interactive study chat history?")) {
      await handleSaveChat([]);
    }
  };

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Sample seed sources if empty to make the experience instant and delightful
  const handleAddSampleSyllabus = async () => {
    const sample: NotebookSource = {
      id: "source_sample_1",
      title: "CS101 Intro to Computing Syllabus",
      content: `Course Title: Introduction to Computer Science (CS101)
Instructor: Dr. Alan Turing
Office Hours: Mon/Wed 2:00 PM - 3:30 PM

Core Grading Structure:
- Weekly Problem Sets: 25%
- Midterm Exam: 25% (Oct 15)
- Final Term Project: 30% (Dec 12)
- Lecture Quizzes & Attendance: 20%

Module 1: Foundations of Algorithms
- Space and Time Complexity (Big O Notation)
- Searching Algorithms: Binary Search, Linear Search
- Sorting Algorithms: Bubble Sort, Merge Sort, Quicksort

Module 2: Key Data Structures
- Lists, Arrays, and Linked Lists
- Stacks, Queues, and Hash Tables
- Trees and Binary Search Trees`,
      type: "syllabus",
      created: new Date().toISOString()
    };
    const updated = [sample, ...sources];
    await handleSaveSources(updated);
    setSelectedSourceIds(prev => [...prev, sample.id]);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#090b10] text-[#e2e4f0]">
      
      {/* LEFT SIDEBAR: Source management */}
      <aside className="w-full md:w-80 bg-[#0c0d14] border-b md:border-b-0 md:border-r border-white/5 flex flex-col h-[350px] md:h-full shrink-0">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-[#8b5cf6]" />
            <h2 className="text-sm font-black text-white">Study Sources</h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:opacity-90 rounded-lg text-white font-bold text-xs flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Source</span>
          </button>
        </div>

        {/* Selected Counter & Selector toggles */}
        <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[11px] font-bold text-[#9b9fc0]">
          <span>{selectedSourceIds.length} of {sources.length} sources active</span>
          {sources.length > 0 && (
            <button
              onClick={toggleAllSources}
              className="hover:text-white transition flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#8b5cf6]"
            >
              {selectedSourceIds.length === sources.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sources.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-[#5c6080]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <p className="text-xs text-[#9b9fc0] font-semibold leading-relaxed">
                No sources added yet. NotebookLM works by analyzing your notes, slides, or syllabus!
              </p>
              <button
                onClick={handleAddSampleSyllabus}
                className="text-xs text-[#8b5cf6] hover:underline font-bold"
              >
                + Inject Sample Course Syllabus
              </button>
            </div>
          ) : (
            sources.map((s) => {
              const isSelected = selectedSourceIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`group p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-[#161822] border-white/10 shadow-md"
                      : "bg-[#0f111a] border-white/5 hover:border-white/10 opacity-70 hover:opacity-100"
                  }`}
                  onClick={() => toggleSourceSelection(s.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by div click
                        className="mt-1 rounded border-white/10 bg-[#161822] text-[#8b5cf6] focus:ring-0 cursor-pointer h-3.5 w-3.5"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white truncate leading-tight">
                          {s.title}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#5c6080] block mt-1">
                          {s.type} • {s.content.split(/\s+/).length} words
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSource(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded-md text-red-400 hover:text-red-300 transition shrink-0"
                      title="Delete Source"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Content Preview */}
                  <p className="text-[10px] text-[#5c6080] line-clamp-2 mt-2 font-medium leading-normal italic">
                    "{s.content}"
                  </p>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT WORKSPACE: Interactive Tools */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Workspace Toolbar Tabs */}
        <div className="p-4 bg-[#0c0d14] border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/5">
            {[
              { id: "chat", label: "Study Chat", icon: <MessageSquare className="w-4 h-4" /> },
              { id: "study_guide", label: "Study Guide", icon: <Brain className="w-4 h-4" /> },
              { id: "quiz", label: "Interactive Quiz", icon: <Sparkles className="w-4 h-4" /> },
              { id: "outline", label: "Course Outline", icon: <Layers className="w-4 h-4" /> },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "chat") {
                      setActiveTab("chat");
                    } else {
                      handleGenerateTool(tab.id as any);
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#161822] text-white border border-white/5"
                      : "text-[#9b9fc0] hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {activeTab === "chat" && messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-[#9b9fc0] font-bold flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Chat</span>
              </button>
            )}

            {/* Quick stats / helper */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#5c6080] bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">
              <Info className="w-3.5 h-3.5 text-[#8b5cf6]" />
              <span>Grounded in active selected sources</span>
            </div>
          </div>
        </div>

        {/* Active Content Panel */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          
          {isGenerating && (
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] animate-pulse z-50" />
          )}

          {/* TAB 1: Chat Workspace */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-6">
                    <div className="w-14 h-14 bg-gradient-to-tr from-[#3b82f6]/20 to-[#8b5cf6]/20 rounded-2xl flex items-center justify-center border border-[#8b5cf6]/20">
                      <Sparkles className="w-6 h-6 text-[#8b5cf6]" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-base font-black text-white">Your Grounded Notebook Copilot</h3>
                      <p className="text-xs text-[#9b9fc0] leading-relaxed">
                        Ask questions about formulas, syllabus structures, paper citations, or difficult topics. 
                        Gemini will answer your queries with strict grounding, citing exactly which source document is referenced.
                      </p>
                    </div>

                    {/* Pre-made study prompts */}
                    {sources.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-4">
                        {[
                          "Summarize the key takeaways across all my documents.",
                          "What are the main topics or grading rules?",
                          "Create a quick 5-item glossary based on these.",
                          "Write a brief lecture cheat code for Module 1."
                        ].map((prompt, i) => (
                          <button
                            key={i}
                            onClick={(e) => handleSendMessage(e, prompt)}
                            className="p-3 bg-[#11131c] border border-white/5 text-[#9b9fc0] hover:text-white text-left rounded-xl text-[11px] font-bold hover:border-[#8b5cf6]/20 transition duration-150"
                          >
                            💡 "{prompt}"
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 max-w-3xl ${
                          isUser ? "ml-auto justify-end" : "mr-auto"
                        }`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shrink-0">
                            <Brain className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        
                        <div
                          className={`rounded-2xl px-4 py-3.5 text-xs leading-relaxed border ${
                            isUser
                              ? "bg-[#8b5cf6]/10 border-[#8b5cf6]/20 text-[#e2e4f0]"
                              : "bg-[#11131c] border-white/5 text-[#e2e4f0]"
                          }`}
                        >
                          <div className="markdown-body">
                            <Markdown>{m.content}</Markdown>
                          </div>
                          
                          <span className="text-[9px] font-bold text-[#5c6080] block mt-2 text-right">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {isUser && (
                          <div className="w-7 h-7 rounded-lg bg-[#161822] border border-white/10 flex items-center justify-center shrink-0">
                            <PenSquare className="w-3.5 h-3.5 text-[#9b9fc0]" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                
                {isGenerating && (
                  <div className="flex gap-3 max-w-3xl mr-auto">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shrink-0 animate-pulse">
                      <Brain className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-[#11131c] border border-white/5 rounded-2xl px-4 py-3 text-xs text-[#9b9fc0] flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-t-transparent border-[#8b5cf6] rounded-full animate-spin" />
                      <span>Notebook AI searching sources and formulating answer...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={(e) => handleSendMessage(e)} className="p-4 bg-[#0c0d14] border-t border-white/5 flex gap-3 items-center">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isGenerating || sources.length === 0}
                  placeholder={
                    sources.length === 0 
                      ? "Add study sources on the left side to unlock chat"
                      : "Ask questions grounded in selected study materials..."
                  }
                  className="flex-1 bg-[#161822] border border-white/5 rounded-xl px-4 py-3 text-xs text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-[#8b5cf6]/30 transition disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !inputMessage.trim() || sources.length === 0}
                  className="p-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:opacity-90 rounded-xl text-white transition disabled:opacity-40 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2, 3, 4: Generated Document Workspace */}
          {activeTab !== "chat" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
              
              {/* Header inside workspace */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-black text-white capitalize leading-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#8b5cf6]" />
                    {activeTab.replace("_", " ")} Workspace
                  </h3>
                  <p className="text-xs text-[#9b9fc0] mt-1">
                    Grounded in {getSelectedSources().length} selected documents.
                  </p>
                </div>

                {/* Quick actions for study document */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const textToCopy = activeTab === "study_guide" ? studyGuide : activeTab === "quiz" ? quiz : outline;
                      handleCopyText(textToCopy, activeTab);
                    }}
                    className="px-3.5 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[#e2e4f0] text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedText === activeTab ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === activeTab ? "Copied!" : "Copy Markdown"}</span>
                  </button>

                  <button
                    onClick={() => handleGenerateTool(activeTab)}
                    className="px-3.5 py-2 bg-[#8b5cf6]/15 hover:bg-[#8b5cf6]/25 border border-[#8b5cf6]/20 rounded-xl text-[#8b5cf6] text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Generated Content render */}
              <div className="flex-1 overflow-y-auto bg-[#11131c] border border-white/5 rounded-2xl p-6 relative">
                {isGenerating ? (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center space-y-4">
                    <div className="w-9 h-9 border-3 border-t-transparent border-[#8b5cf6] rounded-full animate-spin" />
                    <p className="text-xs text-[#9b9fc0] font-semibold">
                      Grounded Brain indexing documents and forging premium learning material...
                    </p>
                  </div>
                ) : null}

                {/* Markdown Viewport */}
                <div className="markdown-body text-xs text-[#e2e4f0] leading-relaxed max-w-3xl prose prose-invert">
                  {activeTab === "study_guide" && studyGuide && <Markdown>{studyGuide}</Markdown>}
                  {activeTab === "quiz" && quiz && <Markdown>{quiz}</Markdown>}
                  {activeTab === "outline" && outline && <Markdown>{outline}</Markdown>}

                  {/* Empty state */}
                  {((activeTab === "study_guide" && !studyGuide) ||
                    (activeTab === "quiz" && !quiz) ||
                    (activeTab === "outline" && !outline)) && !isGenerating && (
                    <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[#5c6080]">
                        <Brain className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-[#9b9fc0] font-semibold">
                        Ready to synthesize your study materials. Tap the regenerate button to kick off custom AI assembly!
                      </p>
                      <button
                        onClick={() => handleGenerateTool(activeTab)}
                        className="px-4 py-2 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#8b5cf6]/10"
                      >
                        Synthesize Study Tool
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: ADD NEW DOCUMENT / SOURCE */}
      {showAddModal && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11131c] border border-white/5 rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl relative">
            
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 p-1.5 bg-white/5 border border-white/5 text-[#9b9fc0] hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-[#8b5cf6]" />
                Add Study Source
              </h3>
              <p className="text-xs text-[#9b9fc0] leading-relaxed">
                Paste syllabus blocks, article content, custom summary notes, or cheat sheets. 
                Our Study Agent will index this source and ground all study aids specifically around it.
              </p>
            </div>

            <form onSubmit={handleAddSource} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#9b9fc0] uppercase tracking-wider block" htmlFor="src-title">Source Title</label>
                <input
                  id="src-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lecture 4: Binary Trees & Complexity"
                  className="w-full bg-[#161822] border border-white/5 rounded-xl px-3.5 py-3 text-xs text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-[#8b5cf6]/30 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#9b9fc0] uppercase tracking-wider block" htmlFor="src-type">Source Category</label>
                <select
                  id="src-type"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-[#161822] border border-white/5 rounded-xl px-3 py-3 text-xs text-[#e2e4f0] outline-none"
                >
                  <option value="document">Lecture Notes / Slides Text</option>
                  <option value="syllabus">Syllabus / Guidelines</option>
                  <option value="note">My Scratchpad / Raw Notes</option>
                  <option value="url">Reference Text / Manual</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#9b9fc0] uppercase tracking-wider block" htmlFor="src-content">Source Content Text</label>
                <textarea
                  id="src-content"
                  required
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste or type raw lecture notes, text contents of slides, or instructions..."
                  className="w-full bg-[#161822] border border-white/5 rounded-xl px-3.5 py-3 text-xs text-[#e2e4f0] placeholder:text-[#5c6080] outline-none focus:border-[#8b5cf6]/30 transition resize-none font-sans"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white/5 text-[#9b9fc0] py-3 rounded-xl hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="flex-[2] bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white py-3 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
                >
                  Index Study Material
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
