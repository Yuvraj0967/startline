# StartLine

StartLine is a web-based, agentic study companion that learns how a student avoids starting work and delivers a matched intervention when they are about to stall. It combines task planning, risk monitoring, personalized study prompts, focus sessions, Google Calendar sync, and a grounded Notebook workspace.

## How it works

The React/Vite client collects a student's profile, tasks, behaviors, focus sessions, and study sources. An Express/TypeScript server stores local application state in a JSON file and exposes APIs for tasks, student settings, behaviors, focus sessions, calendar sync, and AI-assisted planning. Gemini-powered endpoints generate daily digests, concrete task steps, risk assessments, and source-grounded study help when GEMINI_API_KEY is configured. The app can run with Vite in development or build a production bundle served by the Node server.

## Components

| Component | Language | Role |
| --- | --- | --- |
| React client in src/ | TypeScript/React | Study dashboard, task planning, focus sessions, interventions, and Notebook workspace |
| server.ts | TypeScript/Express | API server, local JSON persistence, Gemini calls, and Google Calendar synchronization |
| data/startline-db.json | JSON | Local persistence for student data, tasks, behavior logs, sessions, and notebook state |
| Vite | TypeScript/JavaScript | Development server and production client build |

## Run it

Prerequisites: Node.js 18+ and a Gemini API key for AI features.

~~~bash
npm install
# Create .env.local and add:
# GEMINI_API_KEY=your_key_here
npm run dev
~~~

The development server uses port 3000 by default. Set PORT to use another port.

For a production build:

~~~bash
npm run build
npm start
~~~

## Example output

When the server starts, it prints:

~~~text
StartLine – Backend Running
http://localhost:3000
DB: data/startline-db.json
~~~

## What I learned / limitations

- The default persistence layer is a local JSON file; it is useful for a prototype but is not a multi-user production database.
- AI features depend on GEMINI_API_KEY, and Google Calendar sync requires a valid OAuth access token.
- StartLine is a working prototype focused on demonstrating personalized study interventions and agentic workflows.
