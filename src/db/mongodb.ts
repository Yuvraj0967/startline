import mongoose, { Schema, Document } from "mongoose";

// ==========================================
// 1. USER SCHEMA & MODEL
// ==========================================
export interface IUser extends Document {
  email: string;
  name: string;
  googleId?: string;
  tone: "direct" | "gentle" | "funny";
  obstacleTypes: string[];
  onboardingComplete: boolean;
  weeklyGoal: string | null;
  weeklyGoalSet: Date | null;
  theme: "dark" | "light";
  calendarConnected: boolean;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    googleId: { type: String },
    tone: { type: String, enum: ["direct", "gentle", "funny"], default: "gentle" },
    obstacleTypes: { type: [String], default: [] },
    onboardingComplete: { type: Boolean, default: false },
    weeklyGoal: { type: String, default: null },
    weeklyGoalSet: { type: Date, default: null },
    theme: { type: String, enum: ["dark", "light"], default: "dark" },
    calendarConnected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ==========================================
// 2. FOCUS SESSION SCHEMA & MODEL
// ==========================================
export interface IFocusSession extends Document {
  userId: string;
  taskId?: string;
  taskTitle?: string;
  subtaskId?: string;
  subtaskTitle?: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number; // calculated duration
  completed: boolean; // whether completed or abandoned
  tabAwayCount: number; // tally of visibility disruptions
  sessionObjectives: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  blocklistHits: string[]; // URLs of blocked pages accessed during session
}

const FocusSessionSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    taskId: { type: String },
    taskTitle: { type: String },
    subtaskId: { type: String },
    subtaskTitle: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationSeconds: { type: Number, required: true },
    completed: { type: Boolean, default: true },
    tabAwayCount: { type: Number, default: 0 },
    sessionObjectives: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    blocklistHits: { type: [String], default: [] },
  },
  { timestamps: true }
);

// ==========================================
// 3. GOOGLE CALENDAR EVENT SCHEMA & MODEL
// ==========================================
export interface IGoogleCalendarEvent extends Document {
  userId: string;
  googleEventId: string; // Google Calendar ID
  localTaskId?: string; // Links to local task in StartLine
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  syncStatus: "synced" | "pending" | "failed" | "revoked" | "deleted";
  lastSyncedAt: Date;
  syncErrorMessage?: string;
}

const GoogleCalendarEventSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    googleEventId: { type: String, required: true, unique: true, index: true },
    localTaskId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    syncStatus: {
      type: String,
      enum: ["synced", "pending", "failed", "revoked", "deleted"],
      default: "synced",
    },
    lastSyncedAt: { type: Date, default: Date.now },
    syncErrorMessage: { type: String },
  },
  { timestamps: true }
);

// Prevent mongoose model overwriting in hot-reloads
export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export const FocusSessionModel = mongoose.models.FocusSession || mongoose.model<IFocusSession>("FocusSession", FocusSessionSchema);
export const GoogleCalendarEventModel = mongoose.models.GoogleCalendarEvent || mongoose.model<IGoogleCalendarEvent>("GoogleCalendarEvent", GoogleCalendarEventSchema);
