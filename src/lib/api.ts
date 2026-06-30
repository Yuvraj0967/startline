import { Student, Task, Subtask, BehaviorLog, AgentLog, Settings, PendingAction, FocusSession, NotebookSource, NotebookChatMessage } from "../types";

// Base API URL
const BASE_URL = "/api";

// ── In-Memory and LocalStorage Cache Fallbacks ──────────────────────────────
const STORAGE_KEYS = {
  student: "sl_student",
  tasks: "sl_tasks",
  behaviors: "sl_behaviors",
  agentLogs: "sl_agent_logs",
  settings: "sl_settings",
};

// Seed initial tasks if none exist
const SEED_TASKS = (): Task[] => {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: "t1",
      title: "CS301 Final Literature Review – AI Ethics",
      deadline: new Date(now + 3 * day).toISOString(),
      gradeWeight: 25,
      category: "Essay",
      state: "CRITICAL",
      alertTier: "alert",
      priorityScore: 88,
      rescheduleCount: 2,
      completionPercent: 15,
      subtasks: [
        {
          id: "s1a",
          title: "Search for 10 peer-reviewed sources on AI governance",
          estMinutes: 45,
          firstSentence: 'Open Google Scholar and search "AI ethics policies 2024" — write down the first 3 titles you find.',
          status: "done",
          startedAt: now - 5 * day,
          completedAt: now - 5 * day,
        },
        {
          id: "s1b",
          title: "Annotate and extract quotes from 5 core papers",
          estMinutes: 120,
          firstSentence: "Open the first PDF, read only the Abstract and Conclusion, and paste one sentence into your scratchpad.",
          status: "pending",
          startedAt: null,
          completedAt: null,
        },
        {
          id: "s1c",
          title: "Draft 300-word synthesis paragraph comparing regulations",
          estMinutes: 60,
          firstSentence: 'Start with: "Three primary tensions emerge when comparing European and US frameworks..."',
          status: "pending",
          startedAt: null,
          completedAt: null,
        },
        {
          id: "s1d",
          title: "Write full literature review intro and conclusion",
          estMinutes: 90,
          firstSentence: 'Write: "This literature review analyzes the emerging consensus around..."',
          status: "pending",
          startedAt: null,
          completedAt: null,
        },
      ],
      pendingActions: [
        {
          id: "pa1",
          type: "email",
          title: "Draft extension email to Professor Chen",
          desc: "Requests a 3-day buffer to refine complex ethical framework comparisons.",
          data: {
            recipient: "Prof. Chen",
            subject: "CS301 Extension Request: Lit Review",
            body: "Dear Professor Chen,\n\nI hope you are having a productive week.\n\nI am currently working on the Machine Learning Ethics literature review due in 3 days. Because of the complexity of comparing multiple international governance frameworks, I would like to request a brief 3-day extension to refine my analysis.\n\nThank you very much for your time and understanding.\n\nSincerely,\n[Your Name]",
          },
        },
        {
          id: "pa2",
          type: "calendar_hold",
          title: "Emergency Study Hold",
          desc: "Block 2 hours tomorrow afternoon for dedicated focus.",
          data: {
            title: "CS301 lit review focus block",
            start_time: new Date(now + 24 * 3600 * 1000).toISOString(),
            duration_min: 120,
          },
        },
      ],
      goodEnough: false,
      created: new Date(now - 5 * day).toISOString(),
    },
    {
      id: "t2",
      title: "MATH402 Calculus Problem Set 6",
      deadline: new Date(now + 1 * day).toISOString(),
      gradeWeight: 10,
      category: "Problem Set",
      state: "AT_RISK",
      alertTier: "notification",
      priorityScore: 72,
      rescheduleCount: 1,
      completionPercent: 40,
      subtasks: [
        {
          id: "s2a",
          title: "Problems 1–5 (Integration by parts)",
          estMinutes: 30,
          firstSentence: "Write down the Integration by Parts formula: ∫u dv = uv - ∫v du at the top of your paper.",
          status: "done",
          startedAt: now - day,
          completedAt: now - day,
        },
        {
          id: "s2b",
          title: "Problems 6–10 (Partial fractions)",
          estMinutes: 45,
          firstSentence: "Write: 'A / (x - 1) + B / (x + 2) =' and begin finding the constants first.",
          status: "pending",
          startedAt: null,
          completedAt: null,
        },
        {
          id: "s2c",
          title: "Problems 11-15 (Trig substitution)",
          estMinutes: 60,
          firstSentence: "For Problem 11, write: 'Let x = 3 sin(θ), so dx = 3 cos(θ) dθ'.",
          status: "pending",
          startedAt: null,
          completedAt: null,
        },
      ],
      pendingActions: [],
      goodEnough: false,
      created: new Date(now - 2 * day).toISOString(),
    },
    {
      id: "t3",
      title: "Group Presentation – Market Structures",
      deadline: new Date(now + 6 * day).toISOString(),
      gradeWeight: 15,
      category: "Presentation",
      state: "ON_TRACK",
      alertTier: "notification",
      priorityScore: 38,
      rescheduleCount: 0,
      completionPercent: 50,
      subtasks: [
        {
          id: "s3a",
          title: "Draft slides on oligopoly characteristics",
          estMinutes: 40,
          firstSentence: "Open the shared presentation deck, add slide 4, and write 'Oligopoly: Collusion & Game Theory'.",
          status: "done",
          startedAt: now - 3 * day,
          completedAt: now - 3 * day,
        },
        {
          id: "s3b",
          title: "Practice presentation script aloud once",
          estMinutes: 20,
          firstSentence: "Stand up, set a timer for 5 minutes, and say: 'In today's presentation, our group will...'",
          status: "pending",
          startedAt: null,
          completedAt: null,
        },
      ],
      pendingActions: [],
      goodEnough: false,
      created: new Date(now - 3 * day).toISOString(),
    },
  ];
};

