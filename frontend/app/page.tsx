"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL } from "@/lib/config";

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          <span>FocusFlow · Daily planning</span>
        </div>
        <h1 className="hero-title">FocusFlow</h1>
        <p className="hero-subtitle">
          Light, minimal planning that respects your attention.
        </p>
      </header>

      <main className="glass-card">{children}</main>
    </div>
  );
type FeedbackStatus = "yes" | "no" | "noP";

export default function HomePage() {
  const [studyTopic, setStudyTopic] = useState("");
  const [resources, setResources] = useState("");
  const [duration, setDuration] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("noP"); // default: plan form
  const [suggestion, setSuggestion] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Try to load status + suggestion, but NEVER block UI on it
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/feedback`);
        const data = await res.json();

        const msg = data.message as FeedbackStatus | undefined;
        if (msg === "yes" || msg === "no" || msg === "noP") {
          setFeedbackStatus(msg);
        }

        if (data.suggestion) {
          setSuggestion(data.suggestion);
        }
      } catch (err) {
        console.error("Error fetching /feedback:", err);
        // silently fall back to default "noP"
      }

      try {
        const res2 = await fetch(`${API_BASE_URL}/fb`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data2 = await res2.json();
        if (data2?.message) setSuggestion(data2.message);
      } catch (err) {
        console.error("Error fetching /fb:", err);
      }
    })();
  }, []);

  const handleStudySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitMessage(null);

    const payload = {
      studyTopic,
      resources: resources || null,
      duration: duration || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setSubmitMessage(data.message || "Study plan submitted.");
      setStudyTopic("");
      setResources("");
      setDuration("");
    } catch (err) {
      console.error("Study submission error:", err);
      setSubmitMessage("Submission failed. Please try again.");
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    const feedbackText = feedback;
    setFeedback("");
    setFeedbackSubmitted(true);

    try {
      await fetch(`${API_BASE_URL}/submitFeedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fb: feedbackText }),
      });
    } catch (err) {
      console.error("Feedback submit error:", err);
    }
  };

  // ========== UI BRANCHES ==========

  // 1) Already submitted feedback today
  if (feedbackStatus === "yes") {
    return (
      <Shell>
        <h2 className="card-title">Today&apos;s check-in is done</h2>
        <p className="card-subtitle">
          You already submitted feedback for today. Come back tomorrow for a new session.
        </p>

        <div>
          <div className="form-label" style={{ marginBottom: 6 }}>
            Suggestion for improving your next session
          </div>
          <div className="suggestion-block">
            <ReactMarkdown>
              {suggestion || "Preparing something helpful for you…"}
            </ReactMarkdown>
          </div>
        </div>
      </Shell>
    );
  }

  // 2) Need to submit feedback
  if (feedbackStatus === "no") {
    return (
      <Shell>
        <h2 className="card-title">Reflect on today&apos;s study</h2>
        <p className="card-subtitle">
          A short note is enough. Think about what helped and what didn&apos;t.
        </p>

        {feedbackSubmitted ? (
          <div className="status-message status-success">
            ✅ Thanks. Your feedback has been saved.
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="form">
            <div className="form-field">
              <label className="form-label">
                What stood out from today&apos;s session?
              </label>
              <textarea
                className="form-textarea"
                rows={5}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What worked, what felt confusing, what you’d change next time…"
              />
            </div>

            <button type="submit" className="secondary-button">
              Save feedback
            </button>
          </form>
        )}
      </Shell>
    );
  }

  // 3) Default: no plan yet (or backend failed) → show plan form
  return (
    <Shell>
      <h2 className="card-title">Create today&apos;s study plan</h2>
      <p className="card-subtitle">
        One clear block of work, an approximate duration, and you&apos;re ready to start.
      </p>

      <form onSubmit={handleStudySubmit} className="form">
        <div className="form-field">
          <label className="form-label">What are you going to study?</label>
          <input
            type="text"
            className="form-input"
            value={studyTopic}
            onChange={(e) => setStudyTopic(e.target.value)}
            placeholder="e.g. Calculus – Integration by parts"
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            From which resources? <span>(optional)</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={resources}
            onChange={(e) => setResources(e.target.value)}
            placeholder="e.g. lecture notes, textbook, YouTube playlist"
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            How much time do you need? <span>(optional)</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 45 minutes, 90 minutes"
          />
        </div>

        <button type="submit" className="primary-button">
          Save today&apos;s plan
        </button>
      </form>

      {submitMessage && (
        <div className="status-message">{submitMessage}</div>
      )}
    </Shell>
  );
}
