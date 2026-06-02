"use client";

import { useState } from "react";
import certData from "./data/certifications.json";

type Question = {
  id: string;
  q: string;
  choices: string[];
  answer: number;
  exp: string;
};

type Category = typeof certData.categories[0] & {
  fee: string;
  feeNote: string;
  where: string;
  officialUrl: string;
  bookUrl: string;
  studyUrl: string;
  difficulty: string;
  timeToStudy: string;
  languages: string;
};

type Mode = 'easy' | 'normal' | 'hard' | 'official';

const questions = certData.questions as unknown as Record<string, Question[]>;

// ── Exam metadata ─────────────────────────────────────────────────────────────
const examMeta: Record<string, Partial<Category>> = {
  fdny: {
    fee: "$25 – $45",
    feeNote: "Fee varies by certificate type (F-01: $25, G-60: $45)",
    where: "FDNY HQ — 9 MetroTech Center, Brooklyn (walk-in, Mon–Fri 8am–3pm)",
    officialUrl: "https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",
    bookUrl: "https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/certificates-of-fitness.page",
    studyUrl: "https://www1.nyc.gov/site/fdny/business/certificates-of-fitness/study-material.page",
    difficulty: "Medium",
    timeToStudy: "1–2 weeks",
    languages: "English only",
  },
  cna: {
    fee: "$180 – $220",
    feeNote: "Pearson VUE test fee. Some programs cover the cost.",
    where: "Pearson VUE test centers across NYC (multiple locations)",
    officialUrl: "https://www.pearsonvue.com/us/en/nclex.html",
    bookUrl: "https://www.pearsonvue.com/us/en/nclex/register.html",
    studyUrl: "https://www.ncsbn.org/nclex",
    difficulty: "Medium–High",
    timeToStudy: "4–8 weeks",
    languages: "English, Spanish (select centers)",
  },
  hha: {
    fee: "$0 – $50",
    feeNote: "Often covered by training program. Competency evaluation, not a formal written test.",
    where: "Through your HHA training program (required 75-hr course)",
    officialUrl: "https://www.health.ny.gov/facilities/home_care/",
    bookUrl: "https://www.health.ny.gov/facilities/home_care/",
    studyUrl: "https://www.health.ny.gov/facilities/home_care/aide_training.htm",
    difficulty: "Easy–Medium",
    timeToStudy: "2–4 weeks",
    languages: "Multiple languages available",
  },
  teas: {
    fee: "$115",
    feeNote: "ATI TEAS fee. Check if your school covers retakes.",
    where: "Your nursing school or ATI testing center",
    officialUrl: "https://www.atitesting.com/teas",
    bookUrl: "https://www.atitesting.com/teas/register",
    studyUrl: "https://www.atitesting.com/teas/study",
    difficulty: "High",
    timeToStudy: "4–12 weeks",
    languages: "English only",
  },
  interpreter: {
    fee: "$200",
    feeNote: "NYS Unified Court System exam fee",
    where: "NYS courts testing location — 111 Centre Street, Manhattan",
    officialUrl: "https://www.nycourts.gov/courtinterpreter/",
    bookUrl: "https://www.nycourts.gov/courtinterpreter/testing.shtml",
    studyUrl: "https://www.nycourts.gov/courtinterpreter/glossaries.shtml",
    difficulty: "Very High",
    timeToStudy: "3–6 months",
    languages: "70+ languages offered",
  },
  dmv: {
    fee: "$80",
    feeNote: "Includes learner permit + first road test. DMV fee schedule.",
    where: "Any NYC DMV office (appointments recommended)",
    officialUrl: "https://dmv.ny.gov/learners-permit",
    bookUrl: "https://dmv.ny.gov/office-visit/find-dmv-office-or-kiosk",
    studyUrl: "https://dmv.ny.gov/driver-license/get-driver-license-0",
    difficulty: "Easy",
    timeToStudy: "1–2 weeks",
    languages: "English, Spanish, Chinese, Russian, Korean, Polish, Arabic, Haitian Creole + more",
  },
  security: {
    fee: "$36.25 – $108",
    feeNote: "Unarmed: $36.25 / Armed: $108. NYS Department of State fee.",
    where: "Pearson VUE test center or online proctored",
    officialUrl: "https://www.dos.ny.gov/licensing/security_guard/index.html",
    bookUrl: "https://www.pearsonvue.com/us/en/dos-nys.html",
    studyUrl: "https://www.dos.ny.gov/licensing/security_guard/study.html",
    difficulty: "Easy–Medium",
    timeToStudy: "1–3 weeks",
    languages: "English only",
  },
};