const SEED_BEHAVIORS = (): BehaviorLog[] => {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: "bl1",
      taskId: "t1",
      subtaskId: "s1a",
      startLatency: 4, // 4s start latency
      abandoned: false,
      tabAwaySecs: 15,
      timestamp: new Date(now - 5 * day).toISOString(),
    },
    {
      id: "bl2",
      taskId: "t2",
      subtaskId: "s2a",
      startLatency: 3,
      abandoned: false,
      tabAwaySecs: 0,
      timestamp: new Date(now - day).toISOString(),
    },
  ];
};

// ── Generic Fetch Wrapper ───────────────────────────────────────────────────
async function apiCall(endpoint: string, method: string = "GET", body: any = null) {
  try {
    const opts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (body) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`Local API Call failed (${method} ${endpoint}):`, error);
    return null;
  }
}

// ── Sync Local and Server ───────────────────────────────────────────────────
export async function initializeDatabase(): Promise<boolean> {
  // Check health and do initial load
  const health = await apiCall("/health");
  if (!health) {
    console.warn("Backend server not reachable — using localStorage only.");
    // Populate localStorage with seed data if empty
    if (!localStorage.getItem(STORAGE_KEYS.tasks)) {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(SEED_TASKS()));
    }
    if (!localStorage.getItem(STORAGE_KEYS.behaviors)) {
      localStorage.setItem(STORAGE_KEYS.behaviors, JSON.stringify(SEED_BEHAVIORS()));
    }
    if (!localStorage.getItem(STORAGE_KEYS.agentLogs)) {
      localStorage.setItem(STORAGE_KEYS.agentLogs, JSON.stringify([]));
    }
    return false;
  }

  // Fetch full state from backend
  const serverState = await apiCall("/all");
  if (serverState) {
    // If backend has no data but client has, sync client -> backend
    const clientTasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || "[]");
    const clientStudent = JSON.parse(localStorage.getItem(STORAGE_KEYS.student) || "null");
    const clientBehaviors = JSON.parse(localStorage.getItem(STORAGE_KEYS.behaviors) || "[]");
    const clientLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.agentLogs) || "[]");
    const clientSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    const clientFocusSessions = JSON.parse(localStorage.getItem("sl_focus_sessions") || "[]");
    const clientNotebookSources = JSON.parse(localStorage.getItem("sl_notebook_sources") || "[]");
    const clientNotebookChat = JSON.parse(localStorage.getItem("sl_notebook_chat") || "[]");

    if (!serverState.tasks?.length && clientTasks.length) {
      // Sync client to server
      await apiCall("/sync", "POST", {
        student: clientStudent,
        tasks: clientTasks,
        behaviors: clientBehaviors,
        agentLogs: clientLogs,
        settings: clientSettings,
        focusSessions: clientFocusSessions,
        notebookSources: clientNotebookSources,
        notebookChat: clientNotebookChat,
      });
    } else {
      // Store server state locally
      if (serverState.student) localStorage.setItem(STORAGE_KEYS.student, JSON.stringify(serverState.student));
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(serverState.tasks || SEED_TASKS()));
      localStorage.setItem(STORAGE_KEYS.behaviors, JSON.stringify(serverState.behaviors || SEED_BEHAVIORS()));
      localStorage.setItem(STORAGE_KEYS.agentLogs, JSON.stringify(serverState.agentLogs || []));
      if (serverState.settings) localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(serverState.settings));
      localStorage.setItem("sl_focus_sessions", JSON.stringify(serverState.focusSessions || []));
      localStorage.setItem("sl_notebook_sources", JSON.stringify(serverState.notebookSources || []));
      localStorage.setItem("sl_notebook_chat", JSON.stringify(serverState.notebookChat || []));
    }
  }
  return true;
}

