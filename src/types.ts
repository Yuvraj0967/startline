export interface Student {
  name: string;
  tone: 'direct' | 'gentle' | 'funny';
  obstacleTypes: string[];
  onboardingComplete: boolean;
  weeklyGoal: string | null;
  weeklyGoalSet: number | null;
  joined: string;
}

export interface Subtask {
  id: string;
  title: string;
  estMinutes: number;
  firstSentence: string;
  status: 'pending' | 'in_progress' | 'done';
  startedAt: number | null;
  completedAt: number | null;
  abandoned?: boolean;
}

export interface PendingAction {
  id: string;
  type: 'email' | 'calendar_hold';
  title: string;
  desc: string;
  data: any;
}

export interface Task {
  id: string;
  title: string;
  deadline: string | number; // Support ISO string or millisecond timestamp
  gradeWeight: number;
  category: string;
  state: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
  alertTier: 'alert' | 'notification';
  priorityScore: number;
  rescheduleCount: number;
  completionPercent: number;
  subtasks: Subtask[];
  pendingActions: PendingAction[];
  goodEnough?: boolean;
  created: string;
  googleEventId?: string;
  lastSyncedAt?: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  subtaskId?: string;
  subtaskTitle?: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  completed: boolean;
  tabAwayCount: number;
  sessionObjectives: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  blocklistHits: string[];
}

export interface BehaviorLog {
  id: string;
  taskId: string;
  subtaskId: string;
  startLatency: number; // in seconds or minutes
  abandoned: boolean;
  tabAwaySecs: number;
  timestamp: string;
  duration?: number;
}

export interface AgentLogStep {
  tool: string;
  result: string;
  reasoning: string;
}

export interface AgentLog {
  id: string;
  taskId: string;
  taskTitle: string;
  summary: string;
  toolChain: AgentLogStep[];
  outcome: string;
  timestamp: string;
  demo?: boolean;
}

export interface Settings {
  geminiApiKey: string;
  model: string;
  demoMode: boolean;
  theme: 'dark' | 'light';
  calendarConnected: boolean;
  breakReminders: boolean;
  breakInterval: number;
  mealReminders: boolean;
  mealTimes: string[];
  spotifyPlaylists?: { id: string; name: string; url: string }[];
  blocklist: string[];
}

export interface NotebookSource {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'note' | 'syllabus' | 'url';
  created: string;
}

export interface NotebookChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}
