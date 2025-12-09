# FocusFlow

An AI-assisted study planning app that generates daily study plans, schedules them on Google Calendar, reminds you, and adapts based on your feedback.

> Backend: Node.js + Express + SQLite + Gemini API  
> Frontend: Next.js (App Router) + React + Tailwind-style CSS

---

## 📌 Overview

FocusFlow helps you answer one question every day:

> *"What should I study today, and how do I make it stick?"*

You tell FocusFlow **what you want to study**, for **how long**, and optionally **which resources** you’re using. The backend uses **Google Gemini** to generate a structured study plan, creates events in **Google Calendar**, and stores everything in a local **SQLite** database. After you finish studying, you submit **feedback**, and FocusFlow asks Gemini again to give you **personalised improvement tips**.

---

## ✨ Features

- 🧠 **AI-powered study plan generation** using Gemini (`@google/genai`)
- 📅 **Google Calendar integration** – creates timed events for today’s study plan
- 📨 **Reminders & visibility** – use Calendar notifications as reminders
- 📝 **Daily feedback flow**
  - System asks if you studied today
  - You submit feedback on how it went
- 📊 **Adaptive suggestions**
  - Gemini reads your feedback + topic + resources
  - Returns suggestions on how to improve and what to focus on next
- 💾 **SQLite persistence** using Knex & migrations
- 🖥 **Minimal Next.js frontend**
  - One-page, distraction-free UI
  - Markdown-rendered AI output

---

## 🧱 Architecture

**Backend (`server.js`)**
- Node.js + Express
- Google Calendar via `googleapis`
- Gemini via `@google/genai`
- SQLite (`sqlite3`) + Knex migrations
- Stores per-day study data in a `userData` table

**Frontend (`frontend/`)**
- Next.js 16 (App Router)
- React 19
- `ReactMarkdown` for rendering AI-generated text
- Talks to backend via `API_BASE_URL` (`frontend/lib/config.ts`)

**Database**
- SQLite file at `database/data.db`
- Managed by Knex using migrations

---

## 🗂 Project Structure

```txt
focusflow/
├─ server.js                # Express + Gemini + Google Calendar + SQLite logic
├─ package.json             # Backend deps
├─ knexfile.js              # Knex config (SQLite)
├─ database/
│  ├─ data.db               # SQLite database (created at runtime)
│  └─ migrations/
│     └─ 20251013...create_user_data_table.js
├─ frontend/
│  ├─ app/
│  │  ├─ layout.tsx         # Global layout / shell
│  │  └─ page.tsx           # Main FocusFlow UI
│  ├─ lib/config.ts         # API_BASE_URL for backend
│  ├─ public/               # Static assets
│  └─ package.json          # Frontend deps
├─ .env.sample              # Example env vars
├─ credentials.json         # Google service account key (not committed in real project)
├─ Dockerfile               # Backend container (Node + server.js)
└─ docker-compose.yml       # Backend + frontend stack (optional)
```

---

## 🔧 Tech Stack

**Backend**
- Node.js 18+
- Express
- `@google/genai`
- `googleapis` (Calendar API)
- `sqlite3`
- `knex`
- `dotenv`, `morgan`, `body-parser`, `cors`, `luxon`

**Frontend**
- Next.js 16
- React 19
- ReactDOM 19
- ReactMarkdown
- Tailwind-style global CSS (custom, not full Tailwind CLI here)

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/mayanks0ni/focusflow.git
cd focusflow
```

### 2. Backend setup

#### 2.1 Install dependencies

```bash
npm install
```

#### 2.2 Environment variables

Create a `.env` file based on `.env.sample`:

```bash
cp .env.sample .env
```

Then fill in:

```env
GEMINI_API_KEY="your_gemini_api_key"
PROJECT_NUMBER="your_gcp_project_number"
CALENDAR_ID="your_google_calendar_id"
```

- **GEMINI_API_KEY** – from Google AI Studio or Google Cloud
- **PROJECT_NUMBER** – numeric project identifier from Google Cloud console
- **CALENDAR_ID** – the calendar where study events will be created  
  (e.g. `primary` or a specific calendar’s ID)

> Make sure the service account used in `credentials.json` has access to this calendar (shared with it).

#### 2.3 Google credentials

Place your Google service account JSON as:

```txt
./credentials.json
```

`server.js` loads this file directly:

```js
const cred = require("./credentials.json");
```

It is used by `google.auth.GoogleAuth` to authenticate to Calendar.

#### 2.4 Database migration

The backend uses SQLite + Knex. To create the `userData` table:

```bash
npx knex migrate:latest
```

The migration `20251013...create_user_data_table.js` creates:

```txt
userData
- id        INTEGER PRIMARY KEY
- date      TEXT (ISO date, per day)
- topic     TEXT
- resources TEXT
- feedback  TEXT
- aiRes     TEXT (AI improvement suggestions)
```

#### 2.5 Run backend

```bash
node server.js
```

By default, the server runs on **http://localhost:8000**:

```js
app.listen(8000, () => console.log(`App listening on port 8000!`));
```

---

### 3. Frontend setup (Next.js)

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

By default, Next.js will start on **http://localhost:3000**.

The frontend reads the backend URL from `frontend/lib/config.ts`:

```ts
export const API_BASE_URL = "http://localhost:8000";
```

If you deploy the backend elsewhere, update this value accordingly.

---

### 4. Optional: Docker / docker-compose

There is a basic Docker setup:

- `Dockerfile` – Node 18 image, installs backend deps, runs migrations, starts `server.js`
- `docker-compose.yml` – defines `backend` and `frontend` services

Example usage:

```bash
docker-compose up --build
```

> 🔎 Note: The Dockerfile exposes port `3000`, while `server.js` listens on `8000`.  
> If you rely on Docker for production, you may want to:
> - Update `app.listen(...)` to use `3000`, **or**
> - Change the Dockerfile and compose ports to match `8000`.

For local development, running backend + frontend directly (without Docker) is usually simpler.

---

## 🧭 How the Flow Works

1. **User opens the frontend** at `http://localhost:3000`.
2. **Fill the form**:
   - Study topic (required)
   - Duration (optional – AI can decide)
   - Resources (optional – books, videos, etc.)
