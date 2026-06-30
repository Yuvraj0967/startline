import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "startline-db.json");

// Parse JSON request body
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// ── JSON Database Helpers ───────────────────────────────────────────────────
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { student: null, tasks: [], behaviors: [], agentLogs: [], settings: {}, focusSessions: [], notebookSources: [], notebookChat: [] };
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      student: data.student || null,
      tasks: data.tasks || [],
      behaviors: data.behaviors || [],
      agentLogs: data.agentLogs || [],
      settings: data.settings || {},
      focusSessions: data.focusSessions || [],
      notebookSources: data.notebookSources || [],
      notebookChat: data.notebookChat || [],
    };
  } catch (error) {
    console.error("Error reading database file:", error);
    return { student: null, tasks: [], behaviors: [], agentLogs: [], settings: {}, focusSessions: [], notebookSources: [], notebookChat: [] };
  }
}

function writeDB(data: any) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

// Ensure database file exists on startup
fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  writeDB({ student: null, tasks: [], behaviors: [], agentLogs: [], settings: {}, focusSessions: [], notebookSources: [], notebookChat: [] });
}

// ── API request logging ────────────────────────────────────────────────────
app.use("/api", (req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// ── Rest APIs ───────────────────────────────────────────────────────────────

// Get entire database state
app.get("/api/all", (_req, res) => {
  res.json(readDB());
});

// Bulk sync database state
app.post("/api/sync", (req, res) => {
  const current = readDB();
  const merged = {
    student: req.body.student || current.student,
    tasks: Array.isArray(req.body.tasks) ? req.body.tasks : current.tasks,
    behaviors: Array.isArray(req.body.behaviors) ? req.body.behaviors : current.behaviors,
    agentLogs: Array.isArray(req.body.agentLogs) ? req.body.agentLogs : current.agentLogs,
    settings: { ...current.settings, ...req.body.settings },
    focusSessions: Array.isArray(req.body.focusSessions) ? req.body.focusSessions : current.focusSessions,
    notebookSources: Array.isArray(req.body.notebookSources) ? req.body.notebookSources : current.notebookSources,
    notebookChat: Array.isArray(req.body.notebookChat) ? req.body.notebookChat : current.notebookChat,
  };
  writeDB(merged);
  res.json({
    ok: true,
    counts: {
      tasks: merged.tasks.length,
      behaviors: merged.behaviors.length,
      focusSessions: merged.focusSessions.length,
      notebookSources: merged.notebookSources.length,
      notebookChat: merged.notebookChat.length,
    },
  });
});

// Student profile APIs
app.get("/api/student", (_req, res) => {
  res.json(readDB().student || null);
});

app.put("/api/student", (req, res) => {
  const db = readDB();
  db.student = req.body;
  writeDB(db);
  res.json(db.student);
});

// Settings APIs
app.get("/api/settings", (_req, res) => {
  const db = readDB();
  res.json({
    ...(db.settings || {}),
    geminiApiKey: process.env.GEMINI_API_KEY ? "CONFIGURED_IN_ENV" : "",
  });
});

app.put("/api/settings", (req, res) => {
  const db = readDB();
  db.settings = { ...(db.settings || {}), ...req.body };
  writeDB(db);
  res.json({
    ...db.settings,
    geminiApiKey: process.env.GEMINI_API_KEY ? "CONFIGURED_IN_ENV" : "",
  });
});

// Tasks APIs
app.get("/api/tasks", (_req, res) => {
  res.json(readDB().tasks || []);
});

app.post("/api/tasks", (req, res) => {
  const db = readDB();
  const task = req.body;
  if (!task.id) {
    task.id = "t" + Date.now();
  }
  db.tasks = db.tasks || [];
  const idx = db.tasks.findIndex((t: any) => t.id === task.id);
  if (idx >= 0) {
    db.tasks[idx] = task;
  } else {
    db.tasks.push(task);
  }
  writeDB(db);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", (req, res) => {
  const db = readDB();
  db.tasks = db.tasks || [];
  const idx = db.tasks.findIndex((t: any) => t.id === req.params.id);
  if (idx < 0) {
    return res.status(404).json({ error: "Task not found" });
  }
  db.tasks[idx] = { ...db.tasks[idx], ...req.body, id: req.params.id };
  writeDB(db);
  res.json(db.tasks[idx]);
});

app.delete("/api/tasks/:id", (req, res) => {
  const db = readDB();
  db.tasks = db.tasks || [];
  const beforeCount = db.tasks.length;
  db.tasks = db.tasks.filter((t: any) => t.id !== req.params.id);
  writeDB(db);
  res.json({ deleted: beforeCount - db.tasks.length });
});

// Behavior logs APIs
app.get("/api/behaviors", (_req, res) => {
  res.json(readDB().behaviors || []);
});

app.post("/api/behaviors", (req, res) => {
  const db = readDB();
  const entry = {
    ...req.body,
    id: req.body.id || "bl" + Date.now(),
    timestamp: req.body.timestamp || new Date().toISOString(),
  };
  db.behaviors = db.behaviors || [];
  db.behaviors.push(entry);
  writeDB(db);
  res.status(201).json(entry);
});

app.put("/api/behaviors", (req, res) => {
  const db = readDB();
  db.behaviors = Array.isArray(req.body) ? req.body : db.behaviors;
  writeDB(db);
  res.json({ count: db.behaviors.length });
});

// Agent reasoning logs APIs
app.get("/api/agentlogs", (_req, res) => {
  res.json(readDB().agentLogs || []);
});

app.post("/api/agentlogs", (req, res) => {
  const db = readDB();
  const entry = {
    ...req.body,
    id: req.body.id || "al" + Date.now(),
    timestamp: req.body.timestamp || new Date().toISOString(),
  };
  db.agentLogs = [entry, ...(db.agentLogs || [])];
  writeDB(db);
  res.status(201).json(entry);
});

app.delete("/api/agentlogs", (_req, res) => {
  const db = readDB();
  db.agentLogs = [];
  writeDB(db);
  res.json({ ok: true });
});

// ── Focus Sessions APIs ──────────────────────────────────────────────────
app.get("/api/focus-sessions", (_req, res) => {
  res.json(readDB().focusSessions || []);
});

app.post("/api/focus-sessions", (req, res) => {
  const db = readDB();
  const session = {
    ...req.body,
    id: req.body.id || "fs" + Date.now(),
    startTime: req.body.startTime || new Date().toISOString(),
    endTime: req.body.endTime || new Date().toISOString(),
  };
  db.focusSessions = db.focusSessions || [];
  db.focusSessions.push(session);
  writeDB(db);
  res.status(201).json(session);
});

// ── Google Calendar Sync APIs ────────────────────────────────────────────
app.post("/api/calendar/sync", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: "missing_token", message: "OAuth access token is required." });
  }

  try {
    // 1. Fetch events from Google Calendar
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // sync past 30 days
    const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();  // sync next 60 days
    const gcalResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (gcalResponse.status === 401 || gcalResponse.status === 403) {
      return res.status(401).json({
        error: "auth_error",
        message: "Google Calendar authorization has expired or been revoked. Please reconnect in settings.",
      });
    }

    if (!gcalResponse.ok) {
      const errText = await gcalResponse.text();
      throw new Error(`Google API error: ${gcalResponse.status} - ${errText}`);
    }

    const gcalData: any = await gcalResponse.json();
    const googleEvents: any[] = gcalData.items || [];

    const db = readDB();
    const localTasks = db.tasks || [];
    let dbChanged = false;

    // 2. Local tasks to Google Calendar Sync (App -> Google)
    for (let task of localTasks) {
      const deadlineDate = new Date(task.deadline);
      const isDeadlineValid = !isNaN(deadlineDate.getTime());
      if (!isDeadlineValid) continue;

      const eventBody = {
        summary: `📚 ${task.title} [StartLine]`,
        description: `StartLine Study Goal\nCategory: ${task.category}\nGrade Weight: ${task.gradeWeight}%\nPriority Score: ${task.priorityScore}\nState: ${task.state}\nSync Token: ${task.id}`,
        start: {
          dateTime: deadlineDate.toISOString(),
        },
        end: {
          dateTime: new Date(deadlineDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        },
      };

      if (!task.googleEventId) {
        // Create event in Google Calendar
        const createRes = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventBody),
          }
        );

        if (createRes.ok) {
          const createdEvent: any = await createRes.json();
          task.googleEventId = createdEvent.id;
          task.lastSyncedAt = new Date().toISOString();
          dbChanged = true;
        }
      } else {
        // Update existing event in Google Calendar
        const updateRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.googleEventId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventBody),
          }
        );

        if (updateRes.status === 404) {
          // Event was deleted in Google Calendar directly, remove ref so we re-create it next time
          delete task.googleEventId;
          dbChanged = true;
        } else if (updateRes.ok) {
          task.lastSyncedAt = new Date().toISOString();
          dbChanged = true;
        }
      }
    }

    // 3. Google Calendar events to local tasks (Google -> App)
    for (let gevent of googleEvents) {
      // Look for [StartLine] tag or look for study/homework keywords
      const isStartLineTagged = gevent.description && gevent.description.includes("Sync Token:");
      const isStudyKeyword =
        gevent.summary &&
        (/study|exam|homework|project|assignment|quiz|test|syllabus/i.test(gevent.summary));

      if (isStartLineTagged || isStudyKeyword) {
        // Check if we already have this task synced
        const alreadyExists = localTasks.some(
          (t: any) => t.googleEventId === gevent.id || (gevent.description && gevent.description.includes(`Sync Token: ${t.id}`))
        );

        if (!alreadyExists) {
          const startTimeStr = gevent.start.dateTime || gevent.start.date;
          if (!startTimeStr) continue;

          // Parse categories
          let category = "Assignment";
          if (gevent.summary.toLowerCase().includes("exam") || gevent.summary.toLowerCase().includes("test")) {
            category = "Exam";
          } else if (gevent.summary.toLowerCase().includes("reading")) {
            category = "Reading";
          }

          // Create brand new study task locally
          const newLocalTask = {
            id: "t" + Date.now() + Math.random().toString(36).substr(2, 5),
            title: gevent.summary.replace("📚 ", "").replace(" [StartLine]", ""),
            deadline: new Date(startTimeStr).toISOString(),
            gradeWeight: 10,
            category: category,
            state: "ON_TRACK",
            alertTier: "notification",
            priorityScore: 30,
            rescheduleCount: 0,
            completionPercent: 0,
            subtasks: [
              {
                id: "st" + Date.now() + "1",
                title: "Decompose syllabus and directions",
                estMinutes: 20,
                firstSentence: "Review guidelines and materials list",
                status: "pending",
                startedAt: null,
                completedAt: null,
              },
            ],
            pendingActions: [],
            created: new Date().toISOString(),
            googleEventId: gevent.id,
            lastSyncedAt: new Date().toISOString(),
          };

          localTasks.push(newLocalTask);
          dbChanged = true;
        }
      }
    }

    if (dbChanged) {
      db.tasks = localTasks;
      writeDB(db);
    }

    res.json({ success: true, tasks: readDB().tasks });
  } catch (error: any) {
    console.error("Google Calendar Sync error:", error);
    res.status(500).json({ error: "sync_error", message: error.message || "An unexpected error occurred during synchronization." });
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  const db = readDB();
  res.json({
    status: "ok",
    dbFile: DB_FILE,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    counts: {
      tasks: (db.tasks || []).length,
      behaviors: (db.behaviors || []).length,
      agentLogs: (db.agentLogs || []).length,
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Gemini AI Services ─────────────────────────────────────────────────────

// Generate Daily AI Digest
app.post("/api/gemini/digest", async (req, res) => {
  const { student, tasks } = req.body;
  if (!ai) {
    return res.status(400).json({ error: "Gemini API key is not configured on the server." });
  }

  const activeTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.completionPercent < 100) : [];
  const tone = student?.tone || "gentle";
  const obstacle = student?.obstacleTypes?.[0] || "ambiguity";
  const name = student?.name || "there";

  const prompt = `
    You are the personal AI tutor of a student named ${name}. They are feeling blocked because of ${obstacle} (their dominant study obstacle).
    They prefer a tone that is ${tone} (direct, gentle, or funny).
    
    Here are their active tasks:
    ${activeTasks
      .map(
        (t: any) =>
          `- "${t.title}" (worth ${t.gradeWeight}% of grade, due in ${Math.round(
            (new Date(t.deadline).getTime() - Date.now()) / (24 * 3600 * 1000)
          )} days, currently ${t.completionPercent}% done)`
      )
      .join("\n")}

    Generate a highly supportive, personalized daily digest. It must be exactly 2 short sentences.
    - Sentence 1: Acknowledge their situation/progress, speaking directly to their dominant obstacle in their preferred tone.
    - Sentence 2: Give a highly specific, actionable micro-target (e.g. telling them to focus on just 1 small step of their highest priority task) to break their stalling.
    
    Speak directly to ${name} in the second person. Do not use markdown headers, bullets, or labels. Keep it highly organic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text?.trim() });
  } catch (error: any) {
    console.error("Gemini Digest Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI digest." });
  }
});

// Generate Task Steps (Planner Agent)
app.post("/api/gemini/plan", async (req, res) => {
  const { title, deadline, gradeWeight, category, student } = req.body;
  if (!ai) {
    return res.status(400).json({ error: "Gemini API key is not configured on the server." });
  }

  const tone = student?.tone || "gentle";
  const obstacle = student?.obstacleTypes?.[0] || "ambiguity";

  const prompt = `
    Decompose the following study task/assignment into a logical sequence of 3 to 5 highly concrete, actionable steps:
    Task: "${title}" (${category || "assignment"}), worth ${gradeWeight || 10}% of grade, due ${new Date(
    deadline
  ).toLocaleDateString()}.
    
    The student's primary obstacle is "${obstacle}" and they prefer a "${tone}" tone.
    
    For EACH step, write:
    1. A short, descriptive title (e.g., "Find 5 sources")
    2. A realistic time estimate in minutes (integer between 10 and 120)
    3. A specific, highly concrete "first sentence cheat code" (e.g., 'Open Google Scholar and type "ethics of machine learning" to find the first article.'). This is the absolute first action they should take to completely bypass blank-page procrastination. It must be written in the second person ("Open...", "Write...", "Read...").
    
    You must return a JSON array of objects with the exact schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Descriptive name of the step" },
              estMinutes: { type: Type.INTEGER, description: "Time estimate in minutes" },
              firstSentence: {
                type: Type.STRING,
                description: "Concrete opening sentence or cheat code to bypass procrastination",
              },
            },
            required: ["title", "estMinutes", "firstSentence"],
          },
        },
      },
    });

    const steps = JSON.parse(response.text || "[]");
    res.json({ steps });
  } catch (error: any) {
    console.error("Gemini Plan Error:", error);
    res.status(500).json({ error: error.message || "Failed to decompose task." });
  }
});