// ── Student APIs ────────────────────────────────────────────────────────────
export function getStudent(): Student | null {
  const local = localStorage.getItem(STORAGE_KEYS.student);
  return local ? JSON.parse(local) : null;
}

export async function saveStudent(student: Student): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.student, JSON.stringify(student));
  await apiCall("/student", "PUT", student);
}

// ── Settings APIs ───────────────────────────────────────────────────────────
export function getSettings(): Settings {
  const local = localStorage.getItem(STORAGE_KEYS.settings);
  const defaultSettings: Settings = {
    geminiApiKey: "",
    model: "gemini-3.5-flash",
    demoMode: true,
    theme: "dark",
    calendarConnected: false,
    breakReminders: true,
    breakInterval: 25,
    mealReminders: false,
    mealTimes: ["12:00", "18:00"],
    spotifyPlaylists: [
      { id: "lofi", name: "Lo-Fi Beats (Curated)", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn" },
      { id: "focus", name: "Deep Focus", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8NTLI2TtZa6" },
      { id: "ambient", name: "Ambient Chill", url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX3Ogo9pFvBkY" },
    ],
    blocklist: ["facebook.com", "instagram.com", "reddit.com", "youtube.com", "twitter.com", "tiktok.com"],
  };
  return local ? { ...defaultSettings, ...JSON.parse(local) } : defaultSettings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  await apiCall("/settings", "PUT", settings);
}

// ── Behavior Logs ───────────────────────────────────────────────────────────
export function getBehaviors(): BehaviorLog[] {
  const local = localStorage.getItem(STORAGE_KEYS.behaviors);
  return local ? JSON.parse(local) : [];
}

export async function logBehavior(log: Omit<BehaviorLog, "id" | "timestamp">): Promise<void> {
  const behaviors = getBehaviors();
  const entry: BehaviorLog = {
    ...log,
    id: "bl" + Date.now(),
    timestamp: new Date().toISOString(),
  };
  behaviors.push(entry);
  localStorage.setItem(STORAGE_KEYS.behaviors, JSON.stringify(behaviors));
  await apiCall("/behaviors", "POST", entry);
}

// Calculate on-time start streaks (where latency is <= 5 mins/300 seconds)
export function getStartStreak(): number {
  const logs = getBehaviors().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (!logs.length) return 0;

  let streak = 0;
  let lastDate: string | null = null;

  for (const log of logs) {
    if (log.abandoned || log.startLatency > 300) {
      break; // Streak broken
    }
    const dateStr = new Date(log.timestamp).toDateString();
    if (dateStr !== lastDate) {
      streak++;
      lastDate = dateStr;
    }
  }
  return streak;
}

// ── Focus Sessions client APIs ──────────────────────────────────────────────
export function getFocusSessions(): FocusSession[] {
  const local = localStorage.getItem("sl_focus_sessions");
  return local ? JSON.parse(local) : [];
}

export async function saveFocusSession(session: Omit<FocusSession, "id">): Promise<FocusSession> {
  const sessions = getFocusSessions();
  const newSession: FocusSession = {
    ...session,
    id: "fs" + Date.now(),
  };
  sessions.push(newSession);
  localStorage.setItem("sl_focus_sessions", JSON.stringify(sessions));
  await apiCall("/focus-sessions", "POST", newSession);
  return newSession;
}

// ── Google Calendar Sync client API ─────────────────────────────────────────
export async function syncGoogleCalendar(accessToken: string): Promise<Task[]> {
  try {
    const res = await apiCall("/calendar/sync", "POST", { accessToken });
    if (res && res.success && Array.isArray(res.tasks)) {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(res.tasks));
      return res.tasks;
    }
    if (res && res.error === "auth_error") {
      throw new Error("AUTH_ERROR: " + res.message);
    }
    throw new Error(res?.message || "Failed to synchronize with Google Calendar.");
  } catch (err: any) {
    if (err.message && err.message.includes("AUTH_ERROR")) {
      throw err;
    }
    throw new Error(err.message || "Network error while syncing Google Calendar.");
  }
}

// ── Agent Reasoning Logs ────────────────────────────────────────────────────
export function getAgentLogs(): AgentLog[] {
  const local = localStorage.getItem(STORAGE_KEYS.agentLogs);
  return local ? JSON.parse(local) : [];
}

export async function logAgentReasoning(entry: Omit<AgentLog, "id" | "timestamp">): Promise<void> {
  const logs = getAgentLogs();
  const fullEntry: AgentLog = {
    ...entry,
    id: "al" + Date.now(),
    timestamp: new Date().toISOString(),
  };
  logs.unshift(fullEntry); // newest logs at the top
  localStorage.setItem(STORAGE_KEYS.agentLogs, JSON.stringify(logs));
  await apiCall("/agentlogs", "POST", fullEntry);
}

export async function clearAgentLogs(): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.agentLogs, JSON.stringify([]));
  await apiCall("/agentlogs", "DELETE");
}

