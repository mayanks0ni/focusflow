// server.js
require("dotenv").config();

const express = require("express");
const { google } = require("googleapis");
const cred = require("./credentials.json");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const logger = require("morgan");
const luxon = require("luxon");
const sqlite = require("sqlite3");

const apikey = process.env.GEMINI_API_KEY;

const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

// ================== GOOGLE CALENDAR SETUP (UNCHANGED STYLE) ==================
const SCOPES = "https://www.googleapis.com/auth/calendar";
const GOOGLE_PRIVATE_KEY = cred.private_key;
const GOOGLE_CLIENT_EMAIL = cred.client_email;
const GOOGLE_PROJECT_NUMBER = process.env.PROJECT_NUMBER;
const GOOGLE_CALENDAR_ID = process.env.CALENDAR_ID;

const jwtClient = new google.auth.JWT(
  GOOGLE_CLIENT_EMAIL,
  null,
  GOOGLE_PRIVATE_KEY,
  SCOPES
);

const calendar = google.calendar({
  version: "v3",
  project: GOOGLE_PROJECT_NUMBER,
  auth: jwtClient,
});

// ================== SQLITE DB SETUP ==================
const db = new sqlite.Database("./database/data.db", (err) =>
  console.log("DB error:", err)
);

// OPTIONAL: ensure table exists
db.run(
  `
  CREATE TABLE IF NOT EXISTS userData (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    topic TEXT NOT NULL,
    resources TEXT,
    feedback TEXT,
    aiRes TEXT
  );
`,
  (err) => {
    if (err) console.log("Table create error:", err);
  }
);

// ================== HELPERS ==================
function extractJSONFromCodeBlock(text) {
  if (!text) return null;

  // 1) Try ```json ... ``` block
  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (err) {
      console.error("Failed to parse JSON from ```json``` block:", err);
    }
  }

  // 2) Try raw JSON in text (first { ... last })
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (err2) {
      console.error("Failed to parse JSON from substring:", err2);
    }
  }

  console.warn("No JSON block found in Gemini response.");
  return null;
}

const TIME_ZONE = "Asia/Kolkata";

// ================== ROUTES ==================

// Test route: list upcoming events
app.get("/", (req, res) => {
  calendar.events.list(
    {
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    },
    (error, result) => {
      if (error) {
        res.send(JSON.stringify({ error: error }));
      } else {
        if (result.data.items.length) {
          res.send(JSON.stringify({ events: result.data.items }));
        } else {
          res.send(JSON.stringify({ message: "No upcoming events found." }));
        }
      }
    }
  );
});

