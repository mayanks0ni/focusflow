"use client";

import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { StudyPlan } from "./PlanForm";

type Props = {
  plan: StudyPlan | null;
};

export function PlanViewer({ plan }: Props) {
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!plan) {
    return (
      <div className="glass rounded-3xl p-6 sm:p-8 flex items-center justify-center text-sm text-slate-600">
        Your study plan will appear here once it’s generated.
      </div>
    );
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback,
          // You can add ids here if your backend expects them (userId, planId, etc.)
        }),
      });

      if (!res.ok) {
        throw new Error("Bad response");
      }

      setFeedback("");
      setStatus("Feedback saved. Future plans can be adjusted using this.");
    } catch (err) {
      console.error(err);
      setStatus("Could not save feedback. Try again in a bit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="glass rounded-3xl p-6 sm:p-8 max-h-[420px] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Study plan
            </h2>
            {typeof plan.totalHours === "number" && (
              <p className="text-xs text-slate-500 mt-1">
                Estimated total time: ~{plan.totalHours} hours
              </p>
            )}
          </div>
        </div>

        <article className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-800 prose-li:text-slate-800 prose-strong:text-slate-900 prose-ul:marker:text-sky-500">
          <ReactMarkdown>{plan.planText || "*No plan text provided.*"}</ReactMarkdown>
        </article>
      </div>

      <form
        onSubmit={handleFeedbackSubmit}
        className="glass rounded-3xl p-6 sm:p-7 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            How did the last session go?
          </h3>
          <span className="text-[0.7rem] text-slate-500">
            This helps refine future plans.
          </span>
        </div>

        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g. 'Struggled with Fourier series, need more basic problems' or 'Felt easy, can speed up the pace'."
          className="w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-inner outline-none resize-none focus:ring-2 focus:ring-indigo-400/60"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.7rem] text-slate-500">
            You can submit short notes after each study session.
          </p>
          <button
            type="submit"
            disabled={isSaving || !feedback.trim()}
            className="inline-flex items-center rounded-2xl border border-white/60 bg-slate-900/90 px-4 py-1.5 text-xs font-medium text-white shadow hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save feedback"}
          </button>
        </div>

        {status && (
          <p className="text-[0.7rem] text-slate-600 mt-1">{status}</p>
        )}
      </form>
    </div>
  );
}