3. Frontend sends a `POST /submit` to the backend.
4. Backend:
   - Checks if there’s already a plan for **today** in `userData`.
   - If not:
     - Calls Gemini with a structured prompt.
     - Generates a daily plan, including time slots/resources.
     - Creates **events in Google Calendar** for today (`CALENDAR_ID`).
     - Saves topic, resources, and AI planning output into SQLite.
5. You study according to the calendar.
6. Later, the frontend asks whether you studied and shows a **feedback flow**:
   - `GET /feedback` – checks if feedback exists for today.
   - `POST /submitFeedback` – saves your feedback and asks Gemini to return improvement tips.
   - `GET /fb` – returns the AI-generated improvement suggestions for the UI to show.

---

## 📡 API Reference (Backend)

Base URL: `http://localhost:8000`

### `POST /submit`

Create today’s study plan and schedule it on Google Calendar.

**Request body (JSON):**

```json
{
  "studyTopic": "Semiconductor physics – PN junctions",
  "duration": "3 days",
  "resources": "Sedra/Smith book, Neso Academy YouTube playlist"
}
```

- `studyTopic` – **required**
- `duration` – optional (AI decides if not provided)
- `resources` – optional, but recommended

**Responses (JSON):**

- `{ "message": "Study plan already set for today!" }`  
  → Plan already exists in DB for today.
- `{ "message": "Study plan created for <topic>" }`  
  → New plan generated, events created, data stored.

---

### `GET /feedback`

Check if feedback has been submitted for today.

**Response (JSON):**

- `{ "message": "yes" }` – feedback exists for today
- `{ "message": "no" }` – plan exists but feedback not given
- `{ "message": "noP" }` – no plan for today
- `{ "message": "dbError" }` – internal DB error

---

### `POST /submitFeedback`

Save today’s feedback and generate improvement suggestions.

**Request body (JSON):**

```json
{
  "fb": "I understood the basics but struggled with derivations and numerical problems."
}
```

- `fb` – **required**, your free-form feedback text

**Responses (JSON):**

- `400` – `{ "message": "Feedback (fb) is required." }`
- `404` – `{ "message": "No study plan found for today." }`
- `200` – `{ "message": "Feedback saved and processed." }`
- `500` – `{ "message": "dbError" }` or `{ "message": "Internal server error" }`

The improvement advice is stored in `userData.aiRes` for today.

---

### `GET /fb`

Fetch the AI-generated improvement suggestions for today.

**Response (JSON):**

- `200` – `{ "message": "<AI advice text>" }`
- `404` – `{ "message": "No AI feedback found for today." }`
- `500` – `{ "error": "dbError" }` or `{ "error": "Internal server error" }`

---

### `GET /`

Internally used endpoint that lists upcoming events from the configured Google Calendar.  
(Not typically used by the frontend directly.)

---

## 🧠 Notes & Tips

- Time zone is currently hard-coded as `Asia/Kolkata` in `server.js`.  
  Change `TIME_ZONE` there if you’re in a different region.
- SQLite database lives in `./database/data.db`.  
  You can safely delete it during development if you want a clean reset (then re-run migrations).
- Make sure your **Calendar API** is enabled for the project linked to `PROJECT_NUMBER`.

---

## 🛠 Future Improvements (Ideas)

- Multi-day plan visualisation instead of only “today”
- Support for multiple users with authentication
- Per-topic history and statistics dashboard
- Export study logs as CSV / Markdown
- Direct email or Discord reminders

---

## 📜 License

No explicit license has been added yet.  
If you want to open-source this, add a `LICENSE` file (for example, MIT) and update this section.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a pull request

Bug reports, ideas, and improvements are always welcome!

