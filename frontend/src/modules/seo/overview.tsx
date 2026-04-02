import { AlertTriangle, CheckCircle2, Clock, ExternalLink, FileText, Link2, Loader2, Search, Settings2, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "../../lib/router";

const ACCENT = "#EF4F6E";

const analysisSteps = [
  { id: "web-errors", label: "Web Errors" },
  { id: "technical-seo", label: "Technical SEO" },
  { id: "content-seo", label: "Content SEO" },
  { id: "links-seo", label: "Links SEO" },
  { id: "speed-test", label: "Speed Test" },
  { id: "seo-score", label: "SEO Score" },
];

type StepStatus = "waiting" | "processing" | "done";

function getScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getGradeLabel(score: number) {
  if (score >= 80) return "Good Performance";
  if (score >= 50) return "Needs Improvement";
  return "Poor Performance";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 60) return `${mins} minutes ago`;
  if (hrs < 24) return `${hrs} hours ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function CircularScore({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle
            cx="80" cy="80" r={radius}
            fill="none" stroke={color} strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-800">{score}</span>
          <span className="text-sm text-gray-400">/ 100</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium">{getGradeLabel(score)}</p>
    </div>
  );
}

export default function SeoOverview() {
  const { navigate } = useRouter();
  const [url, setUrl] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [loadingReportId, setLoadingReportId] = useState<number | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports`)
      .then((r) => r.json())
      .then((data) => setRecentReports(data))
      .catch(() => {});
  }, []);

  const scores = analysisResult?.scores ?? {};
  const overallScore = analysisResult?.overall_score ?? null;

  const scoreCards = [
    { label: "Content SEO", score: scores.content ?? 0, icon: FileText, route: "/modules/seo/content-seo" },
    { label: "Technical SEO", score: scores.technical ?? 0, icon: Settings2, route: "/modules/seo/technical-seo" },
    { label: "Links SEO", score: scores.links ?? 0, icon: Link2, route: "/modules/seo/links-seo" },
    { label: "Performance", score: scores.performance ?? 0, icon: Zap, route: "/modules/seo/speed-test" },
  ];

  // ── Fixed paths matching actual JSON structure ──
  const buildCriticalIssues = () => {
    if (!analysisResult?.results) return [];
    const issues: { text: string; detail: string }[] = [];
    const technical = analysisResult.results.technical ?? {};
    const links = analysisResult.results.links ?? {};

    const missingAlt = technical.error_summary?.MISSING_ALT_TEXT;
    if (missingAlt)
      issues.push({ text: "Images missing alt text", detail: `${missingAlt} images affected` });

    const brokenLinksTotal = links.broken_links_summary?.total;
    if (brokenLinksTotal)
      issues.push({ text: "Broken links detected", detail: `${brokenLinksTotal} links affected (${links.broken_links_summary?.internal ?? 0} internal, ${links.broken_links_summary?.external ?? 0} external)` });

    const brokenImages = technical.error_summary?.BROKEN_IMAGE;
    if (brokenImages)
      issues.push({ text: "Broken images found", detail: `${brokenImages} images` });

    const sitemapMissing = technical.error_summary?.SITEMAP_MISSING;
    if (sitemapMissing)
      issues.push({ text: "XML Sitemap is missing", detail: "Affects search engine crawlability" });

    const duplicateId = technical.error_summary?.DUPLICATE_ID;
    if (duplicateId)
      issues.push({ text: "Duplicate element IDs found", detail: `${duplicateId} occurrence${duplicateId > 1 ? "s" : ""}` });

    return issues.slice(0, 5);
  };

  const buildQuickWins = () => {
    if (!analysisResult?.results) return [];
    const wins: { text: string; detail: string }[] = [];
    const content = analysisResult.results.content ?? {};
    const technical = analysisResult.results.technical ?? {};
    const speed = analysisResult.results.speed ?? {};

    if (content.keyword_research?.status === "pass")
      wins.push({ text: "Good keyword coverage detected", detail: "High Impact" });

    const missingAlt = technical.error_summary?.MISSING_ALT_TEXT;
    if (missingAlt)
      wins.push({ text: `Add alt text to ${missingAlt} images`, detail: "High Impact" });

    if (content.content_quality?.details?.length_status === "pass")
      wins.push({ text: "Content length is adequate", detail: "Medium Impact" });

    if (speed?.desktop?.performance_score > 70)
      wins.push({ text: "Desktop performance is strong", detail: "Keep optimizing" });

    if (content.content_quality?.status === "pass")
      wins.push({ text: "Content quality looks good", detail: "Medium Impact" });

    return wins.slice(0, 4);
  };

  const criticalIssues = buildCriticalIssues();
  const quickWins = buildQuickWins();

  // ── Load a past report by ID into the overview ──
  const handleLoadReport = async (site: any) => {
    setLoadingReportId(site.id);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports/${site.id}`);
      if (!response.ok) throw new Error("Failed to load report");
      const data = await response.json();
      setAnalysisResult(data);
      setActiveReportId(site.id);
      setUrl(site.url);
      // scroll to top smoothly
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoadingReportId(null);
    }
  };

  // ── Analyse Handler ──
  const handleAnalyse = async () => {
    if (!url.trim()) return;
    setAnalysing(true);
    setStepStatuses({});
    setError(null);
    setAnalysisResult(null);
    setActiveReportId(null);

    const steps = analysisSteps.map((s) => s.id);
    let i = 0;
    setStepStatuses({ [steps[0]]: "processing", [steps[1]]: "processing" });

    const interval = setInterval(() => {
      setStepStatuses((prev) => {
        const next = { ...prev };
        next[steps[i]] = "done";
        if (i + 2 < steps.length) next[steps[i + 2]] = "processing";
        return next;
      });
      i++;
      if (i >= steps.length) clearInterval(interval);
    }, 900);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Analysis failed");
      }

      const data = await response.json();
      setAnalysisResult(data);
      setActiveReportId(data.id ?? null);

      fetch(`${import.meta.env.VITE_API_BASE_URL}/seo/reports`)
        .then((r) => r.json())
        .then(setRecentReports)
        .catch(() => {});
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      clearInterval(interval);
      const allDone: Record<string, StepStatus> = {};
      steps.forEach((s) => (allDone[s] = "done"));
      setStepStatuses(allDone);
      setTimeout(() => setAnalysing(false), 600);
    }
  };

  return (
    <div className="space-y-6">

      {/* URL Analyse Bar */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyse()}
          placeholder="Enter website URL to analyse (e.g. https://example.com)"
          className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 bg-transparent outline-none"
        />
        <button
          onClick={handleAnalyse}
          disabled={analysing}
          className="shrink-0 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {analysing ? "Analysing..." : "Analyse"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-6 pb-6">

        {/* Row 1: Overall Score + Score Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-gray-500 font-medium mb-2">Overall SEO Score</p>
              {overallScore !== null ? (
                <CircularScore score={overallScore} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-300">
                  <div className="w-44 h-44 rounded-full border-12 border-gray-100 flex items-center justify-center">
                    <span className="text-sm text-gray-400">No data yet</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-4">
            {scoreCards.map(({ label, score, icon: Icon, route }) => {
              const color = getScoreColor(score);
              return (
                <div
                  key={label}
                  onClick={() => route && navigate(route)}
                  className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col justify-between gap-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="text-3xl font-bold text-gray-800">
                      {analysisResult ? score : "—"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-2">{label}</p>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: analysisResult ? `${score}%` : "0%",
                          backgroundColor: color,
                          transition: "width 1s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 2: Critical Issues + Quick Wins */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-700">Critical Issues</h3>
            </div>
            <div className="space-y-3">
              {criticalIssues.length > 0 ? (
                criticalIssues.map((item) => (
                  <div key={item.text} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {analysisResult ? "No critical issues found 🎉" : "Run an analysis to see issues"}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-semibold text-gray-700">Quick Wins</h3>
            </div>
            <div className="space-y-3">
              {quickWins.length > 0 ? (
                quickWins.map((item) => (
                  <div key={item.text} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {analysisResult ? "No quick wins identified" : "Run an analysis to see quick wins"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Recent Search History */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <Clock className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Recent Search History</h3>
          </div>
          {recentReports.length === 0 ? (
            <p className="text-sm text-gray-400 italic px-6 py-5">No reports yet. Run your first analysis above.</p>
          ) : (
            recentReports.map((site, i) => {
              const isActive = activeReportId === site.id;
              const isLoading = loadingReportId === site.id;
              return (
                <div
                  key={site.id}
                  className={`flex items-center justify-between px-6 py-5 transition cursor-pointer
                    ${i !== recentReports.length - 1 ? "border-b border-gray-100" : ""}
                    ${isActive ? "bg-pink-50 border-l-4 border-l-[#EF4F6E]" : "hover:bg-gray-50"}
                  `}
                  onClick={() => handleLoadReport(site)}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-800 hover:underline">{site.url}</span>
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(site.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">Score</p>
                      <p className="text-sm font-bold" style={{ color: getScoreColor(site.overall_score ?? 0) }}>
                        {site.overall_score ?? "—"}/100
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">Content</p>
                      <p className="text-sm font-semibold text-gray-600">{site.scores?.content ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">Technical</p>
                      <p className="text-sm font-bold text-gray-600">{site.scores?.technical ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">Grade</p>
                      <p className="text-sm font-semibold" style={{ color: ACCENT }}>{site.scores?.grade ?? "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Row 4: CTA Banner */}
        <div className="rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center" style={{ backgroundColor: ACCENT }}>
          <h2 className="text-xl font-bold text-white">Ready to improve your SEO?</h2>
          <p className="text-sm text-white/80">Start fixing issues or generate AI recommendations</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => navigate("/modules/seo/web-errors")}
              className="px-5 py-2.5 bg-white text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All Issues
            </button>
            <button
              onClick={() => navigate("/modules/seo/ai-insights")}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Generate AI Report
            </button>
          </div>
        </div>

      </div>

      {/* Analysing Modal */}
      {analysing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8">
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Analyzing Your Website</h2>
              <p className="text-sm text-gray-400">This may take a few moments...</p>
            </div>
            <div className="space-y-4">
              {analysisSteps.map((step) => {
                const status = stepStatuses[step.id] ?? "waiting";
                return (
                  <div key={step.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {status === "done" ? (
                          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : status === "processing" ? (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                        )}
                        <span className="text-sm font-medium text-gray-700">{step.label}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-400">
                        {status === "done" ? "Done" : status === "processing" ? "Processing..." : "Waiting..."}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: status === "done" ? "100%" : status === "processing" ? "60%" : "0%",
                          backgroundColor: ACCENT,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
