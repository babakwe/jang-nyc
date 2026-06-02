"use client";

import { useState, useCallback } from "react";
import certData from "./data/certifications.json";

type Question = {
  id: string;
  q: string;
  choices: string[];
  answer: number;
  exp: string;
};

type Category = {
  id: string;
  title: string;
  emoji: string;
  color: string;
  bg: string;
  description: string;
  count: number;
};

const questions = certData.questions as unknown as Record<string, Question[]>;

// ── Quiz screen ──────────────────────────────────────────────────────────────
function QuizScreen({
  cat,
  onBack,
}: {
  cat: Category;
  onBack: () => void;
}) {
  const qs: Question[] = questions[cat.id] || [];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<boolean[]>([]);

  const q = qs[idx];
  const isCorrect = picked === q?.answer;

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
    setHistory((h) => [...h, i === q.answer]);
  }

  function next() {
    if (idx + 1 >= qs.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }

  function restart() {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setHistory([]);
  }

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">{passed ? "🎉" : "📚"}</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: cat.color }}>
            {passed ? "Great job!" : "Keep studying!"}
          </h2>
          <p className="text-gray-500 mb-6">
            {score} / {qs.length} correct — {pct}%
          </p>
          <div className="h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: passed ? "#16a34a" : "#f59e0b",
              }}
            />
          </div>
          <p className="text-sm text-gray-400 mb-8">
            {passed
              ? "You're above the 70% passing threshold. Review any wrong answers before your exam."
              : "Study the explanations and try again. You'll get there."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex-1 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: cat.color }}
            >
              Try Again
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              ← All Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: cat.color }}
      >
        <button
          onClick={onBack}
          className="text-white/80 hover:text-white text-lg"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">
            {cat.emoji} {cat.title}
          </div>
          <div className="text-white/70 text-xs">
            Question {idx + 1} of {qs.length}
          </div>
        </div>
        <div className="text-white font-bold text-sm">
          {score}/{idx + (picked !== null ? 1 : 0)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/20" style={{ backgroundColor: cat.bg }}>
        <div
          className="h-full transition-all"
          style={{
            width: `${((idx + (picked !== null ? 1 : 0)) / qs.length) * 100}%`,
            backgroundColor: cat.color,
          }}
        />
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm mt-4">
          <p className="text-gray-900 font-semibold text-base leading-relaxed">
            {q.q}
          </p>
        </div>

        {/* Choices */}
        <div className="flex flex-col gap-2">
          {q.choices.map((choice, i) => {
            const isThis = picked === i;
            const isCorrectChoice = i === q.answer;
            let bg = "bg-white";
            let border = "border-gray-200";
            let text = "text-gray-800";

            if (picked !== null) {
              if (isCorrectChoice) {
                bg = "bg-green-50";
                border = "border-green-400";
                text = "text-green-800";
              } else if (isThis) {
                bg = "bg-red-50";
                border = "border-red-400";
                text = "text-red-800";
              }
            }

            return (
              <button
                key={i}
                onClick={() => choose(i)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${bg} ${border} ${text} ${
                  picked === null ? "hover:border-blue-200 hover:bg-blue-50/30" : ""
                }`}
              >
                <span className="font-bold mr-2">
                  {["A", "B", "C", "D"][i]}.
                </span>
                {choice}
                {picked !== null && isCorrectChoice && (
                  <span className="ml-2">✓</span>
                )}
                {picked !== null && isThis && !isCorrectChoice && (
                  <span className="ml-2">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {picked !== null && q.exp && (
          <div
            className="mt-4 p-4 rounded-xl border-l-4 bg-amber-50 border-amber-400"
          >
            <p className="text-xs font-bold text-amber-700 mb-1">
              {isCorrect ? "✓ Correct!" : "✗ Wrong"} — Explanation
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">{q.exp}</p>
          </div>
        )}

        {/* Next button */}
        {picked !== null && (
          <button
            onClick={next}
            className="w-full mt-4 py-4 rounded-xl font-bold text-white text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: cat.color }}
          >
            {idx + 1 < qs.length ? "Next Question →" : "See Results"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Home screen ──────────────────────────────────────────────────────────────
export default function Home() {
  const [activeCat, setActiveCat] = useState<Category | null>(null);

  if (activeCat) {
    return <QuizScreen cat={activeCat} onBack={() => setActiveCat(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-8"
        style={{ background: "linear-gradient(135deg, #003087 0%, #0052A5 100%)" }}
      >
        <div className="max-w-lg mx-auto">
          <div className="text-4xl mb-2">📚</div>
          <h1 className="text-3xl font-black text-white mb-1">Jàng NYC</h1>
          <p className="text-blue-200 text-sm font-medium mb-1">
            Free Certification & License Prep
          </p>
          <p className="text-blue-300 text-xs">
            Practice tests for licenses & certifications you need to work in New York
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-6 text-sm">
          <span className="text-gray-500">
            <span className="font-bold text-gray-900">
              {certData.categories.reduce((s, c) => s + c.count, 0)}
            </span>{" "}
            practice questions
          </span>
          <span className="text-gray-500">
            <span className="font-bold text-gray-900">
              {certData.categories.length}
            </span>{" "}
            certifications
          </span>
          <span className="text-gray-500">
            <span className="font-bold text-green-600">Free</span>
          </span>
        </div>
      </div>

      {/* Category cards */}
      <div className="max-w-lg mx-auto p-4 flex flex-col gap-3">
        {certData.categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat as Category)}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100
                       hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
            style={{ borderLeftWidth: 4, borderLeftColor: cat.color }}
          >
            <span className="text-3xl">{cat.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-sm">{cat.title}</div>
              <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                {cat.description}
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cat.bg, color: cat.color }}
              >
                {cat.count} Qs
              </span>
              <span className="text-gray-400 text-xs mt-1">Start →</span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400 leading-relaxed">
          Practice questions for educational purposes. Always verify current requirements
          with the issuing agency. Free for everyone — no account required.
        </p>
        <p className="text-xs text-gray-300 mt-3">
          Jàng (Wolof: "to study") · Also available as a mobile app
        </p>
      </div>
    </div>
  );
}
