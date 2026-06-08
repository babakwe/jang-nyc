/**
 * analytics.ts — Privacy-first event tracking for Jàng NYC
 * =========================================================
 * Uses Umami (self-hosted or cloud). Zero cookies. No cross-site tracking.
 * All events are anonymous. Complies with GDPR / CCPA by default.
 *
 * SETUP (5 minutes):
 *   Option A — Umami Cloud (free, hosted):
 *     1. Go to https://cloud.umami.is → sign up → "Add website"
 *     2. Enter jang-nyc.vercel.app
 *     3. Copy your Website ID (e.g. "abc12345-...")
 *     4. In your .env.local / Vercel env vars:
 *          NEXT_PUBLIC_UMAMI_WEBSITE_ID=abc12345-...
 *          NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
 *
 *   Option B — Self-hosted on Railway (free):
 *     1. railway.app → New Project → Deploy from Template → search "Umami"
 *     2. Deploy → get your Railway URL
 *     3. In Umami dashboard: add jang-nyc.vercel.app
 *     4. Set env vars (same as above but use your Railway URL):
 *          NEXT_PUBLIC_UMAMI_WEBSITE_ID=...
 *          NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami.railway.app/script.js
 *
 *   Then rebuild & redeploy. Analytics active immediately.
 *
 * EVENTS TRACKED (all anonymous, no PII):
 *   certification-open  — which cert card was tapped on home screen
 *   quiz-start          — cert + chapter + difficulty
 *   quiz-answer         — correct/wrong + question index
 *   quiz-finish         — cert + score% + pass/fail
 *   quiz-exit           — cert + question index when user bailed (drop-off)
 *   flashcard-open      — cert + chapter
 *   vocab-open          — cert + vocab category
 *   lang-switch         — from→to language
 */

// Umami's global type
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, string | number | boolean>) => void;
    };
  }
}

/** Fire a tracking event. Fails silently if Umami isn't loaded. */
export function track(
  eventName: string,
  data?: Record<string, string | number | boolean>
): void {
  try {
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track(eventName, data);
    }
  } catch {
    // Fail silently — analytics should never break the app
  }
}

// ── Typed event helpers ───────────────────────────────────────────────────────

/** User tapped on a certification card on the home screen */
export function trackCertOpen(certId: string) {
  track("certification-open", { cert: certId });
}

/** User clicked "Start Studying" and selected a difficulty */
export function trackQuizStart(certId: string, chapter: string | null, difficulty: string) {
  track("quiz-start", {
    cert: certId,
    chapter: chapter ?? "all",
    difficulty,
  });
}

/**
 * User answered a question.
 * @param correct  true if they got it right
 * @param questionIndex  which question in the quiz (0-indexed)
 */
export function trackQuizAnswer(
  certId: string,
  questionIndex: number,
  correct: boolean
) {
  track("quiz-answer", {
    cert: certId,
    q: questionIndex,
    correct,
  });
}

/**
 * User finished the quiz.
 * @param score   number correct
 * @param total   total questions
 */
export function trackQuizFinish(certId: string, score: number, total: number) {
  const pct = Math.round((score / total) * 100);
  track("quiz-finish", {
    cert: certId,
    score: pct,
    pass: pct >= 70,
  });
}

/**
 * User left the quiz early (drop-off).
 * @param questionIndex  which question they were on when they exited
 * @param total  total questions in the quiz
 */
export function trackQuizExit(certId: string, questionIndex: number, total: number) {
  track("quiz-exit", {
    cert: certId,
    at_q: questionIndex,
    of: total,
    pct_complete: Math.round((questionIndex / total) * 100),
  });
}

/** User opened flashcard view */
export function trackFlashcardOpen(certId: string, chapter: string | null) {
  track("flashcard-open", {
    cert: certId,
    chapter: chapter ?? "all",
  });
}

/** User opened vocab browser */
export function trackVocabOpen(certId: string, category: string | null) {
  track("vocab-open", {
    cert: certId,
    category: category ?? "all",
  });
}

/** User switched UI language */
export function trackLangSwitch(from: string, to: string) {
  track("lang-switch", { from, to });
}