// ── Quiz screen ───────────────────────────────────────────────────────────────
function QuizScreen({ cat, mode, onBack }: { cat: Category; mode: Mode; onBack: () => void }) {
  const allQs: Question[] = questions[cat.id] || [];

  // Filter / slice by mode
  const qs = (() => {
    if (mode === 'easy')     return allQs.slice(0, Math.ceil(allQs.length * 0.4));
    if (mode === 'hard')     return allQs;
    if (mode === 'official') return allQs.slice(0, Math.min(25, allQs.length));
    return allQs.slice(0, Math.ceil(allQs.length * 0.7)); // normal
  })();

  const [idx, setIdx]     = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone]   = useState(false);

  const q = qs[idx];
  const isCorrect = picked === q?.answer;

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore(s => s + 1);
  }

  function next() {
    if (idx + 1 >= qs.length) { setDone(true); return; }
    setIdx(i => i + 1);
    setPicked(null);
  }

  function restart() { setIdx(0); setPicked(null); setScore(0); setDone(false); }

  const modeLabel = { easy: '🟢 Easy', normal: '🟡 Normal', hard: '🔴 Hard', official: '📋 Official' }[mode];

  if (done) {
    const pct = Math.round((score / qs.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-5xl mb-3">{passed ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-black mb-1" style={{ color: cat.color }}>{passed ? 'Great job!' : 'Keep studying!'}</h2>
          <p className="text-gray-500 mb-4">{score} / {qs.length} correct — {pct}%</p>
          <div className="h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: passed ? '#16a34a' : '#f59e0b' }} />
          </div>
          {passed ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-bold text-green-800 mb-1">Ready to book your exam?</p>
              <a href={cat.bookUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-green-700 underline">Schedule at official site →</a>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-bold text-amber-800 mb-1">Study the official material</p>
              <a href={cat.studyUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-amber-700 underline">Official study guide →</a>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={restart} className="flex-1 py-3 rounded-xl font-bold text-white hover:opacity-90" style={{ backgroundColor: cat.color }}>Try Again</button>
            <button onClick={onBack} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: cat.color }}>
        <button onClick={onBack} className="text-white/80 hover:text-white font-bold">←</button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{cat.emoji} {cat.title}</div>
          <div className="text-white/70 text-xs">{modeLabel} · Q {idx+1}/{qs.length}</div>
        </div>
        <div className="text-white font-bold">{score}/{idx+(picked!==null?1:0)}</div>
      </div>
      <div className="h-1" style={{ backgroundColor: cat.bg }}>
        <div className="h-full transition-all" style={{ width:`${((idx+(picked!==null?1:0))/qs.length)*100}%`, backgroundColor: cat.color }} />
      </div>
      <div className="max-w-lg mx-auto p-4 pt-5">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <p className="text-gray-900 font-semibold leading-relaxed">{q.q}</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {q.choices.map((ch, i) => {
            const sel = picked === i, correct = i === q.answer;
            let cls = 'bg-white border-gray-200 text-gray-800';
            if (picked !== null) {
              if (correct) cls = 'bg-green-50 border-green-400 text-green-800';
              else if (sel) cls = 'bg-red-50 border-red-400 text-red-800';
            }
            return (
              <button key={i} onClick={() => choose(i)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${cls} ${picked===null?'hover:border-blue-200 hover:bg-blue-50/30':''}`}>
                <span className="font-bold mr-2">{['A','B','C','D'][i]}.</span>{ch}
                {picked!==null && correct && <span className="ml-2">✓</span>}
                {picked!==null && sel && !correct && <span className="ml-2">✗</span>}
              </button>
            );
          })}
        </div>
        {picked !== null && q.exp && (
          <div className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-400 mb-4">
            <p className="text-xs font-bold text-amber-700 mb-1">{isCorrect?'✓ Correct':'✗ Wrong'} — Explanation</p>
            <p className="text-sm text-amber-900 leading-relaxed">{q.exp}</p>
          </div>
        )}
        {picked !== null && (
          <button onClick={next} className="w-full py-4 rounded-xl font-bold text-white hover:opacity-90" style={{ backgroundColor: cat.color }}>
            {idx+1 < qs.length ? 'Next →' : 'See Results'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Mode picker ───────────────────────────────────────────────────────────────
function ModePicker({ cat, onSelect, onBack }: { cat: Category; onSelect: (m: Mode) => void; onBack: () => void }) {
  const count = (questions[cat.id] || []).length;
  const modes: { mode: Mode; label: string; emoji: string; desc: string; n: number }[] = [
    { mode:'easy',     emoji:'🟢', label:'Easy Start',     desc:'First 40% of questions — get comfortable',               n: Math.ceil(count*0.4) },
    { mode:'normal',   emoji:'🟡', label:'Normal',         desc:'70% of questions — solid practice session',              n: Math.ceil(count*0.7) },
    { mode:'hard',     emoji:'🔴', label:'Full Set',       desc:`All ${count} questions — complete preparation`,          n: count },
    { mode:'official', emoji:'📋', label:'Exam Simulation',desc:`25 questions, timed feel — closest to the real exam`,   n: Math.min(25,count) },
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: cat.color }}>
        <button onClick={onBack} className="text-white/80 hover:text-white font-bold">←</button>
        <div className="text-white font-bold">{cat.emoji} {cat.title}</div>
      </div>
      <div className="max-w-lg mx-auto p-4 pt-6">
        <h2 className="text-xl font-black text-gray-900 mb-1">Choose difficulty</h2>
        <p className="text-sm text-gray-500 mb-5">Start easy and work your way up as you improve.</p>
        <div className="flex flex-col gap-3">
          {modes.map(m => (
            <button key={m.mode} onClick={() => onSelect(m.mode)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-blue-200 active:scale-[0.99] transition-all flex items-center gap-4">
              <span className="text-3xl">{m.emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-gray-900">{m.label}</div>
                <div className="text-sm text-gray-500 mt-0.5">{m.desc}</div>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: cat.bg, color: cat.color }}>{m.n} Qs</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Exam info panel ───────────────────────────────────────────────────────────
function ExamInfo({ cat, onStartQuiz, onBack }: { cat: Category; onStartQuiz: () => void; onBack: () => void }) {
  const count = (questions[cat.id] || []).length;
  const rows = [
    ['💰 Exam fee', cat.fee],
    ['📍 Where to take it', cat.where],
    ['⏱ Study time', cat.timeToStudy],
    ['📊 Difficulty', cat.difficulty],
    ['🌍 Languages', cat.languages],
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 pt-10 pb-6" style={{ background: `linear-gradient(135deg, ${cat.color} 0%, ${cat.color}cc 100%)` }}>
        <button onClick={onBack} className="text-white/70 hover:text-white text-sm mb-4 block">← All Certifications</button>
        <div className="text-4xl mb-2">{cat.emoji}</div>
        <h1 className="text-2xl font-black text-white mb-1">{cat.title}</h1>
        <p className="text-white/80 text-sm leading-relaxed">{cat.description}</p>
      </div>

      <div className="max-w-lg mx-auto p-4 -mt-3">
        {/* Quick stats */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            {rows.map(([label, val]) => (
              <div key={label} className="min-w-0">
                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-gray-800 leading-snug">{val}</div>
              </div>
            ))}
          </div>
          {cat.feeNote && (
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">{cat.feeNote}</p>
          )}
        </div>

        {/* Official links */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Official resources</h3>
          <div className="flex flex-col gap-2">
            <a href={cat.officialUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
              <span className="text-lg">🏛</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">Official exam page</div>
                <div className="text-xs text-gray-400 truncate">{cat.officialUrl.replace('https://','').split('/')[0]}</div>
              </div>
              <span className="ml-auto text-gray-300">→</span>
            </a>
            <a href={cat.studyUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
              <span className="text-lg">📖</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">Official study guide</div>
                <div className="text-xs text-gray-400">Free from the licensing agency</div>
              </div>
              <span className="ml-auto text-gray-300">→</span>
            </a>
            <a href={cat.bookUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
              <span className="text-lg">📅</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">Book your exam</div>
                <div className="text-xs text-gray-400">Schedule your test date</div>
              </div>
              <span className="ml-auto text-gray-300">→</span>
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-1">Practice with us</h3>
          <p className="text-xs text-gray-500 mb-4">{count} practice questions — from easy to full exam simulation. Free, no account needed.</p>
          <button onClick={onStartQuiz}
            className="w-full py-4 rounded-xl font-black text-white text-base hover:opacity-90 transition-opacity"
            style={{ backgroundColor: cat.color }}>
            Start Practice Test →
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
          This is a practice tool only. Verify current requirements and fees with the official licensing agency before paying or scheduling.
        </p>
      </div>
    </div>
  );
}

// ── Home screen ───────────────────────────────────────────────────────────────
export default function Home() {
  type Screen = 'home' | 'info' | 'mode' | 'quiz';
  const [screen, setScreen] = useState<Screen>('home');
  const [activeCat, setActiveCat] = useState<Category | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>('normal');

  function openCat(cat: typeof certData.categories[0]) {
    setActiveCat({ ...cat, ...examMeta[cat.id] } as Category);
    setScreen('info');
  }

  if (screen === 'info' && activeCat) return <ExamInfo cat={activeCat} onStartQuiz={() => setScreen('mode')} onBack={() => setScreen('home')} />;
  if (screen === 'mode' && activeCat) return <ModePicker cat={activeCat} onSelect={m => { setActiveMode(m); setScreen('quiz'); }} onBack={() => setScreen('info')} />;
  if (screen === 'quiz' && activeCat) return <QuizScreen cat={activeCat} mode={activeMode} onBack={() => setScreen('mode')} />;

  const totalQs = certData.categories.reduce((s, c) => s + c.count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 pt-12 pb-8" style={{ background: 'linear-gradient(135deg, #003087 0%, #0052A5 100%)' }}>
        <div className="max-w-lg mx-auto">
          <div className="text-4xl mb-2">📚</div>
          <h1 className="text-3xl font-black text-white mb-1">Jàng NYC</h1>
          <p className="text-blue-200 text-sm font-semibold mb-1">Free License & Certification Prep</p>
          <p className="text-blue-300 text-xs leading-relaxed">
            Tap any certification to see the fee, where to take it, official study materials, and practice questions.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-5 text-sm">
          <span className="text-gray-500"><span className="font-bold text-gray-900">{totalQs}</span> practice questions</span>
          <span className="text-gray-500"><span className="font-bold text-gray-900">{certData.categories.length}</span> certifications</span>
          <span className="font-bold text-green-600">100% Free</span>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-lg mx-auto p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1">NYC Licenses & Certifications</p>
        {certData.categories.map(cat => {
          const meta = examMeta[cat.id] || {};
          return (
            <button key={cat.id} onClick={() => openCat(cat)}
              className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.99] transition-all"
              style={{ borderLeftWidth: 4, borderLeftColor: cat.color }}>
              <div className="p-4 flex items-center gap-4">
                <span className="text-3xl">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm">{cat.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-snug truncate">{cat.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.bg, color: cat.color }}>{cat.count} Qs</span>
                  <span className="text-xs text-gray-400">→</span>
                </div>
              </div>
              {meta.fee && (
                <div className="px-4 pb-3 flex items-center gap-3 border-t border-gray-50 pt-2">
                  <span className="text-xs text-gray-400">Fee: <span className="font-semibold text-gray-600">{meta.fee}</span></span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{(meta as Partial<Category>).timeToStudy}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400 leading-relaxed">
          Free practice for educational purposes. Verify fees and requirements with the official agency.
          <br />
          <span className="font-medium">Jàng</span> (Wolof: "to study") · Also available as a mobile app
        </p>
      </div>
    </div>
  );
}
