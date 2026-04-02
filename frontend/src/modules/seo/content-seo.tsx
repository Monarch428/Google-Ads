import { CheckCircle2, FileText } from "lucide-react";
import { useEffect, useState } from "react";

const ACCENT = "#EF4F6E";

// ─── Types matching API response ─────────────────────────────────────────────

type ApiKeyword = {
  keyword: string;
  count: number;
  density_percent: number;
  tfidf_score: number;
  relevance_score: number;
  in_title: boolean;
  in_headings: boolean;
  in_first_paragraph: boolean;
};

type ApiContentQuality = {
  status: string;
  message: string;
  details: {
    word_count: number;
    readability_score: number;
    readability_status: string;
    length_status: string;
    paragraph_length_status: string;
    uniqueness_status: string;
    duplicate_hash: string;
    long_paragraph_count: number;
  };
};

type ApiReport = {
  scores: {
    content: number;
    technical: number;
    links: number;
    performance: number;
    grade: string;
  };
  results: {
    content: {
      keyword_research: {
        status: string;
        message: string;
        keywords: ApiKeyword[];
      };
      content_quality: ApiContentQuality;
    };
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Relevance = "High" | "Medium" | "Low";

/** Maps numeric relevance_score → High / Medium / Low */
function getRelevance(score: number): Relevance {
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

/** Converts a status string (pass / warning / fail) → human-readable label */
function statusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case "pass": return "✓ Pass";
    case "warning": return "⚠ Needs work";
    case "fail": return "✗ Failing";
    default: return status ?? "—";
  }
}

/** Readability score → grade label */
function readabilityLabel(score: number): string {
  if (score >= 70) return "Easy to read";
  if (score >= 50) return "Fairly readable";
  if (score >= 30) return "Difficult";
  return "Very difficult";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RelevanceBadge({ relevance }: { relevance: Relevance }) {
  const styles: Record<Relevance, string> = {
    High: "bg-[#EF4F6E] text-white",
    Medium: "bg-gray-100 text-gray-600",
    Low: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center justify-center px-4 py-1 rounded-full text-xs font-semibold ${styles[relevance]}`}>
      {relevance}
    </span>
  );
}

function CheckIcon({ checked }: { checked: boolean }) {
  return checked
    ? <CheckCircle2 className="w-5 h-5 text-gray-700 mx-auto" />
    : <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ContentSeo = () => {
  const [report, setReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestReport = async () => {
      try {
        setLoading(true);

        // Step 1: get latest report id
        const listRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports`);
        if (!listRes.ok) throw new Error("Failed to fetch reports list");
        const reports = await listRes.json();

        if (!reports || reports.length === 0) {
          setError("No SEO reports found. Run an analysis first.");
          return;
        }

        const latestId = reports[0].id;

        // Step 2: fetch full report with results
        const reportRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports/${latestId}`);
        if (!reportRes.ok) throw new Error("Failed to fetch report details");
        const fullReport = await reportRes.json();

        setReport(fullReport);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchLatestReport();
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-4 pb-6">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-bold text-gray-800">Keyword Research</h2>
          </div>
          <div className="px-6 py-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading content data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-4 pb-6">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-bold text-gray-800">Keyword Research</h2>
          </div>
          <div className="px-6 py-10 text-center text-sm text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  // ── Map API data ──
  const keywords = report?.results?.content?.keyword_research?.keywords ?? [];
  const quality = report?.results?.content?.content_quality?.details;

  const qualityMetrics = quality
    ? [
      {
        label: "Word Count",
        value: quality.word_count?.toLocaleString() ?? "—",
        sub: statusLabel(quality.length_status),
      },
      {
        label: "Readability Score",
        value: quality.readability_score != null ? String(Math.round(quality.readability_score)) : "—",
        sub: readabilityLabel(quality.readability_score),
      },
      {
        label: "Paragraph Quality",
        value: quality.paragraph_length_status === "pass" ? "✓" : "⚠",
        sub: statusLabel(quality.paragraph_length_status),
      },
      {
        label: "Content Uniqueness",
        value: quality.uniqueness_status === "pass" ? "Unique" : "Duplicate",
        sub: statusLabel(quality.uniqueness_status),
      },
    ]
    : [];

  return (
    <div className="space-y-4 pb-6">

      {/* Keyword Research */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Title + score */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-bold text-gray-800">Keyword Research</h2>
          </div>
          <span className="text-xs font-semibold text-gray-400">
            Content Score:{" "}
            <span className="font-bold" style={{ color: ACCENT }}>
              {report?.scores?.content ?? "—"}
            </span>
            /100
          </span>
        </div>

        {keywords.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No keyword data available.</div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1.2fr_1.2fr] px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 bg-gray-50">
              <span>Keyword</span>
              <span className="text-center">Count</span>
              <span className="text-center">Density</span>
              <span className="text-center">Relevance</span>
              <span className="text-center">In Title</span>
              <span className="text-center">In Headings</span>
              <span className="text-center">In First ¶</span>
            </div>

            {/* Table Rows */}
            {keywords.map((row, i) => (
              <div
                key={row.keyword}
                className={`grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1.2fr_1.2fr] items-center px-6 py-4 ${i !== keywords.length - 1 ? "border-b border-gray-100" : ""
                  }`}
              >
                <span className="text-sm text-gray-700 capitalize">{row.keyword}</span>
                <span className="text-sm text-gray-600 text-center">{row.count}</span>
                <span className="text-sm text-gray-600 text-center">{row.density_percent.toFixed(1)}%</span>
                <div className="flex justify-center">
                  <RelevanceBadge relevance={getRelevance(row.relevance_score)} />
                </div>
                <CheckIcon checked={row.in_title} />
                <CheckIcon checked={row.in_headings} />
                <CheckIcon checked={row.in_first_paragraph} />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Content Quality Metrics */}
      {qualityMetrics.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800">Content Quality Metrics</h2>
          </div>

          <div className="grid grid-cols-4 divide-x divide-gray-100">
            {qualityMetrics.map((metric) => (
              <div key={metric.label} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">{metric.label}</span>
                  <CheckCircle2 className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{metric.value}</p>
                <p className="text-xs text-gray-400">{metric.sub}</p>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};

export default ContentSeo;
