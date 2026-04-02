import { AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";

const ACCENT = "#EF4F6E";

// ─── Types matching API response ─────────────────────────────────────────────

type TechnicalError = {
  type: string;
  message: string;
  url: string;
};

type ApiReport = {
  url: string;
  results: {
    technical: {
      url: string;
      timestamp: string;
      analysis_time: number;
      total_errors: number;
      errors: TechnicalError[];
      error_summary: Record<string, number>;
    };
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats ISO timestamp → "17/3/2026, 12:59:34 pm" */
function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Maps error type key → human-readable label */
function typeLabel(type: string): string {
  switch (type) {
    case "MISSING_ALT_TEXT": return "Missing Alt Text";
    case "BROKEN_IMAGE": return "Broken Image";
    case "BROKEN_LINK": return "Broken Link";
    case "DUPLICATE_ID": return "Duplicate ID";
    case "SITEMAP_MISSING": return "Sitemap Missing";
    default: return type.replace(/_/g, " ");
  }
}

/** Strips the long repetitive prefix from messages for cleaner display */
function shortMessage(message: string): string {
  // e.g. "Image missing alt text: /static-assets/..." → "Image missing alt text"
  const colonIdx = message.indexOf(":");
  if (colonIdx !== -1) return message.slice(0, colonIdx).trim();
  return message;
}

/** Extracts the path/asset from the message after the colon */
function messageDetail(message: string): string {
  const colonIdx = message.indexOf(":");
  if (colonIdx !== -1) {
    const detail = message.slice(colonIdx + 1).trim();
    // Truncate long URLs
    return detail.length > 60 ? detail.slice(0, 57) + "…" : detail;
  }
  return "";
}

// ─── Main Component ───────────────────────────────────────────────────────────

const WebErrors = () => {
  const [report, setReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestReport = async () => {
      try {
        setLoading(true);

        const listRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports`);
        if (!listRes.ok) throw new Error("Failed to fetch reports list");
        const reports = await listRes.json();

        if (!reports || reports.length === 0) {
          setError("No SEO reports found. Run an analysis first.");
          return;
        }

        const latestId = reports[0].id;

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
      <div className="space-y-6 pb-6">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-bold text-gray-800">Web Errors</h2>
          </div>
          <div className="px-6 py-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading error data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-6 pb-6">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-bold text-gray-800">Web Errors</h2>
          </div>
          <div className="px-6 py-10 text-center text-sm text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  // ── Map API data ──
  const tech = report?.results?.technical;
  const errors = tech?.errors ?? [];
  const errorSummary = tech?.error_summary ?? {};
  const totalErrors = tech?.total_errors ?? 0;

  // Deduplicate errors by type+message for display (keep first occurrence)
  const seen = new Set<string>();
  const uniqueErrors = errors.filter((e) => {
    const key = `${e.type}::${shortMessage(e.message)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Build error distribution from error_summary
  const distributionItems = Object.entries(errorSummary).map(([type, count]) => ({
    label: typeLabel(type),
    count,
    total: totalErrors,
  }));

  return (
    <div className="space-y-6 pb-6">

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 px-8 py-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Analyzed URL</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{tech?.url ?? report?.url ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Timestamp</p>
            <p className="text-sm font-semibold text-gray-700">
              {tech?.timestamp ? formatTimestamp(tech.timestamp) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Analysis Duration</p>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">
                {tech?.analysis_time != null ? `${tech.analysis_time.toFixed(1)}s` : "—"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Total Errors</p>
            <p className="text-4xl font-bold text-gray-800">{totalErrors}</p>
          </div>
        </div>
      </div>

      {/* Error Details + Distribution */}
      <div className="flex gap-4 items-start">

        {/* Error Details Table */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Error Details</h3>
            <span className="ml-auto text-xs text-gray-400">{uniqueErrors.length} unique error types</span>
          </div>

          {/* Column Labels */}
          <div className="grid grid-cols-[200px_1fr_1fr] px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
            <span>Type</span>
            <span>Message</span>
            <span>Detail</span>
          </div>

          {uniqueErrors.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No errors found. 🎉</div>
          ) : (
            uniqueErrors.map((err, i) => (
              <div
                key={`${err.type}-${i}`}
                className={`grid grid-cols-[200px_1fr_1fr] items-center px-6 py-4 ${i !== uniqueErrors.length - 1 ? "border-b border-gray-100" : ""
                  }`}
              >
                <span
                  className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold text-white w-fit"
                  style={{ backgroundColor: ACCENT }}
                >
                  {typeLabel(err.type)}
                </span>
                <span className="text-sm text-gray-600">{shortMessage(err.message)}</span>
                <span className="text-sm text-gray-500 font-mono truncate">{messageDetail(err.message)}</span>
              </div>
            ))
          )}
        </div>

        {/* Error Distribution */}
        <div className="w-64 bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">Error Distribution</h3>

          {distributionItems.length === 0 ? (
            <p className="text-sm text-gray-400">No data.</p>
          ) : (
            distributionItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-bold text-gray-700">{item.count}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((item.count / item.total) * 100)}%`,
                      backgroundColor: ACCENT,
                      transition: "width 1s ease",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default WebErrors;
