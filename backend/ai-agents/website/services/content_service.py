import re
import os
import json
from transformers import pipeline
from bs4 import BeautifulSoup
import requests

# ✅ FIX 1: lang_tool was commented out but grammar_check() still called it
# → NameError: name 'lang_tool' is not defined (the root crash)
# Re-enabled with try/except so it degrades gracefully if not installed.
try:
    import language_tool_python
    lang_tool = language_tool_python.LanguageTool('en-US')
except Exception:
    lang_tool = None

try:
    tone_pipe = pipeline("sentiment-analysis")
except Exception:
    tone_pipe = None

# UK–US dictionary
UK_US_MAP = {
    "colour": "color",
    "favourite": "favorite",
    "organise": "organize",
    "analyse": "analyze",
    "defence": "defense",
    "theatre": "theater"
}


def load_text_from_file(filepath):
    """Loads plain text from .txt, .docx, .html, .json."""
    if filepath.endswith(".txt"):
        return open(filepath, "r").read()
    if filepath.endswith(".json"):
        return json.load(open(filepath, "r"))
    return ""


def extract_text_from_url(url):
    """Extract website text for analysis."""
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        r = requests.get(url, headers=headers, timeout=15)
        r.raise_for_status()
    except Exception as e:
        return None, f"Error fetching URL: {e}"

    soup = BeautifulSoup(r.text, "html.parser")
    chunks = []

    for tag in soup.find_all(["h1", "h2", "h3", "p", "li", "span"]):
        text = tag.get_text(strip=True)
        if len(text.split()) > 3:
            chunks.append(text)

    full = " ".join(chunks)
    return (full[:5000], None) if full else (None, "No readable content found.")


def grammar_check(text, limit=15):
    # ✅ FIX 1 (continued): Guard against lang_tool being None.
    # Before this fix, the function always crashed because lang_tool
    # was used without ever being defined.
    if lang_tool is None:
        return []

    matches = lang_tool.check(text)
    issues = []
    for m in matches[:limit]:
        issues.append({
            "message": m.message,
            "suggest": m.replacements,
            "offset": m.offset,
            "errorText": m.context
        })
    return issues


def tone_detection(text):
    if not tone_pipe:
        return {"tone": "unknown", "reason": "tone model not available"}

    if len(text.split()) < 8:
        return {"tone": "too_short"}

    try:
        out = tone_pipe(text[:1000])
        best = max(out, key=lambda x: x["score"])
        return {"tone": best["label"].lower(), "confidence": best["score"]}
    except Exception as e:
        return {"tone": "error", "reason": str(e)}


def detect_voice(text):
    pattern = r'\b(is|was|were|be|been|being)\b\s+(\w+ed)\b'
    matches = re.findall(pattern, text)
    return "Passive" if len(matches) > 3 else "Active"


def region_check(text, region="US"):
    issues = []
    for uk, us in UK_US_MAP.items():
        if region == "US" and uk in text:
            issues.append(f"Use '{us}' instead of '{uk}' for US English.")
        elif region == "UK" and us in text:
            issues.append(f"Use '{uk}' instead of '{us}' for British English.")
    return issues


def validate_content_placement(page_content, expected_map):
    """
    page_content -> {page: website_text}
    expected_map -> {page: expected_keywords/sections}
    """
    missing = {}
    for page, required in expected_map.items():
        missing_items = []
        for item in required:
            if item.lower() not in page_content.get(page, "").lower():
                missing_items.append(item)
        if missing_items:
            missing[page] = missing_items
    return missing


def detect_missing_sections(text, missing_notes):
    """Flags sections that are required but not found in content."""
    issues = []
    for sec in missing_notes:
        # ✅ FIX 4: Logic was inverted — it flagged sections that WERE found
        # and said they were "missing". Correct behaviour: flag when NOT found.
        if sec.lower() not in text.lower():
            issues.append(f"Missing section: '{sec}' not found in content.")
    return issues


def analyze_content(
        text,
        region="US",
        tone_rules=None,
        missing_notes=None,
        meeting_notes=None
    ):
    """Main engine for content AI validations."""

    grammar       = grammar_check(text)
    tone          = tone_detection(text)
    voice         = detect_voice(text)
    region_issues = region_check(text, region)

    rewriting_violations = []
    if tone_rules:
        if tone["tone"] not in tone_rules:
            rewriting_violations.append(
                f"Detected tone '{tone['tone']}', but expected: {tone_rules}"
            )

    meeting_flags = []
    if meeting_notes:
        for note in meeting_notes:
            if note.lower() not in text.lower():
                meeting_flags.append(f"Instruction missing: '{note}'")

    missing_flags = detect_missing_sections(text, missing_notes or [])

    # ✅ FIX 3: Score was only penalising grammar and voice.
    # Now also deducts for region issues, tone violations and meeting mismatches
    # so the score reflects the full picture instead of being inflated.
    score = max(0, 100
        - len(grammar)              * 2
        - len(region_issues)        * 3
        - len(rewriting_violations) * 5
        - len(meeting_flags)        * 2
        - len(missing_flags)        * 5
        - (5 if voice == "Passive" else 0)
    )

    return {
        "word_count":                  len(text.split()),
        "grammar_errors":              grammar,
        "tone":                        tone,
        "voice":                       voice,
        "region_issues":               region_issues,
        "tone_rule_violations":        rewriting_violations,
        "meeting_instruction_mismatch": meeting_flags,
        "missing_section_flags":       missing_flags,
        "content_score":               score
    }


def content_ai_from_url(url, sitemap, content_map, region="US"):
    text, err = extract_text_from_url(url)
    if err:
        return {"error": err}

    base_result = analyze_content(text, region)

    page_content = {url: text}
    placement_issues = validate_content_placement(page_content, content_map)
    base_result["placement_issues"] = placement_issues
    return base_result
