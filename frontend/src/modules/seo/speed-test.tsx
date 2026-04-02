import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

const ACCENT = "#EF4F6E";

// ─── Types matching API response ─────────────────────────────────────────────

type SpeedData = {
  performance_score?: number;
  FCP?: string;
  LCP?: string;
  CLS?: string;
  TBT?: string;
  SpeedIndex?: string;
  error?: string;
};

type ApiReport = {
  results: {
    speed: {
      url: string;
      desktop: SpeedData;
      mobile: SpeedData;
    };
  };
};

type Mode = "desktop" | "mobile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derives a 0–100 score from a metric value based on known thresholds */
function scoreFromMetric(key: string, value: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 50;

  switch (key) {
    case "FCP":
      if (num <= 1.8) return 90;
      if (num <= 3.0) return 65;
      return 40;
    case "LCP":
      if (num <= 2.5) return 90;
      if (num <= 4.0) return 65;
      return 40;
    case "CLS":
      if (num <= 0.1) return 95;
      if (num <= 0.25) return 70;
      return 45;
    case "TBT":
      if (num <= 200)  return 90;
      if (num <= 600)  return 65;
      return 40;
    case "SpeedIndex":
      if (num <= 3.4) return 90;
      if (num <= 5.8) return 65;
      return 40;
    default:
      return 50;
  }
}

/** Maps a score → traffic-light colour */
function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

type Metric = {
  label: string;
  desc: string;
  value: string;
  score: number;
  color: string;
};

/** Builds the 5 metric cards from a SpeedData object */
function buildMetrics(d: SpeedData): Metric[] {
  const raw: { key: string; label: string; desc: string; value: string | undefined }[] = [
    { key: "FCP",        label: "First Contentful Paint",  desc: "Time until first content appears",          value: d.FCP },
    { key: "LCP",        label: "Largest Contentful Paint", desc: "Time until main content loads",             value: d.LCP },
    { key: "CLS",        label: "Cumulative Layout Shift",  desc: "Visual stability measure",                  value: d.CLS },
    { key: "TBT",        label: "Total Blocking Time",      desc: "Main thread blocking time",                 value: d.TBT },
    { key: "SpeedIndex", label: "Speed Index",              desc: "How quickly content is visually displayed", value: d.SpeedIndex },
  ];

  return raw.map(({ key, label, desc, value }) => {
    const v     = value ?? "—";
    const score = value ? scoreFromMetric(key, value) : 50;
    return { label, desc, value: v, score, color: scoreColor(score) };
  });
}

