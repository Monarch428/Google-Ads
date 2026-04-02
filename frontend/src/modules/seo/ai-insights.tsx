import { BookmarkCheck, Bot, Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

const ACCENT = "#EF4F6E";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "High Priority" | "Medium Priority" | "Low Priority";

type Insight = {
  id: number;
  priority: Priority;
  text: string;
  completed: boolean;
};

type InsightGroup = {
  category: string;
  items: Insight[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses the raw GPT-4o markdown text into InsightGroup[].
 *
 * The prompt in seo_service.py asks for sections:
 *   1. Top 3 Quick Wins
 *   2. Technical SEO fixes
 *   3. Content improvements
 *   4. Long-Term Strategy (3-6 months)
 *   5. What is working well
 *
 * Each section has bullet / numbered list items.
 */
function parseAiInsights(text: string): InsightGroup[] {
  if (!text) return [];

  // Split by markdown headings (##, ###, or numbered 1. 2. 3. headings)
  const sectionRegex = /(?:^|\n)(?:#{1,3}\s+|(?:\d+\.\s+\*\*))(.+?)(?:\*\*)?(?:\n|$)/g;

  const sections: { heading: string; body: string }[] = [];
  let lastIdx = 0;
  let lastHeading = "";
  let match: RegExpExecArray | null;

  // Find all headings and split text into sections
  const lines = text.split("\n");
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    // Detect headings: ## Heading, ### Heading, **1. Heading**, 1. **Heading**
    const headingMatch =
      line.match(/^#{1,3}\s+(.+)/) ||
      line.match(/^\*\*\d+\.\s+(.+?)\*\*/) ||
      line.match(/^\d+\.\s+\*\*(.+?)\*\*/);

    if (headingMatch) {
      if (currentHeading && currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join("\n") });
      }
      currentHeading = headingMatch[1].replace(/\*\*/g, "").trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  // Push last section
  if (currentHeading && currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join("\n") });
  }

  // If no headings detected, treat entire text as one group
  if (sections.length === 0) {
    sections.push({ heading: "AI Recommendations", body: text });
  }

  let idCounter = 1;

  return sections
    .map(({ heading, body }) => {
      // Extract bullet/numbered list items from body
      const itemLines = body
        .split("\n")
        .map((l) => l.replace(/^[-*•]\s+|\d+\.\s+/, "").replace(/\*\*/g, "").trim())
        .filter((l) => l.length > 20); // skip short/empty lines

      if (itemLines.length === 0) return null;

      const items: Insight[] = itemLines.map((text) => {
        // Derive priority from keywords in the text
        const lower = text.toLowerCase();
        let priority: Priority = "Low Priority";
        if (
          lower.includes("critical") ||
          lower.includes("immediate") ||
          lower.includes("urgent") ||
          lower.includes("fix") ||
          lower.includes("broken") ||
          lower.includes("missing") ||
          lower.includes("error") ||
          lower.includes("must")
        ) {
          priority = "High Priority";
        } else if (
          lower.includes("improve") ||
          lower.includes("optimiz") ||
          lower.includes("consider") ||
          lower.includes("should") ||
          lower.includes("increase") ||
          lower.includes("reduce") ||
          lower.includes("update")
        ) {
          priority = "Medium Priority";
        }

        return { id: idCounter++, priority, text, completed: false };
      });

      return { category: heading, items };
    })
    .filter(Boolean) as InsightGroup[];
}

/** Derives a clean category label */
function categoryLabel(raw: string): string {
  return raw
    .replace(/top\s+\d+\s+/i, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const isHigh = priority === "High Priority";
  return (
    <span
      className="inline-flex items-center justify-center px-4 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: isHigh ? ACCENT : "#f1f5f9",
        color: isHigh ? "#fff" : "#64748b",
      }}
    >
      {priority}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AiInsights = () => {
  const [groups, setGroups] = useState<InsightGroup[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [reportId, setReportId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch latest report + its ai_insights ──
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        const listRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports`);
        if (!listRes.ok) throw new Error("Failed to fetch reports list");
        const reports = await listRes.json();

        if (!reports || reports.length === 0) {
          setError("No SEO reports found. Run an analysis first.");
          return;
        }

        const latest = reports[0];
        setReportId(latest.id);

        // Full report — check if ai_insights is already saved
        const reportRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports/${latest.id}`);
        if (!reportRes.ok) throw new Error("Failed to fetch report");
        const fullReport = await reportRes.json();

        if (fullReport.ai_insights) {
          setRawText(fullReport.ai_insights);
          setGroups(parseAiInsights(fullReport.ai_insights));
        }
        // else — user can click Generate to trigger the AI call
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ── Generate / regenerate AI insights ──
  const handleGenerate = async () => {
    if (!reportId) return;
    try {
      setGenerating(true);
      setError(null);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports/${reportId}/ai-insights`);
      if (!res.ok) throw new Error("Failed to generate AI insights");
      const data = await res.json();

      const text = data.ai_insights ?? "";
      setRawText(text);
      setGroups(parseAiInsights(text));
    } catch (err: any) {
      setError(err.message ?? "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  // ── Export as plain text ──
  const handleExport = () => {
    if (!rawText) return;
    const blob = new Blob([rawText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-insights-report-${reportId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleItem = (groupIdx: number, itemId: number) => {
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx
          ? g
          : {
            ...g,
            items: g.items.map((item) =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          }
      )
    );
  };

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
  const completedItems = groups.reduce((acc, g) => acc + g.items.filter((i) => i.completed).length, 0);

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-4 pb-6">
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 flex flex-col items-center gap-3">
          <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800">AI-Generated Insights</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalItems > 0
                ? `${totalItems} recommendations · ${completedItems} completed`
                : "No insights generated yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rawText && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <BookmarkCheck className="w-4 h-4" />
                {rawText ? "Regenerate" : "Generate Insights"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Empty state — no insights yet */}
      {!generating && groups.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Bot className="w-7 h-7 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">No insights generated yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Generate Insights" to get AI-powered SEO recommendations for this report.
            </p>
          </div>
        </div>
      )}

      {/* Generating skeleton */}
      {generating && (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-16 flex flex-col items-center gap-4 text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Analyzing your SEO report with AI…</p>
          <p className="text-xs text-gray-400">This may take up to 30 seconds</p>
        </div>
      )}

      {/* Insight Groups */}
      {!generating &&
        groups.map((group, gi) => (
          <div key={group.category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

            {/* Category Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-1 h-5 rounded-full" style={{ backgroundColor: ACCENT }} />
              <h3 className="text-sm font-bold text-slate-800">{categoryLabel(group.category)}</h3>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                {group.items.length} items
              </span>
            </div>

            {/* Items */}
            {group.items.map((item, ii) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 px-6 py-5 ${ii !== group.items.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleItem(gi, item.id)}
                  className="mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: item.completed ? ACCENT : "#cbd5e1",
                    backgroundColor: item.completed ? ACCENT : "transparent",
                  }}
                >
                  {item.completed && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="w-fit">
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <p className={`text-sm ${item.completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {item.text}
                  </p>
                </div>
              </div>
            ))}

          </div>
        ))}

    </div>
  );
};

export default AiInsights;