// ================== /submit – create study plan & calendar events ==================
app.post("/submit", async (req, res) => {
  try {
    // ----- GEMINI IMPORT (SAME STYLE YOU USED) -----
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: apikey });

    // ----- (OPTIONAL) calendar shit like in your code -----
    const auth = new google.auth.GoogleAuth({
      keyFile: "credentials.json",
      scopes: "https://www.googleapis.com/auth/calendar",
    });
    const client = await auth.getClient();
    const localCalendar = google.calendar({ version: "v3", auth: client });

    const timeZone = TIME_ZONE;
    const today = luxon.DateTime.now().setZone(timeZone).startOf("day");

    const eventToday = await localCalendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: today.toISO(), // needs ISO string
      timeMax: today.endOf("day").toISO(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const existingEvents = eventToday.data.items || [];

    if (existingEvents.length !== 0) {
      return res.json({ message: "Study plan already set for today!" });
    } else {
      // ---------- GEMINI PROMPT ----------
      const prompt = `
User wants to study ${req.body.studyTopic}.
Duration: ${
        req.body.duration ||
        "Decide on your own how many days the user will require to study."
      }
Resources: ${
        req.body.resources
          ? `The user is following these resources: ${req.body.resources}. Also suggest some on your own.`
          : "User did not specify resources. Suggest good ones."
      }

Create a day-by-day study plan.

Return ONLY valid JSON. No explanation, no markdown.

JSON format MUST be:

{
  "topic": "<topic which user wants to study>",
  "days": [
    {
      "day": 1,
      "topic": "<what to study on day 1>",
      "duration": "<e.g. 2 hours>",
      "resources": ["resource 1", "resource 2"]
    },
    {
      "day": 2,
      "topic": "<...>",
      "duration": "<...>",
      "resources": ["..."]
    }
  ]
}
- "days" must be an array of day objects.
- "resources" must be an array of strings.
      `;

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash", // <— updated model
        contents: prompt,
      });

      const rawText = (result.text || "").toString().trim();
      const response = extractJSONFromCodeBlock(rawText);

      if (!response || !response.topic || !Array.isArray(response.days)) {
        console.error("Invalid JSON from Gemini:", rawText);
        return res
          .status(500)
          .json({ message: "Failed to generate valid study plan." });
      }

      // Send quick response to frontend
      res.json({ message: `Study plan created for ${response.topic}` });

      // ---------- Create calendar events + DB rows ----------
      let events = [];

      for (let i = 0; i < response.days.length; i++) {
        const dayInfo = response.days[i];
        const eventDate = today.plus({ days: i });

        // Try to parse numeric duration from string (e.g. "2 hours" -> 2)
        let hours = 2;
        if (typeof dayInfo.duration === "number") {
          hours = dayInfo.duration;
        } else if (typeof dayInfo.duration === "string") {
          const match = dayInfo.duration.match(/\d+/);
          if (match) hours = parseInt(match[0], 10);
        }

        const start = eventDate.set({ hour: 12, minute: 0 });
        const end = start.plus({ hours });

        const resourcesArr = Array.isArray(dayInfo.resources)
          ? dayInfo.resources
          : [];
        const resourcesStr = resourcesArr.join(", ");

        const event = {
          summary: dayInfo.topic || response.topic,
          location: "India",
          description: `Resources: ${resourcesStr}`,
          start: {
            dateTime: start.toISO(),
            timeZone,
          },
          end: {
            dateTime: end.toISO(),
            timeZone,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 },
              { method: "popup", minutes: 10 },
            ],
          },
        };

        events.push(event);

        db.all(
          "INSERT INTO userData(date, topic, resources, feedback, aiRes) VALUES(?, ?, ?, ?, ?)",
          eventDate.toISO(),
          dayInfo.topic || response.topic,
          resourcesStr,
          null,
          null,
          (err, rows) => console.log("DB insert error:", err)
        );
      }

      for (const event of events) {
        try {
          const created = await localCalendar.events.insert({
            calendarId: GOOGLE_CALENDAR_ID,
            resource: event,
          });
          console.log("✅ Created:", created.data.summary);
        } catch (err) {
          console.error("❌ Error creating event:", err.message);
        }
      }
    }
  } catch (error) {
    console.error("ERROR IN /submit:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ================== /feedback – check if today's feedback exists ==================
app.get("/feedback", (req, res) => {
  const timeZone = TIME_ZONE;
  const today = luxon.DateTime.now().setZone(timeZone).startOf("day");

  db.get(
    `SELECT * FROM userData WHERE date = ?`,
    today.toISO(),
    (err, row) => {
      if (err) {
        console.log("DB error /feedback:", err);
        return res.status(500).json({ message: "dbError" });
      }

      if (row) {
        if (row.feedback != null) {
          res.json({ message: "yes" });
        } else {
          res.json({ message: "no" });
        }
      } else {
        res.json({ message: "noP" });
      }
    }
  );
});

// ================== /submitFeedback – save feedback + Gemini advice ==================
app.post("/submitFeedback", async (req, res) => {
  const timeZone = TIME_ZONE;
  const today = luxon.DateTime.now().setZone(timeZone).startOf("day");

  const fb = req.body.fb;
  if (!fb) {
    return res.status(400).json({ message: "Feedback (fb) is required." });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: apikey });

    db.all(
      "UPDATE userData SET feedback = ? WHERE date = ?",
      fb,
      today.toISO(),
      (err, rows) => console.log("DB update feedback error:", err)
    );

    db.get(
      `SELECT * FROM userData WHERE date = ?`,
      today.toISO(),
      async (err, row) => {
        if (err) {
          console.log("DB error /submitFeedback SELECT:", err);
          return res.status(500).json({ message: "dbError" });
        }
        if (!row) {
          return res
            .status(404)
            .json({ message: "No study plan found for today." });
        }

        const prompt = `
Act like a friendly and knowledgeable teacher. 
The student is new to the topic. Explain the concept step by step, 
using simple language and clear examples. Be supportive and encourage curiosity.

User is studying ${row.topic} from resources - ${row.resources}.
The user's feedback is: ${fb}.
Suggest some ways they can improve more and get a better grip on the topic.
        `;

        try {
          const result = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });

          const advice = (result.text || "").toString().trim();

          db.all(
            `UPDATE userData SET aiRes = ? WHERE date = ?`,
            advice,
            today.toISO(),
            (error, rows) => console.log("DB update aiRes error:", error)
          );

          return res.json({ message: "Feedback saved and processed." });
        } catch (err2) {
          console.error("Gemini error /submitFeedback:", err2);
          return res
            .status(500)
            .json({ message: "Failed to generate AI feedback." });
        }
      }
    );
  } catch (error) {
    console.error("ERROR IN /submitFeedback:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ================== /fb – get today's AI feedback text ==================
app.get("/fb", (req, res) => {
  const timeZone = TIME_ZONE;
  const today = luxon.DateTime.now().setZone(timeZone).startOf("day");

  try {
    db.get(
      `SELECT * FROM userData WHERE date = ?`,
      today.toISO(),
      (err, row) => {
        if (err) {
          console.log("DB error /fb:", err);
          return res.status(500).json({ error: "dbError" });
        }
        if (!row || !row.aiRes) {
          return res
            .status(404)
            .json({ message: "No AI feedback found for today." });
        }
        res.json({ message: row.aiRes });
      }
    );
  } catch (error) {
    console.log("ERROR /fb:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ================== START SERVER ON PORT 8000 ==================
app.listen(8000, () => console.log(`App listening on port 8000!`));
