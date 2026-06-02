#!/usr/bin/env python3
"""
generate_translations.py
Translates all NYC certification questions into French, Spanish, Portuguese.
Uses Claude Haiku (cheapest model) for fast, accurate translations.

Usage:
  export ANTHROPIC_API_KEY=sk-ant-...
  python3 generate_translations.py

Output:
  app/data/translations.json   (loaded by the website automatically)

Cost estimate: ~$0.90 for all 301 questions x 3 languages
Time estimate: ~5-8 minutes
"""

import json, os, sys, time, traceback
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Run: pip3 install anthropic")
    sys.exit(1)

API_KEY = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_API_KEY")
if not API_KEY:
    print("Set ANTHROPIC_API_KEY environment variable first.")
    print("  export ANTHROPIC_API_KEY=sk-ant-...")
    sys.exit(1)

client = anthropic.Anthropic(api_key=API_KEY)

BASE = Path(__file__).parent.parent / "djangoukaye2" / "data"
OUT  = Path(__file__).parent / "app" / "data" / "translations.json"

SOURCE_FILES = {
    "fdny":        BASE / "questions_fdny.json",
    "cna":         BASE / "questions_cna.json",
    "hha":         BASE / "questions_hha.json",
    "teas":        BASE / "questions_teas_l1l2.json",
    "interpreter": BASE / "questions_interpreter.json",
    "dmv":         BASE / "dmv" / "questions_dmv_ny.json",
    "security":    BASE / "security" / "questions_security_ny.json",
}

LANGUAGES = {
    "fr": "French",
    "es": "Spanish",
    "pt": "Portuguese (Brazilian)",
}

def load_existing():
    if OUT.exists():
        with open(OUT) as f:
            return json.load(f)
    return {}

def translate_batch(items: list[str], lang_code: str, lang_name: str) -> list[str]:
    """Translate a list of strings in one API call."""
    numbered = "\n".join(f"{i+1}. {s}" for i, s in enumerate(items))
    prompt = f"""Translate each numbered item to {lang_name}.
Keep legal/medical terms accurate. Keep the same meaning and tone.
Return ONLY the numbered translations, same format.
Do not add explanations.

{numbered}"""

    resp = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    lines = resp.content[0].text.strip().split("\n")
    results = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Remove "1. " prefix
        if line and line[0].isdigit():
            dot = line.find(". ")
            if dot > 0:
                line = line[dot+2:]
        results.append(line)

    # Pad to match input length if needed
    while len(results) < len(items):
        results.append(items[len(results)])  # fallback to English
    return results[:len(items)]

def translate_question(q: dict, lang_code: str, lang_name: str) -> dict:
    """Translate a single question object."""
    items = [q.get("q", "")] + list(q.get("choices", [])) + [q.get("exp", "")]
    translated = translate_batch(items, lang_code, lang_name)

    return {
        "q":       translated[0],
        "choices": translated[1:1+len(q.get("choices", []))],
        "exp":     translated[1+len(q.get("choices", []))] if len(translated) > 1+len(q.get("choices", [])) else q.get("exp",""),
    }

def main():
    existing = load_existing()
    print(f"Loaded {len(existing)} existing translations")

    # Load all questions
    all_questions: dict[str, list[dict]] = {}
    total = 0
    for cat_id, path in SOURCE_FILES.items():
        if path.exists():
            qs = json.load(open(path))
            if isinstance(qs, dict):
                qs = qs.get("questions", [])
            all_questions[cat_id] = qs
            total += len(qs)

    print(f"Found {total} questions across {len(all_questions)} certifications")
    print(f"Languages: {', '.join(LANGUAGES.values())}")
    print(f"Estimated cost: ${total * len(LANGUAGES) * 0.001:.2f}")
    print()

    output = existing.copy()
    processed = 0

    for cat_id, qs in all_questions.items():
        if cat_id not in output:
            output[cat_id] = {}

        for lang_code, lang_name in LANGUAGES.items():
            if lang_code not in output[cat_id]:
                output[cat_id][lang_code] = {}

            # Find questions that haven't been translated yet
            todo = [(i, q) for i, q in enumerate(qs) if str(i) not in output[cat_id][lang_code]]

            if not todo:
                print(f"  ✓ {cat_id}/{lang_code}: already complete ({len(qs)} questions)")
                continue

            print(f"  Translating {cat_id}/{lang_code}: {len(todo)} questions...", flush=True)

            # Translate in batches of 5 questions (to keep API calls manageable)
            batch_size = 5
            for batch_start in range(0, len(todo), batch_size):
                batch = todo[batch_start:batch_start+batch_size]

                for idx, q in batch:
                    try:
                        translated = translate_question(q, lang_code, lang_name)
                        output[cat_id][lang_code][str(idx)] = translated
                        processed += 1
                        print(f"    [{processed}/{total*len(LANGUAGES)}] {cat_id}/{lang_code} q{idx}", flush=True)
                    except Exception as e:
                        print(f"    ERROR q{idx}: {e}")
                        traceback.print_exc()

                    time.sleep(0.1)  # gentle rate limiting

                # Save after each batch (resume-safe)
                with open(OUT, "w", encoding="utf-8") as f:
                    json.dump(output, f, ensure_ascii=False, indent=None)

    # Final save with readable structure
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"\n✅ Done! Translations saved to {OUT}")
    print(f"   Total translated: {processed} question-language pairs")
    file_size_kb = OUT.stat().st_size // 1024
    print(f"   File size: {file_size_kb}KB")

if __name__ == "__main__":
    main()
