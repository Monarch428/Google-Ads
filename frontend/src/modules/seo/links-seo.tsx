import { AlertTriangle, ExternalLink, Link2 } from "lucide-react";
import { useEffect, useState } from "react";

const ACCENT = "#EF4F6E";

// ─── Types matching API response ─────────────────────────────────────────────

type ApiLinksReport = {
  internal_links: {
    count: number;
    urls: string[];
    broken: string[];
  };
  external_links: {
    count: number;
    urls: string[];
    broken: [string, number][]; // [url, status_code]
  };
  broken_links_summary: {
    total: number;
    internal: number;
    external: number;
  };
};

type ApiReport = {
  scores: {
    links: number;
    content: number;
    technical: number;
    performance: number;
    grade: string;
  };
  results: {
    links: ApiLinksReport;
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: ACCENT }}
    >
      {status}
    </span>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-6 py-8 text-center text-sm text-gray-400">{message}</div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const LinksSeo = () => {
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
      <div className="space-y-4 pb-6">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-bold text-gray-800">Links SEO</h2>
          </div>
          <div className="px-6 py-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading link data...</p>
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
            <Link2 className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-bold text-gray-800">Links SEO</h2>
          </div>
          <div className="px-6 py-10 text-center text-sm text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  // ── Map API data ──
  const links = report?.results?.links;
  const internalUrls = links?.internal_links?.urls ?? [];
  const externalUrls = links?.external_links?.urls ?? [];
  const brokenLinks = links?.external_links?.broken ?? [];
  const summary = links?.broken_links_summary;

  const stats = [
    { label: "Internal Links", icon: Link2, value: links?.internal_links?.count ?? 0 },
    { label: "External Links", icon: ExternalLink, value: links?.external_links?.count ?? 0 },
    { label: "Broken Links", icon: AlertTriangle, value: summary?.total ?? 0 },
  ];

  // Build broken URL set for quick lookup (to flag in external list)
  const brokenUrlSet = new Set(brokenLinks.map(([url]) => url));

  return (
    <div className="space-y-4 pb-6">

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, icon: Icon, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Internal + External Links */}
      <div className="grid grid-cols-2 gap-4">

        {/* Internal Links */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
            <Link2 className="w-4 h-4 text-gray-500" />
            <h3 className="text-base font-bold text-gray-800">Internal Links</h3>
            <span className="ml-auto text-xs font-semibold text-gray-400">
              {links?.internal_links?.count ?? 0} total
            </span>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr] px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
            <span>URL</span>
          </div>

          {internalUrls.length === 0 ? (
            <EmptyRow message="No internal links found." />
          ) : (
            // Show first 10 to keep UI manageable
            internalUrls.slice(0, 10).map((url, i) => {
              let path = url;
              try { path = new URL(url).pathname; } catch (_) { }
              return (
                <div
                  key={url}
                  className={`flex items-center px-6 py-3 ${i !== Math.min(internalUrls.length, 10) - 1 ? "border-b border-gray-100" : ""}`}
                >
                  <span className="text-sm text-gray-700 font-mono truncate">{path}</span>
                </div>
              );
            })
          )}

          {internalUrls.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              +{internalUrls.length - 10} more internal links
            </div>
          )}
        </div>

        {/* External Links */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
            <ExternalLink className="w-4 h-4 text-gray-500" />
            <h3 className="text-base font-bold text-gray-800">External Links</h3>
            <span className="ml-auto text-xs font-semibold text-gray-400">
              {links?.external_links?.count ?? 0} total
            </span>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_auto] px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
            <span>URL</span>
            <span>Status</span>
          </div>

          {externalUrls.length === 0 ? (
            <EmptyRow message="No external links found." />
          ) : (
            externalUrls.slice(0, 10).map((url, i) => {
              const isBroken = brokenUrlSet.has(url);
              return (
                <div
                  key={url}
                  className={`grid grid-cols-[1fr_auto] items-center px-6 py-3 gap-3 ${i !== Math.min(externalUrls.length, 10) - 1 ? "border-b border-gray-100" : ""}`}
                >
                  <span className={`text-sm font-mono truncate ${isBroken ? "text-red-400" : "text-gray-700"}`}>
                    {url}
                  </span>
                  {isBroken ? (
                    <span className="text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded-full px-2 py-0.5 shrink-0">
                      Broken
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-100 rounded-full px-2 py-0.5 shrink-0">
                      OK
                    </span>
                  )}
                </div>
              );
            })
          )}

          {externalUrls.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              +{externalUrls.length - 10} more external links
            </div>
          )}
        </div>

      </div>

      {/* Broken Links */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden border-l-4 border-l-gray-800">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-base font-bold text-gray-800">Broken Links</h3>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            {summary?.total ?? 0} Require Attention
          </span>
          {summary && (
            <span className="ml-auto text-xs text-gray-400">
              {summary.internal} internal · {summary.external} external
            </span>
          )}
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[2fr_1fr] px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
          <span>Broken URL</span>
          <span className="text-right">Status Code</span>
        </div>

        {brokenLinks.length === 0 ? (
          <EmptyRow message="No broken links found. 🎉" />
        ) : (
          brokenLinks.map(([url, statusCode], i) => (
            <div
              key={url}
              className={`grid grid-cols-[2fr_1fr] items-center px-6 py-4 ${i !== brokenLinks.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <span className="text-sm text-gray-700 font-mono truncate pr-4">{url}</span>
              <div className="flex justify-end">
                <StatusBadge status={String(statusCode)} />
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default LinksSeo;
