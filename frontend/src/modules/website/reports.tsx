import React, { useState, useEffect } from "react";
import {
  FileText, Calendar, TrendingUp, TrendingDown,
  Download, Share2, Mail, Search, Filter, Loader2,
} from "lucide-react";
import { fetchRunNewChecks, getReportPdfUrl } from "../../lib/api";

const ACCENT = "#EF4F6E";
const ACCENT_LIGHT = "#fdf1f3";

type ReportType = "Comprehensive" | "SEO" | "Accessibility" | "Performance";

const typeColors: Record<ReportType, { bg: string; color: string }> = {
  Comprehensive: { bg: "#fdf4ff", color: "#a855f7" },
  SEO: { bg: "#eff6ff", color: "#3b82f6" },
  Accessibility: { bg: "#f0fdf4", color: "#16a34a" },
  Performance: { bg: "#fff7ed", color: "#f97316" },
};

function TypeBadge({ type }: { type: ReportType }) {
  const { bg, color } = typeColors[type] ?? typeColors["Comprehensive"];
  return (
    <span
      className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[14px] font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {type}
    </span>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const clean = dateStr.replace(/(\.\d{3})\d+/, "$1");
    const d = new Date(clean);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const scheduledReports = [
  { name: "Weekly QA Summary", schedule: "Every Monday at 9:00 AM" },
  { name: "Monthly Comprehensive Report", schedule: "1st of each month" },
  { name: "Client Executive Summary", schedule: "After each scan completion" },
];

const templates = [
  "Comprehensive QA Report",
  "SEO Analysis Report",
  "Accessibility Audit",
  "Executive Summary",
];

// ─────────────────────────── Email Wizard Modal ───────────────────
function EmailWizardModal({
  record,
  onClose,
}: {
  record: any;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"compose" | "sending" | "sent" | "error">("compose");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(`QA Audit Report – ${record.project_name}`);
  const [message, setMessage] = useState(
    `Hi,\n\nPlease find attached the QA audit report for the project "${record.project_name}".\n\nWebsite: ${record.website_url}\nGenerated: ${formatDate(record.created_at)}\nStatus: ${record.analysis_status === "complete" ? "Complete" : "Pending"}\n\nPlease review the findings and let us know if you have any questions.\n\nBest regards`
  );
  const [includeReport, setIncludeReport] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const allRecipients = to.split(",").map(e => e.trim()).filter(Boolean);
  const canSend =
    allRecipients.length > 0 &&
    allRecipients.every(isValidEmail) &&
    subject.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) { setError("Please enter valid email address(es)."); return; }
    setError(null);
    setStep("sending");

    try {
      const token = localStorage.getItem("token") ?? "";
      const apiUrl = (window as any).__NEXT_PUBLIC_API_URL__ || "http://localhost:8000";

      // ── Step 1: Fetch the PDF blob first ──────────────────────
      let pdfBase64: string | null = null;
      if (includeReport) {
        try {
          const pdfRes = await fetch(
            `${apiUrl}/website/run-new-checks/${record.id}/download-pdf`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            // Convert blob to base64
            pdfBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                // Strip the data:application/pdf;base64, prefix
                resolve(result.split(",")[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            console.log(`✅ PDF fetched: ${blob.size} bytes`);
          } else {
            console.warn("⚠️ PDF fetch failed:", pdfRes.status);
          }
        } catch (pdfErr) {
          console.warn("⚠️ PDF fetch error:", pdfErr);
          // Non-blocking — continue sending email without PDF
        }
      }

      // ── Step 2: Send email with base64 PDF in payload ─────────
      const res = await fetch(`${apiUrl}/api/send-report-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          to: allRecipients,
          cc: cc ? cc.split(",").map((e: string) => e.trim()).filter(Boolean) : [],
          subject,
          message,
          project_name: record.project_name,
          include_report: includeReport,
          report_id: record.id,
          pdf_base64: pdfBase64,           // ← Send the actual PDF bytes
          pdf_filename: `${record.project_name.replace(/\s+/g, "_")}_report.pdf`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to send email");
      }

      setStep("sent");
    } catch (err: any) {
      setError(err.message || "Failed to send email");
      setStep("error");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e8eaf0",
    borderRadius: 9,
    fontSize: 13,
    color: "#1a1a2e",
    background: "#fafafa",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color .2s",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        zIndex: 1000, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
          boxShadow: "0 24px 60px rgba(0,0,0,.18)", overflow: "hidden",
          maxHeight: "90vh", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 28px 16px", borderBottom: "1.5px solid #f0f1f5",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: ACCENT_LIGHT,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>Email Report</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{record.project_name}</div>
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 22, lineHeight: 1, padding: 4 }}>
            ×
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>

          {/* ── Compose ── */}
          {step === "compose" && (
            <>
              {/* To */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  To <span style={{ color: ACCENT }}>*</span>
                </label>
                <input
                  value={to}
                  onChange={e => { setTo(e.target.value); setError(null); }}
                  placeholder="recipient@example.com, another@example.com"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = ACCENT)}
                  onBlur={e => (e.target.style.borderColor = "#e8eaf0")}
                />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Separate multiple emails with commas</div>
              </div>

              {/* CC */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>CC</label>
                <input
                  value={cc}
                  onChange={e => setCc(e.target.value)}
                  placeholder="cc@example.com (optional)"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = ACCENT)}
                  onBlur={e => (e.target.style.borderColor = "#e8eaf0")}
                />
              </div>

              {/* Subject */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Subject <span style={{ color: ACCENT }}>*</span>
                </label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = ACCENT)}
                  onBlur={e => (e.target.style.borderColor = "#e8eaf0")}
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={7}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => (e.target.style.borderColor = ACCENT)}
                  onBlur={e => (e.target.style.borderColor = "#e8eaf0")}
                />
              </div>

              {/* Attach PDF toggle */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "#f9fafb", borderRadius: 10,
                border: "1.5px solid #e8eaf0", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Attach PDF Report</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>Include the full audit report as attachment</div>
                  </div>
                </div>
                <div
                  onClick={() => setIncludeReport(v => !v)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, cursor: "pointer",
                    background: includeReport ? ACCENT : "#d1d5db",
                    position: "relative", transition: "background .2s", flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 2, left: includeReport ? 20 : 2,
                    width: 18, height: 18, borderRadius: "50%", background: "#fff",
                    transition: "left .2s",
                  }} />
                </div>
              </div>

              {/* Report meta pill */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <span style={{ padding: "4px 12px", borderRadius: 20, background: ACCENT_LIGHT, color: ACCENT, fontSize: 12, fontWeight: 600 }}>
                  {record.project_name}
                </span>
                <span style={{ padding: "4px 12px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 600 }}>
                  {record.analysis_status === "complete" ? "Complete" : "Pending"}
                </span>
                <span style={{ padding: "4px 12px", borderRadius: 20, background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600 }}>
                  {formatDate(record.created_at)}
                </span>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, background: "#fef2f2",
                  border: "1px solid #fca5a5", color: "#dc2626", fontSize: 13, marginBottom: 16,
                }}>
                  ⚠ {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={onClose}
                  style={{
                    padding: "10px 22px", borderRadius: 9, border: "1.5px solid #e8eaf0",
                    background: "#fff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSend} disabled={!canSend}
                  style={{
                    padding: "10px 28px", borderRadius: 9, border: "none",
                    background: canSend ? ACCENT : "#f0a0ab", color: "#fff",
                    fontWeight: 700, fontSize: 13, cursor: canSend ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 8,
                    boxShadow: canSend ? `0 4px 14px ${ACCENT}50` : "none",
                    transition: "background .2s",
                  }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
                  </svg>
                  Send Report
                </button>
              </div>
            </>
          )}

          {/* ── Sending ── */}
          {step === "sending" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: ACCENT_LIGHT,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: "reportSpin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", marginBottom: 6 }}>Sending Report…</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>Delivering to {allRecipients.join(", ")}</div>
              <style>{`@keyframes reportSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── Sent ── */}
          {step === "sent" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 32, color: "#16a34a",
              }}>✓</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 8 }}>Report Sent!</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>
                Successfully sent to:<br />
                <strong style={{ color: "#1a1a2e" }}>{allRecipients.join(", ")}</strong>
                {cc && <><br /><span style={{ color: "#9ca3af" }}>CC: {cc}</span></>}
              </div>
              <button type="button" onClick={onClose}
                style={{
                  padding: "11px 32px", borderRadius: 9, border: "none",
                  background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: "pointer", boxShadow: `0 4px 14px ${ACCENT}50`,
                }}>
                Done
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#fef2f2",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 26, color: "#dc2626",
              }}>✕</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", marginBottom: 6 }}>Failed to Send</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Something went wrong. Please try again.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button type="button" onClick={onClose}
                  style={{
                    padding: "10px 22px", borderRadius: 9, border: "1.5px solid #e8eaf0",
                    background: "#fff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>
                  Cancel
                </button>
                <button type="button" onClick={() => setStep("compose")}
                  style={{
                    padding: "10px 24px", borderRadius: 9, border: "none",
                    background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Main Reports page ────────────────────
const Reports = () => {
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [emailRecord, setEmailRecord] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token") ?? undefined;
    fetchRunNewChecks(token)
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(r =>
    r.project_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.website_url?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = async (id: number) => {
    setDownloading(id);
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(getReportPdfUrl(id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beesure_report_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("PDF generation failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  // Stats derived from real data
  const stats = [
    { label: "Total Reports", value: String(records.length), icon: <FileText className="w-5 h-5 text-[#EF4F6E]" /> },
    { label: "Complete", value: String(records.filter(r => r.analysis_status === "complete").length), icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
    { label: "Pending", value: String(records.filter(r => r.analysis_status !== "complete").length), icon: <TrendingDown className="w-5 h-5 text-orange-400" /> },
    { label: "This Month", value: String(records.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length), icon: <Calendar className="w-5 h-5 text-[#EF4F6E]" /> },
  ];

  return (
    <div className="space-y-4 pb-6">

      {/* Email Wizard Modal */}
      {emailRecord && (
        <EmailWizardModal record={emailRecord} onClose={() => setEmailRecord(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">View and download all generated audit reports</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
            <p className="text-sm text-gray-500 mb-3">{stat.label}</p>
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold text-gray-800">{stat.value}</p>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Table Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#EEF2F7] bg-white">
          <h3 className="text-[16px] font-semibold text-[#1E293B]">Generated Reports</h3>
          <div className="flex items-center gap-2 border border-[#E5EAF2] rounded-2xl px-4 py-3 bg-white min-w-[320px]">
            <Search className="w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by project or URL..."
              className="text-sm text-[#475569] placeholder:text-[#94A3B8] bg-transparent outline-none w-full"
            />
          </div>
        </div>

        {/* Column Headers — wider Actions column to fit both buttons */}
        <div className="grid grid-cols-[2.4fr_2fr_1.1fr_1.4fr_1fr_1.4fr] px-8 py-4 border-b border-[#EEF2F7] bg-[#FBFCFE] text-[15px] font-semibold text-[#64748B]">
          <span>Project Name</span>
          <span>Website URL</span>
          <span>Type</span>
          <span>Generated Date</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading reports...</span>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <FileText className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">No reports found.</p>
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.map((record, i) => (
          <div
            key={record.id}
            className={`grid grid-cols-[2.4fr_2fr_1.1fr_1.4fr_1fr_1.4fr] items-center px-8 py-5 hover:bg-[#FCFDFE] transition-colors ${i !== filtered.length - 1 ? "border-b border-[#EEF2F7]" : ""}`}
          >
            {/* Project Name */}
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">{record.project_name}</span>
            </div>

            {/* URL */}
            <a href={record.website_url} target="_blank" rel="noreferrer"
              className="text-[15px] text-[#3B82F6] hover:underline truncate block max-w-[260px]">
              {record.website_url}
            </a>

            {/* Type */}
            <TypeBadge type="Comprehensive" />

            {/* Date */}
            <div className="flex items-center gap-2 text-[15px] text-[#64748B]">
              <Calendar className="w-4 h-4 text-[#94A3B8]" />
              {formatDate(record.created_at)}
            </div>

            {/* Status */}
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${record.analysis_status === "complete"
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-orange-50 text-orange-500 border border-orange-200"
              }`}>
              {record.analysis_status === "complete" ? "Complete" : "Pending"}
            </span>

            {/* Actions — PDF + Email */}
            <div className="flex items-center gap-2">
              {record.report_result ? (
                <>
                  {/* PDF Download */}
                  <button
                    onClick={() => handleDownload(record.id)}
                    disabled={downloading === record.id}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: ACCENT }}
                    title="Download PDF Report"
                  >
                    {downloading === record.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    PDF
                  </button>

                  {/* Email Report */}
                  <button
                    onClick={() => setEmailRecord(record)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                    style={{
                      background: "#fff",
                      color: ACCENT,
                      border: `1.5px solid ${ACCENT}`,
                    }}
                    title="Email Report"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Email
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-300">No report</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Scheduled Reports</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {scheduledReports.map(s => (
              <div key={s.name} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.schedule}</p>
                </div>
                <span className="inline-flex px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Report Templates</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {templates.map(t => (
              <div key={t} className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Reports;
