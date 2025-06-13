const express = require('express');
const { google } = require('googleapis');
const cred = require("./credentials.json");
const cors = require('cors');
const path = require("path")
const bodyParser = require("body-parser");
const logger = require('morgan');
const luxon = require("luxon");
const sqlite = require("sqlite3");
const dotenv = require("dotenv").config()
const apikey = process.env.GEMINI_API_KEY

const app = express();

app.use(cors()); // allow requests from frontend
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

//shit for post requests
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

const SCOPES = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_PRIVATE_KEY = cred.private_key
const GOOGLE_CLIENT_EMAIL = cred.client_email
const GOOGLE_PROJECT_NUMBER = process.env.PROJECT_NUMBER
const GOOGLE_CALENDAR_ID = process.env.CALENDAR_ID

const jwtClient = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    SCOPES
);

const calendar = google.calendar({
    version: 'v3',
    project: GOOGLE_PROJECT_NUMBER,
    auth: jwtClient
});

//initialising database
const db = new sqlite.Database("./database/data.db", err => console.log(err));

app.get('/', (req, res) => {
    calendar.events.list({
        calendarId: GOOGLE_CALENDAR_ID,
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    }, (error, result) => {
        if (error) {
            res.send(JSON.stringify({ error: error }));
        } else {
            if (result.data.items.length) {
                res.send(JSON.stringify({ events: result.data.items }));
            } else {
                res.send(JSON.stringify({ message: 'No upcoming events found.' }));
            }
        }
    });
});

//testing Gemini API with frontend
app.post("/submit", async (req, res) => {
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: apikey });
    //calender shit
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/calendar",
    });
    const client = await auth.getClient();
    const calendar = google.calendar({ version: "v3", auth: client });

    const timeZone = "Asia/Kolkata";
    const today = luxon.DateTime.now().setZone(timeZone).startOf("day");

    const eventToday = await calendar.events.list({
        calendarId: GOOGLE_CALENDAR_ID,
        timeMin: today,
    });

    if (eventToday.length != 0) {
        return res.json({ message: "Study plan already set for today!" })
    } else {
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `User wants to study ${req.body.studyTopic}, in ${req.body.duration || "Decide on your own how many days the user will require to study"}, ${req.body.resources ? ("The user is following these resources, suggest some on your own too " + req.body.resources) : ""} and create a plan for that duration and return the response in json with suggested resources for each topic too.
        The JSON format should be - 
        {
        topic: topic which user wants to study,
        array of days
        day 1:
        topic,
        duration,
        resources,
        day 2:
        .
        .
        }
        and nothing else.`,
        });

        function extractJSONFromCodeBlock(text) {
            const regex = /```json\s*([\s\S]*?)\s*```/;
            const match = text.match(regex);
            if (match && match[1]) {
                try {
                    return JSON.parse(match[1]);
                } catch (err) {
                    console.error("Failed to parse JSON:", err);
                    return null;
                }
            }
            console.warn("No JSON block found.");
            return null;
        }

        const response = extractJSONFromCodeBlock(result.text);
        res.json({ message: `Study plan created for ${response.topic}` })

        let events = [];

        for (let i = 0; i < response.days.length; i++) {
            const eventDate = today.plus({ days: i });

            const start = eventDate.set({ hour: 12, minute: 0 });
            const end = start.plus({ hours: parseInt(response.days[i].duration[0]) });

            events.push({
                summary: response.days[i].topic,
                location: "India",
                description: `Resources: ${response.days[i].resources.join(", ")}`,
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
            });

            db.all("INSERT INTO userData(date, topic, resources, feedback) VALUES(?, ?, ?, ?)", eventDate.toISO(), response.days[i].topic, response.days[i].resources.join(", "), null, (err, rows) => console.log(err));
        }
        for (var event of events) {
            console.log(event);
            try {
                const res = await calendar.events.insert({
                    calendarId: GOOGLE_CALENDAR_ID,
                    resource: event,
                });
                console.log("✅ Created:", res.data.summary);
            } catch (err) {
                console.error("❌ Error creating event:", err.message);
            }
        }
    }
});

app.get("/feedback", (req, res) => {
    const timeZone = "Asia/Kolkata";
    const today = luxon.DateTime.now().setZone(timeZone).startOf("day");
    db.get(`SELECT * FROM userData WHERE date = ?`, today.toISO(), (err, row) => {
        if (row) {
            if (row.feedback != null) {
                res.json({ message: "yes" });
            } else {
                res.json({ message: "no" })
            }
        } else {
            res.json({ message: "noP" })
        }
    })
});

app.post("/submitFeedback", async (req, res) => {
    const timeZone = "Asia/Kolkata";
    const today = luxon.DateTime.now().setZone(timeZone).startOf("day");
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: apikey });
    db.all("UPDATE userData SET feedback = ? WHERE date = ?", req.body.fb, today.toISO(), (err, rows) => console.log(err));
    db.get(`SELECT * FROM userData WHERE date = ?`, today.toISO(), async (err, row) => {
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Act like a friendly and knowledgeable teacher. 
The student is new to the topic. Explain the concept step by step, 
using simple language and clear examples. Be supportive and encourage curiosity.

            User is studying ${row.topic} from resources - ${row.resources} and his feedback of 
            the user is ${req.body.fb}, suggest user some ways in which can improve more and get a better grip on the topic.`
        });
        db.all(`UPDATE userData SET aiRes = ? WHERE date = ?`, result.text, today.toISO(), (error, rows) => console.log(error));
    })
});

app.get("/fb", (req, res) => {
    const timeZone = "Asia/Kolkata";
    const today = luxon.DateTime.now().setZone(timeZone).startOf("day");
    try {
        db.get(`SELECT * FROM userData WHERE date = ?`, today.toISO(), (err, row) => {
            if (!row) return;
            res.json({ message: row.aiRes })
        });
    } catch (error) {
        console.log(error)
    }
});

app.listen(3000, () => console.log(`App listening on port 3000!`));
