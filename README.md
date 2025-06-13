
# FocusFlow

**FocusFlow** is a smart study planning assistant that helps users create effective study plans using AI. Just input a topic, and FocusFlow will generate a personalized study plan, determine the required time and resources (optionally using Gemini API), and automatically schedule events on your Google Calendar with email reminders. You can provide feedback on your progress, and the system adapts accordingly to help you strengthen weaker areas.

---

## ✨ Features

- AI-powered study plan generation using Gemini API
- Google Calendar integration for scheduling study sessions
- Email reminders for study events
- User feedback system to identify strengths and weaknesses
- Tailored suggestions to improve weak topics

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vite, React, Tailwind CSS
- **Database**: SQLite
- **APIs**: Google Calendar API, Gemini API

---

## 🔧 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/focusflow.git
cd focusflow
```

> *(Note: Replace with your actual repo if publishing)*

---

### 2. Install Backend Dependencies

```bash
npm install
```

---

### 3. Environment Variables

Create a `.env` file in the root with the following:

```
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

You also need `credentials.json` for the Google Calendar API, which should be placed in the root directory. [Follow this guide to get credentials](https://developers.google.com/calendar/api/quickstart/nodejs).

---

### 4. Set Up the Database

The SQLite database is located at `database/data.db`. No further setup is needed unless you want to reset it.

---

### 5. Start the Backend Server

```bash
node server.js
```

---

### 6. Set Up the Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📦 Folder Structure

```
focusflow/
├── server.js
├── package.json
├── .env
├── credentials.json
├── database/
│   └── data.db
├── frontend/
│   ├── index.html
│   ├── src/
│   ├── public/
│   └── ...
```

---

## 🧠 Feedback & Learning Loop

- After completing a session, users can provide feedback about their understanding.
- The system uses this data to refine the study plan and provide additional resources or practice.

---

## 📬 Contact

For any questions or contributions, feel free to open an issue or pull request!

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