// ── Tasks APIs ──────────────────────────────────────────────────────────────
export function getTasks(): Task[] {
  const local = localStorage.getItem(STORAGE_KEYS.tasks);
  return local ? JSON.parse(local) : [];
}

export function getTask(id: string): Task | null {
  return getTasks().find((t) => t.id === id) || null;
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  // Fire-and-forget sync to backend
  await apiCall("/sync", "POST", { tasks });
}

export async function addTask(task: Omit<Task, "id" | "created" | "completionPercent" | "subtasks" | "pendingActions" | "state" | "priorityScore" | "rescheduleCount" | "alertTier">): Promise<Task> {
  const tasks = getTasks();
  const fullTask: Task = {
    ...task,
    id: "t" + Date.now(),
    state: "ON_TRACK",
    alertTier: "notification",
    priorityScore: 30,
    rescheduleCount: 0,
    completionPercent: 0,
    subtasks: [],
    pendingActions: [],
    created: new Date().toISOString(),
  };
  tasks.push(fullTask);
  await saveTasks(tasks);
  return fullTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx < 0) return null;

  const updatedTask = { ...tasks[idx], ...updates };
  tasks[idx] = updatedTask;
  await saveTasks(tasks);
  return updatedTask;
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = getTasks().filter((t) => t.id !== id);
  await saveTasks(tasks);
  await apiCall(`/tasks/${id}`, "DELETE");
}

// Add a manual step (subtask)
export async function addSubtask(taskId: string, title: string, estMinutes: number): Promise<Task | null> {
  const task = getTask(taskId);
  if (!task) return null;

  const newSubtask: Subtask = {
    id: "s" + Date.now(),
    title,
    estMinutes,
    firstSentence: "Write down any quick bullet point to establish momentum first.",
    status: "pending",
    startedAt: null,
    completedAt: null,
  };

  const subtasks = [...(task.subtasks || []), newSubtask];
  const completionPercent = calculateCompletion(subtasks);
  return await updateTask(taskId, { subtasks, completionPercent });
}

// Toggle status of a step (subtask)
export async function toggleSubtask(taskId: string, subtaskId: string): Promise<Task | null> {
  const task = getTask(taskId);
  if (!task) return null;

  const subtasks = (task.subtasks || []).map((sub) => {
    if (sub.id === subtaskId) {
      const isDone = sub.status === "done";
      return {
        ...sub,
        status: (isDone ? "pending" : "done") as any,
        completedAt: isDone ? null : Date.now(),
      };
    }
    return sub;
  });

  const completionPercent = calculateCompletion(subtasks);
  return await updateTask(taskId, { subtasks, completionPercent });
}

// Help calculate completion percent of subtasks
function calculateCompletion(subtasks: Subtask[]): number {
  if (!subtasks.length) return 0;
  const doneCount = subtasks.filter((s) => s.status === "done").length;
  return Math.round((doneCount / subtasks.length) * 100);
}

// ── Client-Side API Agent integrations ──────────────────────────────────────