// Run Risk Assessment and Interventions (Monitoring Agent)
app.post("/api/gemini/monitor", async (req, res) => {
  const { task, student } = req.body;
  if (!ai) {
    return res.status(400).json({ error: "Gemini API key is not configured on the server." });
  }

  const daysLeft = Math.max(
    0.1,
    (new Date(task.deadline).getTime() - Date.now()) / (24 * 3600 * 1000)
  );
  const tone = student?.tone || "gentle";
  const obstacle = student?.obstacleTypes?.[0] || "ambiguity";
  const reward = student?.weeklyGoal || "your evening study break";

  const prompt = `
    You are the StartLine Monitoring Agent. Your role is to analyze a student's task and evaluate risk, generate personalized if-then interventions, and draft supportive actions.
    
    Task Information:
    - Title: "${task.title}"
    - Deadline: ${new Date(task.deadline).toLocaleDateString()} (${daysLeft.toFixed(1)} days left)
    - Weight: ${task.gradeWeight}% of grade
    - Completion: ${task.completionPercent}% done
    - Reschedules: ${task.rescheduleCount} times
    - Subtasks: ${JSON.stringify(task.subtasks || [])}
    
    Student Profile:
    - Main Obstacle: "${obstacle}"
    - Tone: "${tone}"
    - Chosen Reward: "${reward}"
    
    Perform these logical operations in your mind:
    1. Assess the risk level. If days left is very low (<2 days) and completion is low (<40%), or rescheduleCount >= 2, state is "CRITICAL". If days left < 4 and completion is <60%, state is "AT_RISK". Otherwise, "ON_TRACK".
    2. Calculate a priorityScore from 0 to 100 based on urgency (weight, days left, reschedules, completion).
    3. Select an if-then intervention matched to their main obstacle.
    4. If critical or at-risk, draft a helpful action:
       - draft_extension_email: Drafts an elegant, polite, and persuasive email to their professor/instructor requesting a brief, reasonable 2-3 day extension.
       - create_calendar_hold: Proposes a concrete date/time and duration for an intensive 2-hour study block.
    
    Return your evaluation as a JSON object matching the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            state: {
              type: Type.STRING,
              description: "Final evaluated state: 'ON_TRACK', 'AT_RISK', or 'CRITICAL'",
            },
            alertTier: {
              type: Type.STRING,
              description: "Alert tier: 'alert' (high risk) or 'notification' (low/med risk)",
            },
            priorityScore: {
              type: Type.INTEGER,
              description: "Evaluated priority score from 0 to 100",
            },
            toolChain: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tool: { type: Type.STRING, description: "Name of tool called, e.g. assess_risk, shrink_subtask, draft_extension_email, create_calendar_hold" },
                  result: { type: Type.STRING, description: "Action taken or outcome of the tool" },
                  reasoning: { type: Type.STRING, description: "Brief justification for calling this tool" },
                },
                required: ["tool", "result", "reasoning"],
              },
            },
            pendingActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "'email' or 'calendar_hold'" },
                  title: { type: Type.STRING, description: "Display name of the action" },
                  desc: { type: Type.STRING, description: "Sub-description of the action" },
                  data: {
                    type: Type.OBJECT,
                    properties: {
                      recipient: { type: Type.STRING, description: "e.g. 'Prof. Chen'" },
                      subject: { type: Type.STRING, description: "Email subject line" },
                      body: { type: Type.STRING, description: "Complete, beautifully written email body using placeholders like [My Name]" },
                      start_time: { type: Type.STRING, description: "ISO Date String for a calendar hold" },
                      duration_min: { type: Type.INTEGER, description: "Duration in minutes" },
                    },
                  },
                },
                required: ["type", "title", "desc", "data"],
              },
            },
          },
          required: ["state", "alertTier", "priorityScore", "toolChain", "pendingActions"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Gemini Monitor Error:", error);
    res.status(500).json({ error: error.message || "Failed to run Monitoring Agent." });
  }
});

// ── NotebookLM Grounded Assistant Endpoint ──────────────────────────────────
app.post("/api/notebook/query", async (req, res) => {
  const { messages, sources, action } = req.body;
  if (!ai) {
    return res.status(400).json({ error: "Gemini API key is not configured on the server." });
  }

  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return res.status(400).json({ error: "Please upload or paste at least one study source document." });
  }

  // Format sources into a structured context block
  const sourcesContext = sources.map((s: any, idx: number) => `
--- SOURCE DOCUMENT ${idx + 1} ---
Title: ${s.title}
Type: ${s.type || 'document'}
Content:
${s.content}
-------------------------------
  `).join("\n");

  let systemInstruction = `You are a helpful, expert academic AI Assistant modeled after NotebookLM, specifically designed to help students study and understand their materials.
Your job is to assist the student based STRICTLY on the provided SOURCE DOCUMENTS.

Here are the selected source documents:
${sourcesContext}

Guidelines:
1. Always base your answers on the facts and information presented in the provided source documents.
2. If the user's question or the task cannot be answered or fulfilled using ONLY the provided sources, start by stating: "Based on the provided source documents, I couldn't find explicit details on this topic. However, in general..." and provide a helpful, separated response.
3. Keep your answers clear, concise, well-structured, and highly readable.
4. Use academic, supportive language. Reference the title of the document(s) when you cite facts.
`;

  if (action === "study_guide") {
    systemInstruction += `
Task: Create a Comprehensive Study Guide.
Format:
- Start with a clear Title summarizing the study topics.
- **Key Definitions & Core Concepts**: Extract critical terminology and theories with bullet points.
- **Detailed Summary**: Summarize each source document's core message.
- **Takeaways & Review Topics**: List major questions or themes for the student to master.
`;
  } else if (action === "quiz") {
    systemInstruction += `
Task: Create an Interactive Self-Assessment Quiz & Flashcards.
Format:
- **Part 1: Multiple-Choice Questions (3 items)**
  - Present each question with options (A, B, C, D).
  - Include an expandable HTML details tag containing the correct answer and a brief explanation right below each question.
    Example:
    <details>
      <summary className="text-xs text-[#8b5cf6] font-bold cursor-pointer hover:underline mt-1">Reveal Answer</summary>
      <div className="mt-1 text-xs text-green-400 bg-green-500/10 p-2 rounded-lg border border-green-500/10">
        **Correct Answer: B**
        *Explanation*: ...
      </div>
    </details>
- **Part 2: Active Flashcards (3 items)**
  - Write them as Front (Question/Concept) and Back (Answer/Definition) lines.
`;
  } else if (action === "outline") {
    systemInstruction += `
Task: Create a Logical Study Outline / Syllabus Structure.
Format:
- Break down the sources into a hierarchical table of contents (Module 1, Module 2, etc.).
- Under each module, list specific sub-topics and provide a 1-sentence description.
- Create a recommended reading/study checklist based on these modules.
`;
  }

  try {
    const prompt = messages && messages.length > 0 
      ? messages[messages.length - 1].content 
      : "Hello! Can you summarize these source documents and help me get started?";

    let contents = "";
    if (messages && messages.length > 1) {
      contents = "Here is our previous chat history:\n" + 
        messages.slice(0, -1).map((m: any) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join("\n") +
        `\n\nStudent's latest query: ${prompt}`;
    } else {
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ text: response.text?.trim() });
  } catch (error: any) {
    console.error("Gemini NotebookLM Query Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate response from NotebookLM." });
  }
});

// ── Client static fallback & Vite integration ──────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Serve with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("  ╔══════════════════════════════════════╗");
    console.log("  ║   StartLine  –  Backend Running      ║");
    console.log(`  ║   http://localhost:${PORT}              ║`);
    console.log(`  ║   DB: data/startline-db.json         ║`);
    console.log("  ╚══════════════════════════════════════╝");
    console.log("");
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