/** Calculates score diff between desktop and mobile for the comparison table */
function diff(desktopScore: number, mobileScore: number): number {
  return mobileScore - desktopScore;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SpeedTest = () => {
  const [report, setReport]   = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [mode, setMode]       = useState<Mode>("mobile");

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
      <div className="space-y-4 pb-6">
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-bold text-slate-800">Speed Test</h2>
          </div>
          <div className="px-6 py-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-400">Loading speed data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Fetch error ──
  if (error) {
    return (
      <div className="space-y-4 pb-6">
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-bold text-slate-800">Speed Test</h2>
          </div>
          <div className="px-6 py-10 text-center text-sm text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  // ── Map API data ──
  const speed        = report?.results?.speed;
  const desktopData  = speed?.desktop ?? {};
  const mobileData   = speed?.mobile  ?? {};

  // Your API returns desktop with an error field and no metrics — handle gracefully
  const desktopHasData = !desktopData.error && !!desktopData.FCP;
  const mobileHasData  = !mobileData.error  && !!mobileData.FCP;

  const desktopMetrics = desktopHasData ? buildMetrics(desktopData) : [];
  const mobileMetrics  = mobileHasData  ? buildMetrics(mobileData)  : [];

  const currentMetrics = mode === "desktop" ? desktopMetrics : mobileMetrics;
  const currentScore   = mode === "desktop"
    ? (desktopData.performance_score ?? null)
    : (mobileData.performance_score  ?? null);

  // Comparison table — only show if both have data, otherwise use what we have
  const comparisonKeys = [
    { key: "FCP",        label: "First Contentful Paint" },
    { key: "LCP",        label: "Largest Contentful Paint" },
    { key: "CLS",        label: "Cumulative Layout Shift" },
    { key: "TBT",        label: "Total Blocking Time" },
    { key: "SpeedIndex", label: "Speed Index" },
  ];

  const comparison = comparisonKeys.map(({ key, label }) => {
    const dVal = (desktopData as any)[key] as string | undefined;
    const mVal = (mobileData  as any)[key] as string | undefined;
    const dScore = dVal ? scoreFromMetric(key, dVal) : null;
    const mScore = mVal ? scoreFromMetric(key, mVal) : null;
    const d = dScore != null && mScore != null ? mScore - dScore : null;
    return { label, desktop: { value: dVal ?? "—", score: dScore }, mobile: { value: mVal ?? "—", score: mScore }, diff: d };
  });

  return (
    <div className="space-y-4 pb-6">

      {/* Tab Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => setMode("desktop")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={mode === "desktop" ? { backgroundColor: ACCENT, color: "#fff" } : { backgroundColor: "transparent", color: "#64748b" }}
        >
          <Monitor className="w-4 h-4" />
          Desktop
        </button>
        <button
          onClick={() => setMode("mobile")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={mode === "mobile" ? { backgroundColor: ACCENT, color: "#fff" } : { backgroundColor: "transparent", color: "#64748b" }}
        >
          <Smartphone className="w-4 h-4" />
          Mobile
        </button>
      </div>

      {/* Performance Score */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-slate-500 mb-4">
          {mode === "desktop" ? "Desktop" : "Mobile"} Performance Score
        </p>
        {currentScore != null ? (
          <>
            <p className="text-8xl font-bold text-slate-800 leading-none">{Math.round(currentScore)}</p>
            <p className="text-sm text-slate-400 mt-3">/ 100</p>
          </>
        ) : (
          <p className="text-slate-400 text-sm mt-2">
            {mode === "desktop" && desktopData.error
              ? `Desktop data unavailable: ${desktopData.error || "API error"}`
              : "Score not available"}
          </p>
        )}
      </div>

      {/* Metric Cards — only render if we have data for the current mode */}
      {currentMetrics.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            {currentMetrics.slice(0, 3).map((m) => (
              <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-sm font-semibold text-slate-700 mb-1">{m.label}</p>
                <p className="text-xs text-slate-400 mb-4">{m.desc}</p>
                <p className="text-4xl font-bold text-slate-800 mb-1">{m.value}</p>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400">Score: {m.score}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${m.score}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {currentMetrics.slice(3).map((m) => (
              <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-sm font-semibold text-slate-700 mb-1">{m.label}</p>
                <p className="text-xs text-slate-400 mb-4">{m.desc}</p>
                <p className="text-4xl font-bold text-slate-800 mb-1">{m.value}</p>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-400">Score: {m.score}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${m.score}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-8 text-center text-sm text-slate-400">
          {mode === "desktop"
            ? "Desktop metrics not available for this report."
            : "Mobile metrics not available for this report."}
        </div>
      )}

      {/* Desktop vs Mobile Comparison */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Desktop vs Mobile Comparison</h3>
        </div>

        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-6 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
          <span>Metric</span>
          <span className="text-center">Desktop</span>
          <span className="text-center">Mobile</span>
          <span className="text-right">Difference</span>
        </div>

        {comparison.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-6 py-4 ${i !== comparison.length - 1 ? "border-b border-slate-100" : ""}`}
          >
            <span className="text-sm text-slate-700">{row.label}</span>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">{row.desktop.value}</p>
              {row.desktop.score != null && (
                <p className="text-xs text-slate-400">{row.desktop.score}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">{row.mobile.value}</p>
              {row.mobile.score != null && (
                <p className="text-xs text-slate-400">{row.mobile.score}</p>
              )}
            </div>
            <span className={`text-sm font-semibold text-right ${row.diff != null && row.diff < 0 ? "text-red-500" : "text-green-500"}`}>
              {row.diff != null ? (row.diff > 0 ? `+${row.diff}` : row.diff) : "—"}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default SpeedTest;