// Real Gemini-powered study assistant daily digest generator
export async function generateDailyDigest(): Promise<string> {
  const student = getStudent();
  const tasks = getTasks();
  const settings = getSettings();

  if (settings.demoMode) {
    // Generate fallback digest locally
    const cCount = tasks.filter((t) => t.state === "CRITICAL").length;
    const priorityTitle = tasks[0]?.title || "your studies";
    if (cCount > 0) {
      return `Hey ${student?.name || "there"}, you've got ${cCount} high-priority study blocks requiring action. Let's start with just 15 minutes of "${priorityTitle}" to build momentum.`;
    }
    return `Good morning ${student?.name || "there"}. Your schedule looks beautifully clear today. A great day to knock out a quick step from "${priorityTitle}" early.`;
  }

  const result = await apiCall("/gemini/digest", "POST", { student, tasks });
  return result?.text || "Let's make some simple, actionable progress on your tasks today.";
}

// Real Gemini-powered Planner Agent
export async function runPlannerAgent(taskId: string): Promise<Task | null> {
  const task = getTask(taskId);
  const student = getStudent();
  if (!task) return null;

  const settings = getSettings();
  if (settings.demoMode) {
    // Demo Mode: simulate loading steps
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const demoSteps: Subtask[] = [
      {
        id: "ds1",
        title: "Review the grading criteria and core guidelines",
        estMinutes: 15,
        firstSentence: `Read the first 3 bullet points of the rubric first to know exactly what is expected.`,
        status: "pending",
        startedAt: null,
        completedAt: null,
      },
      {
        id: "ds2",
        title: "Draft a 3-bullet core outline of your main points",
        estMinutes: 30,
        firstSentence: "Write: 'Draft Outline: 1. Introduction, 2. Main findings, 3. Summary'.",
        status: "pending",
        startedAt: null,
        completedAt: null,
      },
      {
        id: "ds3",
        title: "Write the rough draft section by section",
        estMinutes: 90,
        firstSentence: "Write down the first paragraph without worrying about typos — just let it flow.",
        status: "pending",
        startedAt: null,
        completedAt: null,
      },
    ];
    const completionPercent = 0;
    const updated = await updateTask(taskId, { subtasks: demoSteps, completionPercent });
    await logAgentReasoning({
      taskId,
      taskTitle: task.title,
      summary: "Planner Agent decomposed task into steps",
      toolChain: [
        { tool: "decompose_task", result: "3 steps created", reasoning: "Broke project down into modular Pomodoro blocks" },
        { tool: "classify_obstacle_type", result: "ambiguity", reasoning: "Created explicit opening instructions for each step" },
      ],
      outcome: "Task planned with 3 actionable steps",
    });
    return updated;
  }

  // Real API call
  const res = await apiCall("/gemini/plan", "POST", {
    title: task.title,
    deadline: task.deadline,
    gradeWeight: task.gradeWeight,
    category: task.category,
    student,
  });

  if (res && Array.isArray(res.steps)) {
    const subtasks: Subtask[] = res.steps.map((s: any, idx: number) => ({
      id: "s" + idx + "_" + Date.now(),
      title: s.title,
      estMinutes: s.estMinutes,
      firstSentence: s.firstSentence,
      status: "pending",
      startedAt: null,
      completedAt: null,
    }));
    const updated = await updateTask(taskId, { subtasks, completionPercent: 0 });
    await logAgentReasoning({
      taskId,
      taskTitle: task.title,
      summary: "Planner Agent analyzed prompt and constructed study curriculum",
      toolChain: [
        { tool: "decompose_task", result: `${subtasks.length} steps`, reasoning: "Calculated steps from prompt description and due date" },
        { tool: "first_sentence_generator", result: "configured", reasoning: "Wrote specific cheat codes matched to obstacle type" },
      ],
      outcome: "Task planned successfully with Gemini",
    });
    return updated;
  }

  return task;
}

