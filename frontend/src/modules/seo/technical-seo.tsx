import { ChevronDown, ChevronUp, FileText, Heading, Image as ImageIcon, Link2, Tag } from "lucide-react";
import React, { useEffect, useState } from "react";

const ACCENT = "#EF4F6E";

// ─── Types ────────────────────────────────────────────────────────────────────

type TechnicalError = {
  type: string;
  message: string;
  url: string;
};

type HTMLPage = {
  url: string;
  errors: string[];
};

type ApiReport = {
  url: string;
  overall_score: number;
  scores: {
    technical: number;
    content: number;
    links: number;
    performance: number;
    grade: string;
  };
  results: {
    html: {
      base_url: string;
      pages: HTMLPage[];
    };
    technical: {
      url: string;
      total_errors: number;
      errors: TechnicalError[];
      error_summary: Record<string, number>;
    };
  };
};

type Issue = {
  label: string;
  items: string[];
  icon: React.ElementType;
};

type PageAudit = {
  path: string;
  issueCount: number;
  score: number;
  issues: Issue[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHTMLErrors(rawErrors: string[]): Issue[] {
  const counts: Record<string, number> = {};
  for (const e of rawErrors) {
    counts[e] = (counts[e] || 0) + 1;
  }

  const htmlItems: string[] = [];
  const metaItems: string[] = [];
  const headingItems: string[] = [];
  const linkItems: string[] = [];
  const imageItems: string[] = [];

  for (const [msg, count] of Object.entries(counts)) {
    const label = count > 1 ? `${msg} (×${count})` : msg;
    if (/unclosed|unexpected closing|deprecated|invalid html/i.test(msg)) {
      htmlItems.push(label);
    } else if (/<title>|meta description|og |canonical|charset/i.test(msg)) {
      metaItems.push(label);
    } else if (/heading|h1/i.test(msg)) {
      headingItems.push(label);
    } else if (/broken link/i.test(msg)) {
      linkItems.push(label);
    } else if (/alt attribute|duplicate id/i.test(msg)) {
      imageItems.push(label);
    }
  }

  const issues: Issue[] = [];
  if (htmlItems.length)    issues.push({ label: "HTML Issues",    icon: FileText,   items: htmlItems });
  if (metaItems.length)    issues.push({ label: "Meta Issues",    icon: Tag,        items: metaItems });
  if (headingItems.length) issues.push({ label: "Heading Issues", icon: Heading,    items: headingItems });
  if (linkItems.length)    issues.push({ label: "Link Issues",    icon: Link2,      items: linkItems });
  if (imageItems.length)   issues.push({ label: "Image Issues",   icon: ImageIcon,  items: imageItems });

  return issues;
}

function calcPageScore(issues: Issue[]): number {
  const total = issues.reduce((sum, i) => sum + i.items.length, 0);
  return Math.max(20, 100 - Math.min(total * 8, 80));
}

function mapReportToPages(report: ApiReport): PageAudit[] {
  const htmlPages = report?.results?.html?.pages ?? [];
  const seen = new Set<string>();

  return htmlPages
    .filter((p) => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    })
    .map((page) => {
      const issues = parseHTMLErrors(page.errors);
      const issueCount = issues.reduce((sum, i) => sum + i.items.length, 0);
      const score = calcPageScore(issues);

      let path = page.url;
      try {
        const parsed = new URL(page.url);
        path = parsed.pathname === "/" ? "/" : parsed.pathname;
      } catch (_) {}

      return { path, issueCount, score, issues };
    });
}

// ─── PageRow ──────────────────────────────────────────────────────────────────

function PageRow({ page }: { page: PageAudit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-800 break-all">{page.path}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {page.issueCount} {page.issueCount === 1 ? "issue" : "issues"} found
          </p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1.5">Technical Score</p>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${page.score}%`, backgroundColor: ACCENT, transition: "width 1s ease" }}
                />
              </div>
              <span className="text-sm font-bold text-gray-800 w-6 text-right">{page.score}</span>
            </div>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-8 py-6 space-y-6 border-t border-gray-100 bg-white">
          {page.issues.length === 0 ? (
            <p className="text-sm text-gray-400">No issues found for this page.</p>
          ) : (
            page.issues.map((issue) => (
              <div key={issue.label}>
                <div className="flex items-center gap-2 mb-2">
                  <issue.icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">{issue.label}</span>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {issue.items.length}
                  </span>
                </div>
                <ul className="space-y-1 pl-6">
                  {issue.items.map((item) => (
                    <li key={item} className="text-sm text-gray-500 before:content-['•'] before:mr-2 before:text-gray-400">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component — no props needed, fetches its own data ──────────────────

const TechnicalSeo = () => {
  const [report, setReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestReport = async () => {
      try {
        setLoading(true);

        // Step 1: get all reports → pick latest (API returns desc order)
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

  const pages = report ? mapReportToPages(report) : [];

  // ── Loading ──
  if (loading) {
    return (
      <div className="pb-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5">
            <h2 className="text-lg font-bold text-gray-800">Technical SEO Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">Review technical issues found on your pages</p>
          </div>
          <div className="px-6 py-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading report...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="pb-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5">
            <h2 className="text-lg font-bold text-gray-800">Technical SEO Analysis</h2>
          </div>
          <div className="px-6 py-10 text-center text-sm text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Technical SEO Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">Review technical issues found on your pages</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400 mb-1">Overall Technical Score</p>
            <span className="text-2xl font-bold" style={{ color: ACCENT }}>
              {report?.scores?.technical ?? "—"}
              <span className="text-sm font-normal text-gray-400">/100</span>
            </span>
          </div>
        </div>

        {/* Error summary badges */}
        {report?.results?.technical?.error_summary && (
          <div className="px-6 pb-4 flex flex-wrap gap-3">
            {Object.entries(report.results.technical.error_summary).map(([type, count]) => (
              <span key={type} className="text-xs font-semibold bg-red-50 text-red-500 border border-red-100 rounded-full px-3 py-1">
                {type.replace(/_/g, " ")}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Page rows */}
        {pages.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400 border-t border-gray-100">
            No page data available.
          </div>
        ) : (
          pages.map((page) => <PageRow key={page.path} page={page} />)
        )}

      </div>
    </div>
  );
};

export default TechnicalSeo;
