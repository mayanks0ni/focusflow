"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";

export type StudyPlan = {
  planText: string;
  totalHours?: number;
  suggestionSummary?: string;
  // add/adjust fields to match your backend response
};

type PlanFormProps = {
  onPlanGenerated: (plan: StudyPlan) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
};

const difficultyOptions = ["beginner", "intermediate", "advanced"] as const;

export function PlanForm({ onPlanGenerated, setLoading, setError }: PlanFormProps) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] =
    useState<(typeof difficultyOptions)[number]>("beginner");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please enter a topic first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          difficulty,
          targetDate: targetDate || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      // Adjust this mapping to match your actual backend structure
      const plan: StudyPlan = {
        planText: data.planText ?? data.plan ?? "",
        totalHours: data.totalHours,
        suggestionSummary: data.summary,
      };
      onPlanGenerated(plan);
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong while generating your plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass rounded-3xl p-6 sm:p-8 space-y-5"
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-800">
          What do you want to study?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Signals & Systems basics, DSA recursion, Linear Algebra"
          className="w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-inner outline-none focus:ring-2 focus:ring-sky-400/60"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-800">
            Difficulty
          </label>
          <div className="flex gap-2">
            {difficultyOptions.map((level) => {
              const active = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium capitalize transition ${
                    active
                      ? "border-sky-500 bg-sky-500/90 text-white shadow"
                      : "border-white/60 bg-white/60 text-slate-700 hover:bg-white/90"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-800">
            Target date (optional)
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-inner outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
          <p className="text-xs text-slate-500">
            Used to space out sessions on your calendar.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-800">
          Anything specific you want to focus on? <span className="text-slate-500 text-xs">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Weak topics, preferred resources, exam date details, etc."
          className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-inner outline-none resize-none focus:ring-2 focus:ring-indigo-400/60"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/35 hover:shadow-indigo-500/40 active:scale-[0.98] transition"
        >
          Generate plan
        </button>
      </div>
    </form>
  );
}