// Real Gemini-powered Monitoring Agent
export async function runMonitoringAgent(taskId: string): Promise<Task | null> {
  const task = getTask(taskId);
  const student = getStudent();
  if (!task) return null;

  const settings = getSettings();
  if (settings.demoMode) {
    // Demo Mode: simulate loading steps
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const now = Date.now();
    const daysLeft = Math.round((new Date(task.deadline).getTime() - now) / 86400000);

    const isCritical = daysLeft <= 3 && task.completionPercent < 30;
    const state = isCritical ? "CRITICAL" : daysLeft < 6 ? "AT_RISK" : "ON_TRACK";
    const alertTier = isCritical ? "alert" : "notification";
    const priorityScore = isCritical ? 85 : 45;

    const pendingActions: PendingAction[] = isCritical
      ? [
          {
            id: "pa_demo_1",
            type: "email",
            title: "Draft extension email",
            desc: "Requests a 2-day buffer from your instructor.",
            data: {
              recipient: "Professor/Instructor",
              subject: `Extension Request: ${task.title}`,
              body: `Dear Professor,\n\nI hope you are well.\n\nI am writing regarding the upcoming deadline for ${task.title}. Due to a combination of unexpected scheduling and structural hurdles in organizing my final resources, I would appreciate a brief 2-day extension to ensure my submission is of high quality.\n\nThank you for considering my request.\n\nBest regards,\n${student?.name || "[My Name]"}`,
            },
          },
        ]
      : [];

    const updated = await updateTask(taskId, {
      state,
      alertTier,
      priorityScore,
      pendingActions,
    });

    await logAgentReasoning({
      taskId,
      taskTitle: task.title,
      summary: `Risk assessment complete: state evaluated as ${state}`,
      toolChain: [
        { tool: "assess_risk", result: state, reasoning: `Deadline: ${daysLeft} days left. Completion: ${task.completionPercent}%.` },
        { tool: "draft_extension_email", result: isCritical ? "drafted" : "skipped", reasoning: isCritical ? "Critical risk warrants proactive communication options" : "Risk is low enough to monitor without email drafts" },
      ],
      outcome: isCritical ? "Critical alerts triggered and extension draft created" : "Monitored — status within bounds",
    });

    return updated;
  }

  // Real API call
  const res = await apiCall("/gemini/monitor", "POST", { task, student });
  if (res) {
    const updated = await updateTask(taskId, {
      state: res.state,
      alertTier: res.alertTier,
      priorityScore: res.priorityScore,
      pendingActions: res.pendingActions || [],
    });

    await logAgentReasoning({
      taskId,
      taskTitle: task.title,
      summary: `Monitoring Agent checked task risk: ${res.state}`,
      toolChain: res.toolChain || [],
      outcome: `Evaluated risk state as ${res.state}. priorityScore updated to ${res.priorityScore}.`,
    });

    return updated;
  }

  return task;
}

// ── NotebookLM APIs ──────────────────────────────────────────────────────────
export function getNotebookSources(): NotebookSource[] {
  const local = localStorage.getItem("sl_notebook_sources");
  return local ? JSON.parse(local) : [];
}

export async function saveNotebookSources(sources: NotebookSource[]): Promise<void> {
  localStorage.setItem("sl_notebook_sources", JSON.stringify(sources));
  await syncNotebookStateToServer();
}

export function getNotebookChat(): NotebookChatMessage[] {
  const local = localStorage.getItem("sl_notebook_chat");
  return local ? JSON.parse(local) : [];
}

export async function saveNotebookChat(chat: NotebookChatMessage[]): Promise<void> {
  localStorage.setItem("sl_notebook_chat", JSON.stringify(chat));
  await syncNotebookStateToServer();
}

async function syncNotebookStateToServer() {
  const student = JSON.parse(localStorage.getItem(STORAGE_KEYS.student) || "null");
  const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || "[]");
  const behaviors = JSON.parse(localStorage.getItem(STORAGE_KEYS.behaviors) || "[]");
  const agentLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.agentLogs) || "[]");
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
  const focusSessions = JSON.parse(localStorage.getItem("sl_focus_sessions") || "[]");
  const notebookSources = JSON.parse(localStorage.getItem("sl_notebook_sources") || "[]");
  const notebookChat = JSON.parse(localStorage.getItem("sl_notebook_chat") || "[]");

  await apiCall("/sync", "POST", {
    student,
    tasks,
    behaviors,
    agentLogs,
    settings,
    focusSessions,
    notebookSources,
    notebookChat,
  });
}

export async function queryNotebookLM(
  messages: NotebookChatMessage[],
  sources: NotebookSource[],
  action: 'chat' | 'study_guide' | 'quiz' | 'outline' = 'chat'
): Promise<string> {
  const res = await apiCall("/notebook/query", "POST", { messages, sources, action });
  if (res && res.text) {
    return res.text;
  }
  throw new Error("Failed to generate response from study notebook.");
}
