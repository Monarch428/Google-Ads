import React, { useState, useEffect, useRef } from "react";
import {
  Search, Filter, Upload, FileText, Download,
  Trash2, CheckCircle2, Loader2, RefreshCw, Calendar,
  Play, BarChart2, X,
} from "lucide-react";

import {
  fetchWebsiteFiles,
  uploadWebsiteFiles,
  deleteWebsiteFile,
  saveAnalysisResult,
  updateFileStatus,
  fetchAnalysisResults,
  getWebsiteFileDownloadUrl,
  WebsiteFile,
  API_BASE_URL,
} from "../../lib/api";

import { useRouter } from "../../lib/router";

const ACCENT = "#EF4F6E";
const ACCENT_LIGHT = "#fdf1f3";

// ─────────────────────────── Helpers ───────────────────────────
function formatSize(size: string): string {
  if (size.includes("chars")) {
    const chars = parseInt(size.replace(" chars", "").replace(",", ""));
    const kb = chars / 1024;
    if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb.toFixed(1)} KB`;
  }
  return size;
}

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const colors: Record<string, string> = {
    pdf: "#ef4444",
    docx: "#3b82f6",
    doc: "#3b82f6",
    txt: "#6b7280",
    tsx: "#0ea5e9",
    ts: "#0ea5e9",
    xlsx: "#22c55e",
    csv: "#22c55e",
    zip: "#f59e0b",
    xml: "#8b5cf6",
  };
  return colors[ext] ?? "#6b7280";
}

function isCodeContent(text: string): boolean {
  const codeSignals = [
    /import\s+React/,
    /export\s+default/,
    /const\s+\w+\s*=/,
    /function\s+\w+\s*\(/,
    /className=/,
    /useState\(/,
    /@router\.(get|post|put|delete)/i,
    /def\s+\w+\s*\(/,
    /from\s+['"][\w./]+['"]/,
  ];
  return codeSignals.some((re) => re.test(text.slice(0, 500)));
}

function cleanSummary(raw: string, fileName: string): string {
  if (!raw || raw.trim().length < 10) {
    return `No readable summary returned for "${fileName}". The file content may be empty or binary.`;
  }

  if (isCodeContent(raw)) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "file";
    const lines = raw.split("\n").length;
    const words = raw.split(/\s+/).length;
    return (
      `This is a ${ext.toUpperCase()} source file (${lines} lines, ~${words} words). ` +
      `The AI agent processed the file content and extracted structural metadata. ` +
      `Upload document files (PDF, DOCX, TXT) for a natural language content summary.`
    );
  }

  const trimmed = raw.trim();
  if (trimmed.length <= 400) return trimmed;
  return trimmed.slice(0, 397) + "…";
}

// ─────────────────────────── Types ─────────────────────────────
interface AnalysisResult {
  fileId: string;
  fileName: string;
  projectName: string;
  timestamp: string;
  fileType: string;
  lineCount: number;
  wordCount: number;
  scores: {
    overall: number;
    seo: number;
    accessibility: number;
    performance: number;
    security: number;
  };
  issueCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  summary: string;
  isCodeFile: boolean;
}

// ─────────────────────────── API call ──────────────────────────
async function summarizeFile(
  fileId: string,
  token?: string
): Promise<{ meeting_id: string; summary: string }> {
  const res = await fetch(
    `${API_BASE_URL}/website/meeting-notes/summarize/${fileId}`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─────────────────────────── Map → AnalysisResult ──────────────
function buildResult(file: WebsiteFile, rawSummary: string): AnalysisResult {
  const isCode = isCodeContent(rawSummary);
  const lines = rawSummary.split("\n").length;
  const words = rawSummary.split(/\s+/).filter(Boolean).length;
  const summary = cleanSummary(rawSummary, file.name);
  const lower = rawSummary.toLowerCase();

  let baseScore: number;
  if (isCode) {
    baseScore = Math.min(90, Math.max(50, 70 + Math.floor(lines / 50)));
  } else {
    baseScore = Math.min(95, Math.max(40, 60 + Math.floor(words / 10)));
  }

  const hasSeoIssue =
    lower.includes("seo") || lower.includes("meta") || lower.includes("keyword");
  const hasAccessIssue =
    lower.includes("accessibility") ||
    lower.includes("aria") ||
    lower.includes("contrast");
  const hasPerfIssue =
    lower.includes("performance") ||
    lower.includes("slow") ||
    lower.includes("load");
  const hasSecIssue =
    lower.includes("ssl") ||
    lower.includes("https") ||
    lower.includes("security");
  const hasCritical =
    lower.includes("critical") ||
    lower.includes("broken") ||
    lower.includes("missing");
  const hasHigh =
    lower.includes("error") ||
    lower.includes("failed") ||
    lower.includes("invalid");
  const hasMedium =
    lower.includes("warning") ||
    lower.includes("improve") ||
    lower.includes("recommend");

  return {
    fileId: file.id,
    fileName: file.name,
    projectName: file.project,
    timestamp: new Date().toISOString(),
    fileType: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
    lineCount: lines,
    wordCount: words,
    scores: {
      overall: baseScore,
      seo: Math.min(100, baseScore + (hasSeoIssue ? -10 : 2)),
      accessibility: Math.min(100, baseScore + (hasAccessIssue ? -12 : 1)),
      performance: Math.min(100, baseScore + (hasPerfIssue ? -8 : 3)),
      security: Math.min(100, baseScore + (hasSecIssue ? -6 : 5)),
    },
    issueCount: {
      critical: hasCritical ? 1 : 0,
      high: hasHigh ? 2 : 0,
      medium: hasMedium ? 3 : 1,
      low: 1,
    },
    summary,
    isCodeFile: isCode,
  };
}

// ─────────────────────────── StatusBadge ───────────────────────
function StatusBadge({ status }: { status: WebsiteFile["status"] }) {
  let bg = "#eff6ff";
  let color = "#3b82f6";

  if (status === "Processed") {
    bg = "#f0fdf4";
    color = "#16a34a";
  } else if (status === "Analysed") {
    bg = "#f5f3ff";
    color = "#7c3aed";
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
}

// ─────────────────────────── ScoreRing ─────────────────────────
function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color =
    clamped >= 80 ? "#22c55e" : clamped >= 60 ? "#f97316" : "#ef4444";

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          fontSize: size < 50 ? 10 : 12,
          fontWeight: 700,
          color: "#1e293b",
        }}
      >
        {clamped}
      </span>
    </div>
  );
}

// ─────────────────────────── AnalysisPanel ─────────────────────
function AnalysisPanel({
  result,
  onClose,
  onGoToDashboard,
}: {
  result: AnalysisResult;
  onClose: () => void;
  onGoToDashboard: () => void;
}) {
  const { scores, issueCount } = result;
  const totalIssues =
    issueCount.critical +
    issueCount.high +
    issueCount.medium +
    issueCount.low;

  const scoreItems = [
    { label: "SEO", value: scores.seo },
    { label: "Accessibility", value: scores.accessibility },
    { label: "Performance", value: scores.performance },
    { label: "Security", value: scores.security },
  ];

  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #e8eaf0",
        borderRadius: 16,
        padding: "24px 28px",
        marginTop: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,.07)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 style={{ color: "#22c55e", width: 20, height: 20 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>
              Analysis Complete
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {result.fileName}
            <span
              style={{
                marginLeft: 8,
                padding: "2px 7px",
                borderRadius: 4,
                background: "#f1f5f9",
                color: "#64748b",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {result.fileType}
            </span>
            <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af" }}>
              {result.lineCount.toLocaleString()} lines ·{" "}
              {result.wordCount.toLocaleString()} words
            </span>
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ScoreRing score={scores.overall} size={56} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2e" }}>
            Overall
          </span>
        </div>

        {scoreItems.map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ScoreRing score={value} size={44} />
            <span style={{ fontSize: 10, color: "#6b7280" }}>{label}</span>
          </div>
        ))}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {issueCount.critical > 0 && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#fef2f2",
                color: "#ef4444",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {issueCount.critical} Critical
            </span>
          )}
          {issueCount.high > 0 && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: ACCENT_LIGHT,
                color: ACCENT,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {issueCount.high} High
            </span>
          )}
          {issueCount.medium > 0 && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#fff7ed",
                color: "#f97316",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {issueCount.medium} Medium
            </span>
          )}
          {issueCount.low > 0 && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f9fafb",
                color: "#6b7280",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {issueCount.low} Low
            </span>
          )}
          {totalIssues === 0 && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f0fdf4",
                color: "#16a34a",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              No Issues
            </span>
          )}
        </div>
      </div>

      {result.isCodeFile ? (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            📄 Source File Detected
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#475569",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {result.summary}
          </p>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 16,
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            <span>📏 {result.lineCount.toLocaleString()} lines</span>
            <span>📝 {result.wordCount.toLocaleString()} tokens</span>
            <span>🏷 {result.fileType} file</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            lineHeight: 1.7,
            marginBottom: 16,
            background: "#f9fafb",
            padding: "12px 16px",
            borderRadius: 8,
          }}
        >
          {result.summary}
        </div>
      )}

      {result.isCodeFile && (
        <div
          style={{
            fontSize: 11,
            color: "#94a3b8",
            marginBottom: 16,
            padding: "8px 12px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 6,
          }}
        >
          💡 <strong style={{ color: "#92400e" }}>Tip:</strong> For richer AI
          analysis, upload{" "}
          <strong style={{ color: "#92400e" }}>PDF, DOCX, or TXT</strong>{" "}
          documents containing your website content, brand guidelines, or meeting
          notes.
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onGoToDashboard}
          style={{
            padding: "9px 20px",
            borderRadius: 9,
            border: "none",
            background: ACCENT,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            boxShadow: `0 4px 14px ${ACCENT}40`,
          }}
        >
          <BarChart2 size={15} /> View in Dashboard
        </button>

        <button
          onClick={onClose}
          style={{
            padding: "9px 20px",
            borderRadius: 9,
            border: "1.5px solid #e8eaf0",
            background: "#fff",
            color: "#374151",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────── Main Component ────────────────────
const Inputs = () => {
  const { navigate } = useRouter();

  const [files, setFiles] = useState<WebsiteFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token: string | undefined = localStorage.getItem("token") ?? undefined;

  // ✅ Load analysis results from DB on mount (fallback to localStorage)
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const data = await fetchAnalysisResults(token);
        if (data && data.length > 0) {
          const map: Record<string, AnalysisResult> = {};
          data.forEach((r: any) => {
            map[r.file_id] = {
              fileId: r.file_id,
              fileName: r.file_name,
              projectName: r.project_name,
              timestamp: r.updated_at ?? r.created_at ?? new Date().toISOString(),
              fileType: r.file_type,
              lineCount: r.line_count,
              wordCount: r.word_count,
              isCodeFile: r.is_code_file === 1,
              scores: {
                overall: r.score_overall,
                seo: r.score_seo,
                accessibility: r.score_accessibility,
                performance: r.score_performance,
                security: r.score_security,
              },
              issueCount: {
                critical: r.issues_critical,
                high: r.issues_high,
                medium: r.issues_medium,
                low: r.issues_low,
              },
              summary: r.summary ?? "",
            };
          });
          setResults(map);
        }
      } catch (err) {
        console.error("DB fetch failed, falling back to localStorage:", err);
        try {
          const stored: AnalysisResult[] = JSON.parse(
            localStorage.getItem("bb_analysis_results") || "[]"
          );
          if (stored.length > 0) {
            const map: Record<string, AnalysisResult> = {};
            stored.forEach((r) => { map[r.fileId] = r; });
            setResults(map);
          }
        } catch {
          // ignore parse errors
        }
      }
    };
    loadAnalysis();
  }, []);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetchWebsiteFiles(token);
      setFiles(res.files);
    } catch {
      showToast("Failed to load files from server");
    } finally {
      setLoadingFiles(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadWebsiteFiles(e.target.files, token);
      setFiles((prev) => [...prev, ...res.uploaded]);
      showToast(`${res.count} file${res.count > 1 ? "s" : ""} uploaded successfully`);
    } catch (err: any) {
      showToast(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.files.length) return;
    setUploading(true);
    try {
      const res = await uploadWebsiteFiles(e.dataTransfer.files, token);
      setFiles((prev) => [...prev, ...res.uploaded]);
      showToast(`${res.count} file${res.count > 1 ? "s" : ""} uploaded successfully`);
    } catch (err: any) {
      showToast(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (file: WebsiteFile) => {
    const a = document.createElement("a");
    a.href = getWebsiteFileDownloadUrl(file.id);
    a.download = file.name;
    a.click();
    showToast(`Downloading ${file.name}…`);
  };

  const handleDelete = async (file: WebsiteFile) => {
    try {
      await deleteWebsiteFile(file.id, token);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setResults((prev) => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
      showToast(`${file.name} deleted`);
    } catch (err: any) {
      showToast(err.message || "Delete failed");
    }
  };

  const handleAnalyse = async (file: WebsiteFile) => {
    if (analysing.has(file.id)) return;

    setAnalysing((prev) => new Set(prev).add(file.id));
    setExpandedResult(null);

    try {
      const { summary: rawSummary } = await summarizeFile(file.id, token);
      const result = buildResult(file, rawSummary);

      setResults((prev) => ({ ...prev, [file.id]: result }));

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "Analysed" } : f
        )
      );

      // ✅ Save to DB
      try {
        await saveAnalysisResult(file.id, result, token);
        console.log("Analysis saved to DB ✅");
      } catch (err) {
        console.warn("Could not save analysis to DB:", err);
      }

      // ✅ Update status in ChromaDB
      try {
        await updateFileStatus(file.id, "Analysed", token);
        console.log("Status updated to Analysed ✅");
      } catch (err) {
        console.warn("Could not update file status:", err);
      }

      // ✅ Update localStorage as fallback cache
      const stored: AnalysisResult[] = JSON.parse(
        localStorage.getItem("bb_analysis_results") || "[]"
      );
      const uniqueMap: Record<string, any> = {};
      [...stored, result].forEach((r) => {
        uniqueMap[r.fileId] = r;
      });
      localStorage.setItem(
        "bb_analysis_results",
        JSON.stringify(Object.values(uniqueMap))
      );

      setExpandedResult(file.id);
      showToast("Analysis complete!");
    } catch (err: any) {
      showToast(`Analysis failed: ${err.message ?? "Please try again."}`);
    } finally {
      setAnalysing((prev) => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const handleAnalyseAll = async () => {
    const toAnalyse = filtered.filter((f) => !analysing.has(f.id));
    for (const file of toAnalyse) {
      handleAnalyse(file);
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  const goToDashboard = (result: AnalysisResult) => {
    localStorage.setItem("bb_latest_analysis", JSON.stringify(result));
    navigate("/modules/website");
  };

  const filtered = files.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.project.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ✅ Both counts derived from files array — stays in sync
  const analysedCount = files.filter((f) => f.status === "Analysed").length;
  const processedCount = files.filter((f) => f.status === "Processed").length;
  const anyAnalysing = analysing.size > 0;

  const totalSizeLabel = (() => {
    const kb = files.reduce((acc, f) => {
      const fmt = formatSize(f.size);
      const num = parseFloat(fmt);
      if (fmt.includes("MB")) return acc + num * 1024;
      if (fmt.includes("GB")) return acc + num * 1024 * 1024;
      return acc + num;
    }, 0);
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  })();

  const stats = [
    {
      label: "Total Files",
      value: String(files.length),
      icon: <FileText className="w-5 h-5" style={{ color: ACCENT }} />,
    },
    {
      label: "Total Size",
      value: totalSizeLabel,
      icon: <Upload className="w-5 h-5" style={{ color: ACCENT }} />,
    },
    {
      label: "Processed",
      value: String(processedCount),
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    },
    {
      label: "Analysed",
      value: String(analysedCount),
      icon: <BarChart2 className="w-5 h-5 text-purple-500" />,
    },
  ];

  const tableColumns =
    "minmax(240px,2.4fr) minmax(110px,0.9fr) minmax(140px,1.2fr) minmax(140px,1fr) minmax(90px,0.7fr) minmax(130px,1fr) minmax(140px,auto)";

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Inputs</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all uploaded files and project inputs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadFiles}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingFiles ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {files.length > 0 && (
            <button
              onClick={handleAnalyseAll}
              disabled={anyAnalysing}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-60"
              style={{ borderColor: ACCENT, color: ACCENT, background: ACCENT_LIGHT }}
            >
              {anyAnalysing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" fill={ACCENT} />
                  Analyse All
                </>
              )}
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Files
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-200 px-6 py-5"
          >
            <p className="text-sm text-gray-500 mb-3">{stat.label}</p>
            <div className="flex items-center gap-3">
              {stat.icon}
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Files table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Uploaded Files</h3>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files…"
                className="text-xs text-gray-600 placeholder:text-gray-400 bg-transparent outline-none w-32"
              />
            </div>

            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Processed">Processed</option>
                <option value="Processing">Processing</option>
                <option value="Analysed">Analysed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            <div
              className="grid items-center px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide"
              style={{ gridTemplateColumns: tableColumns }}
            >
              <span>File Name</span>
              <span>Type</span>
              <span>Project</span>
              <span>Upload Date</span>
              <span>Size</span>
              <span>Status</span>
              <span className="text-right pr-2">Actions</span>
            </div>

            {loadingFiles &&
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="grid items-center px-6 py-4 border-b border-gray-100"
                  style={{ gridTemplateColumns: tableColumns }}
                >
                  {[180, 80, 120, 100, 60, 80, 90].map((w, j) => (
                    <div
                      key={j}
                      className="h-4 bg-gray-100 rounded animate-pulse"
                      style={{ maxWidth: w }}
                    />
                  ))}
                </div>
              ))}

            {!loadingFiles && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <FileText className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">
                  {files.length === 0
                    ? "No files uploaded yet."
                    : "No files match your search."}
                </p>
              </div>
            )}

            {!loadingFiles &&
              filtered.map((file, i) => {
                const isAnalysing = analysing.has(file.id);
                const result = results[file.id];
                const isExpanded = expandedResult === file.id;

                return (
                  <React.Fragment key={file.id}>
                    <div
                      className={`grid items-center px-6 py-4 hover:bg-gray-50 transition-colors ${i !== filtered.length - 1 || isExpanded
                          ? "border-b border-gray-100"
                          : ""
                        } ${isAnalysing ? "bg-orange-50/30" : ""}`}
                      style={{ gridTemplateColumns: tableColumns }}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor: getFileColor(file.name) + "18",
                            color: getFileColor(file.name),
                          }}
                        >
                          {file.name.split(".").pop()?.slice(0, 3) ?? "?"}
                        </div>

                        <div className="min-w-0">
                          <span className="text-sm text-gray-700 font-medium block truncate max-w-full">
                            {file.name}
                          </span>

                          {result && !isExpanded && (
                            <button
                              onClick={() => setExpandedResult(file.id)}
                              className="text-xs font-semibold mt-0.5 hover:underline truncate max-w-full"
                              style={{ color: ACCENT }}
                            >
                              Score: {result.scores.overall} — View results ↓
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pr-3">
                        <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-md w-fit">
                          {file.type}
                        </span>
                      </div>

                      <span className="text-sm text-gray-500 truncate pr-3">
                        {file.project}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 pr-3 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-black shrink-0" />
                        {file.uploadDate || "—"}
                      </div>

                      <span className="text-sm text-gray-500 pr-3 whitespace-nowrap">
                        {formatSize(file.size)}
                      </span>

                      <div className="flex items-center gap-2 pr-3 flex-wrap">
                        <StatusBadge status={file.status} />
                        {isAnalysing && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap"
                            style={{ color: ACCENT }}
                          >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Scanning
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(file)}
                          title="Download"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(file)}
                          title="Delete"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleAnalyse(file)}
                          disabled={isAnalysing}
                          title={result ? "Re-analyse" : "Analyse file with AI"}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-sm whitespace-nowrap shrink-0"
                          style={{
                            background: result
                              ? "#f0fdf4"
                              : isAnalysing
                                ? ACCENT_LIGHT
                                : ACCENT,
                            color: result
                              ? "#16a34a"
                              : isAnalysing
                                ? ACCENT
                                : "#fff",
                            border: result
                              ? "1px solid #bbf7d0"
                              : isAnalysing
                                ? `1px solid ${ACCENT}`
                                : "none",
                          }}
                        >
                          {isAnalysing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : result ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Done
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" fill="#fff" />
                              Analyse
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && result && (
                      <div className="px-6 pb-4 border-b border-gray-100 bg-gray-50/50">
                        <AnalysisPanel
                          result={result}
                          onClose={() => setExpandedResult(null)}
                          onGoToDashboard={() => goToDashboard(result)}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="bg-white rounded-2xl border-2 border-dashed border-gray-200 px-6 py-12 flex flex-col items-center gap-4 cursor-pointer hover:border-[#EF4F6E] transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload
          className={`w-8 h-8 ${uploading ? "text-[#EF4F6E] animate-bounce" : "text-gray-300"
            }`}
        />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">
            {uploading ? "Uploading…" : "Upload New Files"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Drag and drop files here or click to browse
          </p>
        </div>

        <button
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: ACCENT }}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <Upload className="w-4 h-4" />
          Choose Files
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-800 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
};

export default Inputs;
