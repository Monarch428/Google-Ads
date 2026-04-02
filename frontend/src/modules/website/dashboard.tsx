import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  FolderKanban, Activity, AlertCircle, CheckCircle2,
  Play, Loader2, RefreshCw, FileText,
} from "lucide-react";
import { useRouter } from "../../lib/router";
import {
  fetchWebsiteFiles, fetchAnalysisResults, WebsiteFile, RunNewCheckPayload, saveRunNewCheck,
  analyzeContentAIWizard,
  analyzeDesignAIWizard,
  analyzeSEOAIWizard,
  analyzeAccessibilityWizard,
  analyzeTechnicalWizard,
  generateReportWizard,
  fetchRunNewChecksCount
} from "../../lib/api";

const ACCENT = "#e8455a";
const ACCENT_LIGHT = "#fdf1f3";

// ─────────────────────────── Types ───────────────────────────────
interface SavedScore {
  fileId: string;
  fileName: string;
  projectName: string;
  timestamp: string;
  scores: { overall: number; seo: number; accessibility: number; performance: number; security: number; };
  issueCount: { critical: number; high: number; medium: number; low: number; };
  summary: string;
  isCodeFile?: boolean;
}

interface AnalysisRow {
  file: WebsiteFile;
  score?: SavedScore;
}

// ─────────────────────────── Score ring ──────────────────────────
function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f97316" : ACCENT;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span style={{ position: "absolute", fontSize: 9, fontWeight: 800, color: "#1e293b" }}>{score}</span>
    </div>
  );
}

function QualityCircle({ score }: { score: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span style={{ position: "absolute", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{score}</span>
    </div>
  );
}

// ─────────────────────────── Wizard types & helpers ──────────────
interface SeoPage { id: number; page: string; title: string; description: string; keywords: string; index: boolean; }

interface WizardFormData {
  projectName: string; websiteUrl: string; projectId: string; clientRegion: string; projectType: string;
  language: string; contentFiles: File[]; contentPlacement: string; proofreading: string; missingContent: string; sitemapUrl: string; skipIncomplete: boolean;
  meetingNotes: string; clientEmails: string; specialRequests: string; deadlines: string; overallDeadline: string;
  brandNotes: string; primaryColor: string; secondaryColors: string; primaryFont: string; secondaryFont: string; themeDemoUrl: string;
  themeDesc: string; competitorRefs: string; designPrefsDesc: string; customLayout: string; priorityPages: string;
  formsList: string; formFields: string; captchaDetails: string; captchaBehavior: string; formSubmissionFlows: string;
  interactiveElements: string[]; interactiveBehavior: string; thirdPartyIntegrations: string;
  seoPages: SeoPage[]; canonicalUrls: string; altText: string; headerStructure: string; sitemapIndexNotes: string; ogTags: string; schemaMarkup: string; robotsTxt: string;
  compressionRules: string; namingConventions: string; priorityMedia: string; autoOptimize: boolean;
  accessibilityStandard: string; customAccessibility: string; deviceSizes: string[]; customDevices: string; browsers: string[]; browserNotes: string;
  altTextReq: string; textResizing: string; highContrast: string; keyboardNav: string; ariaLabels: string; accessibilityPriorityPages: string; accessibilityNotes: string;
  sslEnabled: boolean; sslDetails: string; redirects: string; redirectsVerified: boolean; scriptsCode: string; performanceNotes: string; thirdPartyIntegrationsSec: string;
  custom404: string; custom500: string; otherErrors: string; errorHandlingNotes: string; priorityTechnicalChecks: string; backupNotes: string;
  reportRecipients: string; reportFormat: string; severityLevels: string[]; kpiSelected: string[]; deliverySelected: string[]; autoWeekly: boolean;
  qaComments: string; followUpNotes: string; summaryMetrics: string;
}

const WIZARD_STEPS = ["Project Info", "Language & Content", "Meeting Notes & Communication Inputs", "Design & Brand", "Forms & Functionality", "SEO & Metadata", "Media & Assets", "Accessibility", "Security & Technical", "Reporting Setup"];
const INTERACTIVE_ELEMENTS_LIST = ["Pop-ups", "Sliders", "Modals", "Carousels", "Accordions", "Tabs", "Tooltips", "Dropdowns"];
const DEFAULT_DEVICES = ["Desktop (1920x1080)", "Laptop (1366x768)", "Tablet (768x1024)", "Mobile (375x667)", "Mobile (414x896)"];
const DEFAULT_BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Mobile Safari"];
const SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low", "Info"];
const KPI_OPTIONS = ["Pages Passed / Failed", "Number of Broken Links", "SEO Compliance Score", "Accessibility Score", "Performance Score", "Security Issues Count", "Image Optimization Status", "Mobile Responsiveness Score"];
const DELIVERY_TIMELINE_OPTIONS = ["Immediately after scan", "Daily summaries", "Weekly summaries", "Pre-client delivery"];
const INITIAL_SEO_PAGES: SeoPage[] = [
  { id: 1, page: "Home", title: "", description: "", keywords: "", index: true },
  { id: 2, page: "About", title: "", description: "", keywords: "", index: true },
];
const INITIAL_FORM: WizardFormData = {
  projectName: "", websiteUrl: "", projectId: "", clientRegion: "", projectType: "",
  language: "", contentFiles: [], contentPlacement: "", proofreading: "", missingContent: "", sitemapUrl: "", skipIncomplete: false,
  meetingNotes: "", clientEmails: "", specialRequests: "", deadlines: "", overallDeadline: "",
  brandNotes: "", primaryColor: "", secondaryColors: "", primaryFont: "", secondaryFont: "", themeDemoUrl: "",
  themeDesc: "", competitorRefs: "", designPrefsDesc: "", customLayout: "", priorityPages: "",
  formsList: "", formFields: "", captchaDetails: "", captchaBehavior: "", formSubmissionFlows: "",
  interactiveElements: [], interactiveBehavior: "", thirdPartyIntegrations: "",
  seoPages: INITIAL_SEO_PAGES, canonicalUrls: "", altText: "", headerStructure: "", sitemapIndexNotes: "", ogTags: "", schemaMarkup: "", robotsTxt: "",
  compressionRules: "", namingConventions: "", priorityMedia: "", autoOptimize: false,
  accessibilityStandard: "", customAccessibility: "", deviceSizes: DEFAULT_DEVICES, customDevices: "", browsers: DEFAULT_BROWSERS, browserNotes: "",
  altTextReq: "", textResizing: "", highContrast: "", keyboardNav: "", ariaLabels: "", accessibilityPriorityPages: "", accessibilityNotes: "",
  sslEnabled: false, sslDetails: "", redirects: "", redirectsVerified: false, scriptsCode: "", performanceNotes: "", thirdPartyIntegrationsSec: "",
  custom404: "", custom500: "", otherErrors: "", errorHandlingNotes: "", priorityTechnicalChecks: "", backupNotes: "",
  reportRecipients: "", reportFormat: "", severityLevels: ["Critical", "High", "Medium", "Low", "Info"],
  kpiSelected: KPI_OPTIONS.slice(), deliverySelected: [], autoWeekly: false,
  qaComments: "", followUpNotes: "", summaryMetrics: "",
};

// ─────────────────────────── Per-step validation ─────────────────
function validateStep(step: number, fd: WizardFormData): string | null {
  const isEmpty = (v: any) =>
    v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0);

  switch (step) {
    case 0: {
      if (isEmpty(fd.projectName)) return "Project Name is required.";
      if (isEmpty(fd.websiteUrl)) return "Website URL is required.";
      if (isEmpty(fd.projectId)) return "Project ID is required.";
      if (isEmpty(fd.clientRegion)) return "Client Region is required.";
      if (isEmpty(fd.projectType)) return "Project Type is required.";
      return null;
    }
    case 1: {
      if (isEmpty(fd.language)) return "Language Preference is required.";
      if (isEmpty(fd.contentPlacement)) return "Content Placement Instructions are required.";
      if (isEmpty(fd.proofreading)) return "Proofreading Instructions are required.";
      if (isEmpty(fd.missingContent)) return "Placeholder / Missing Content Notes are required.";
      if (isEmpty(fd.sitemapUrl)) return "Site Map URL is required.";
      return null;
    }
    case 2: {
      if (isEmpty(fd.meetingNotes)) return "Meeting Notes are required.";
      if (isEmpty(fd.specialRequests)) return "Special Requests or Notes are required.";
      if (isEmpty(fd.deadlines)) return "Deadlines & Priorities are required.";
      if (isEmpty(fd.overallDeadline)) return "Overall Project Deadline is required.";
      return null;
    }
    case 3: {
      if (isEmpty(fd.brandNotes)) return "Brand Notes are required.";
      if (isEmpty(fd.primaryColor)) return "Primary Brand Color is required.";
      if (isEmpty(fd.secondaryColors)) return "Secondary Color(s) are required.";
      if (isEmpty(fd.primaryFont)) return "Primary Font is required.";
      if (isEmpty(fd.secondaryFont)) return "Secondary Font is required.";
      if (isEmpty(fd.themeDemoUrl)) return "Theme Demo URL is required.";
      if (isEmpty(fd.competitorRefs)) return "Competitor Site References are required.";
      if (isEmpty(fd.customLayout)) return "Custom Layout or Feature Notes are required.";
      if (isEmpty(fd.priorityPages)) return "Priority Pages / Sections are required.";
      return null;
    }
    case 4: {
      if (isEmpty(fd.formsList)) return "Forms to be Tested are required.";
      if (isEmpty(fd.formFields)) return "Form Fields & Validation Rules are required.";
      if (isEmpty(fd.captchaDetails)) return "CAPTCHA / reCAPTCHA Details are required.";
      if (isEmpty(fd.formSubmissionFlows)) return "Form Submission Flows are required.";
      if (isEmpty(fd.thirdPartyIntegrations)) return "Third-party Integrations are required.";
      return null;
    }
    case 5: {
      if (isEmpty(fd.altText)) return "Alt Text for Images is required.";
      if (isEmpty(fd.headerStructure)) return "Header Structure (H1, H2, H3) is required.";
      if (isEmpty(fd.canonicalUrls)) return "Canonical URLs are required.";
      if (isEmpty(fd.sitemapIndexNotes)) return "Sitemap / Page Indexing Notes are required.";
      if (isEmpty(fd.ogTags)) return "Open Graph Tags are required.";
      if (isEmpty(fd.schemaMarkup)) return "Schema Markup is required.";
      if (isEmpty(fd.robotsTxt)) return "Robots.txt Configuration is required.";
      const hasPageData = fd.seoPages.some(p => !isEmpty(p.title));
      if (!hasPageData) return "At least one SEO page must have a Page Title.";
      return null;
    }
    case 6: {
      if (isEmpty(fd.compressionRules)) return "Compression Rules are required.";
      if (isEmpty(fd.namingConventions)) return "Naming Conventions are required.";
      if (isEmpty(fd.priorityMedia)) return "Priority Media / Key Assets are required.";
      return null;
    }
    case 7: {
      if (isEmpty(fd.accessibilityStandard)) return "Target Accessibility Standards are required.";
      if (isEmpty(fd.deviceSizes)) return "At least one Device Testing Requirement must be selected.";
      if (isEmpty(fd.browsers)) return "At least one Browser must be selected.";
      if (isEmpty(fd.altTextReq)) return "Alt Text Requirements are required.";
      if (isEmpty(fd.textResizing)) return "Text Resizing Requirements are required.";
      if (isEmpty(fd.highContrast)) return "High Contrast / Theme Specifications are required.";
      if (isEmpty(fd.keyboardNav)) return "Keyboard Navigation Requirements are required.";
      if (isEmpty(fd.ariaLabels)) return "ARIA Labels & Screen Reader Requirements are required.";
      if (isEmpty(fd.accessibilityPriorityPages)) return "Priority Pages for Accessibility are required.";
      if (isEmpty(fd.accessibilityNotes)) return "Additional Notes are required.";
      return null;
    }
    case 8: {
      if (isEmpty(fd.sslDetails)) return "SSL Details are required.";
      if (isEmpty(fd.redirects)) return "Redirects & URL Mapping are required.";
      if (isEmpty(fd.performanceNotes)) return "Performance & Page Load Notes are required.";
      if (isEmpty(fd.thirdPartyIntegrationsSec)) return "Third-Party Integrations (Security) are required.";
      if (isEmpty(fd.priorityTechnicalChecks)) return "Priority Technical Checks are required.";
      if (isEmpty(fd.backupNotes)) return "Backup / Recovery Notes are required.";
      return null;
    }
    case 9: {
      if (isEmpty(fd.reportRecipients)) return "Report Recipients are required.";
      if (isEmpty(fd.reportFormat)) return "Report Format is required.";
      if (isEmpty(fd.severityLevels)) return "At least one Severity Level must be selected.";
      return null;
    }
    default:
      return null;
  }
}

type SP = { fd: WizardFormData; set: (k: keyof WizardFormData, v: any) => void };

function WLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#1a1a2e", marginBottom: 6 }}>{children}{required && <span style={{ color: ACCENT }}> *</span>}</label>;
}
function WInput({ value, onChange, placeholder, type = "text", style, readOnly }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => !readOnly && onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      style={{
        width: "100%",
        padding: "10px 14px",
        border: "1.5px solid #e8eaf0",
        borderRadius: 8,
        fontSize: 13,
        color: "#1a1a2e",
        background: "#fafafa",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color .2s",
        ...style
      }}
      onFocus={e => !readOnly && (e.target.style.borderColor = ACCENT)}
      onBlur={e => (e.target.style.borderColor = "#e8eaf0")}
    />
  );
}
function WTextarea({ value, onChange, placeholder, rows = 3, style }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; style?: React.CSSProperties; }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e8eaf0", borderRadius: 8, fontSize: 13, color: "#1a1a2e", background: "#fafafa", outline: "none", resize: "vertical", boxSizing: "border-box", transition: "border-color .2s", fontFamily: "inherit", ...style }}
    onFocus={e => (e.target.style.borderColor = ACCENT)} onBlur={e => (e.target.style.borderColor = "#e8eaf0")} />;
}
function WSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; }) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e8eaf0", borderRadius: 8, fontSize: 13, color: value ? "#1a1a2e" : "#9ca3af", background: "#fafafa", outline: "none", appearance: "none", boxSizing: "border-box", cursor: "pointer", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>;
}
function WToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void; }) {
  return <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: value ? ACCENT : "#d1d5db", position: "relative", transition: "background .2s", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
  </div>;
}
function WUploadZone({ label, accept, hint, multiple = false, required }: { label?: string; accept?: string; hint?: string; multiple?: boolean; required?: boolean; }) {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const handle = (fs: FileList | null) => { if (fs) setFiles(prev => [...prev, ...Array.from(fs).map(f => f.name)]); };
  return (
    <div>
      {label && <WLabel required={required}>{label}</WLabel>}
      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }} onClick={() => ref.current?.click()}
        style={{ border: `1.5px dashed ${drag ? ACCENT : "#d1d5db"}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", background: drag ? ACCENT_LIGHT : "#fafafa", transition: "all .2s", cursor: "pointer" }}>
        <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={e => handle(e.target.files)} />
        <div style={{ fontSize: 24, marginBottom: 8 }}>↑</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label ? `Upload ${label.toLowerCase()}` : "Click to upload or drag and drop"}</div>
        {hint && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>{hint}</div>}
        <button type="button" onClick={e => { e.stopPropagation(); ref.current?.click(); }}
          style={{ padding: "7px 18px", border: "1.5px solid #d1d5db", borderRadius: 7, background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151" }}>↑ Choose Files</button>
        {files.length > 0 && <div style={{ marginTop: 8 }}>{files.map((f, i) => <span key={i} style={{ display: "inline-block", background: ACCENT_LIGHT, color: ACCENT, borderRadius: 4, padding: "2px 8px", fontSize: 11, margin: "2px" }}>{f}</span>)}</div>}
      </div>
    </div>
  );
}
function WCheckGroup({ items, selected, onChange }: { items: string[]; selected: string[]; onChange: (v: string[]) => void; }) {
  const toggle = (item: string) => onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  return <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
    {items.map(item => (
      <label key={item} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
        <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} style={{ accentColor: ACCENT, width: 15, height: 15 }} />{item}
      </label>
    ))}
  </div>;
}
function WField({ children }: { children: React.ReactNode }) { return <div style={{ marginBottom: 22 }}>{children}</div>; }
function WTwo({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>{children}</div>; }
function WTitle({ children }: { children: React.ReactNode }) { return <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: "0 0 20px", paddingBottom: 12, borderBottom: "1.5px solid #f0f1f5" }}>{children}</h2>; }
function WToggleRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#f9fafb", borderRadius: 10, border: "1.5px solid #e8eaf0" }}>
    <div><div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{label}</div>{sub && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{sub}</div>}</div>
    <WToggle value={value} onChange={onChange} />
  </div>;
}

function WStep1({ fd, set }: SP) {
  return (<><WTitle>Project Information</WTitle>
    <WTwo>
      <div><WLabel required>Project Name</WLabel><WInput value={fd.projectName} onChange={v => set("projectName", v)} placeholder="E.g., Homepage Redesign" /></div>
      <div><WLabel required>Website URL</WLabel><WInput value={fd.websiteUrl} onChange={v => set("websiteUrl", v)} placeholder="https://example.com" /></div>
    </WTwo>
    <WTwo>
      <div><WLabel required>Project ID</WLabel> <WInput
        value={fd.projectId}
        onChange={v => set("projectId", v)}
        placeholder="Auto-generating..."
        readOnly={true}
        style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed", userSelect: "none" }}
      /></div>
      <div><WLabel>Client Region</WLabel><WSelect value={fd.clientRegion} onChange={v => set("clientRegion", v)} placeholder="Select region" options={["North America", "Europe", "Asia Pacific", "Middle East", "Africa", "Latin America"]} /></div>
    </WTwo>
    <WField><WLabel required>Project Type</WLabel><WSelect value={fd.projectType} onChange={v => set("projectType", v)} placeholder="Select project type" options={["New Website Build", "Website Redesign", "E-commerce", "Landing Page", "Web Application", "Blog / Content Site"]} /></WField>
  </>);
}
function WStep2({ fd, set }: SP) {
  return (<><WTitle>Language & Content</WTitle>
    <WField><WLabel required>Language Preference</WLabel><WSelect value={fd.language} onChange={v => set("language", v)} placeholder="Select language" options={["English", "Spanish", "French", "German", "Arabic", "Hindi", "Portuguese", "Chinese", "Japanese"]} /></WField>
    <WField><WUploadZone required label="Content Files" accept=".doc,.docx,.txt,.html,.xlsx" hint="DOC, DOCX, TXT, HTML, XLSX (Max 10MB)" multiple /></WField>
    <WField><WLabel required>Content Placement Instructions</WLabel><WTextarea value={fd.contentPlacement} onChange={v => set("contentPlacement", v)} placeholder={`"Homepage Hero Text", "About Us Section"`} /></WField>
    <WField><WLabel required>Proofreading Instructions</WLabel><WTextarea value={fd.proofreading} onChange={v => set("proofreading", v)} placeholder="List any specific proofreading requirements..." /></WField>
    <WField><WLabel required>Placeholder / Missing Content Notes</WLabel><WTextarea value={fd.missingContent} onChange={v => set("missingContent", v)} placeholder={`"Blog section content to be provided by 25th Oct"`} /></WField>
    <WField><WUploadZone required label="Site Map / Page Structure" accept=".xml,.doc,.docx" hint="Upload sitemap.xml or page structure document" /></WField>
    <WField><WLabel required>Enter Site Map URL</WLabel><WInput value={fd.sitemapUrl} onChange={v => set("sitemapUrl", v)} placeholder="https://example.com/sitemap.xml" /></WField>
    <WToggleRow label="Skip Incomplete Sections" sub="Don't flag missing content in draft pages" value={fd.skipIncomplete} onChange={v => set("skipIncomplete", v)} />
  </>);
}
function WStep3({ fd, set }: SP) {
  return (<><WTitle>Meeting Notes & Communication Inputs</WTitle>
    <WField><WUploadZone required label="Meeting Notes / Minutes" accept=".doc,.docx,.pdf,.txt" hint="DOC, DOCX, PDF, TXT (Max 10MB)" multiple /></WField>
    <WField><WTextarea value={fd.meetingNotes} onChange={v => set("meetingNotes", v)} placeholder="Or paste meeting notes here..." rows={4} /></WField>
    <WField><WUploadZone required label="Client Emails / Instructions" accept=".doc,.docx,.pdf,.txt,.eml" hint="Upload email exports or instruction files" multiple /></WField>
    <WField><WTextarea value={fd.clientEmails} onChange={v => set("clientEmails", v)} placeholder="Or paste email content here..." rows={3} /></WField>
    <WField><WUploadZone required label="Forms / Information Collection Inputs" accept=".xlsx,.csv,.pdf,.doc" hint="XLSX, CSV, PDF, DOC (Max 10MB)" multiple /></WField>
    <WField><WLabel required>Special Requests or Notes</WLabel><WTextarea value={fd.specialRequests} onChange={v => set("specialRequests", v)} placeholder={`"Use pastel colors for images on the contact page"`} /></WField>
    <WField><WLabel required>Deadlines & Priorities</WLabel><WTextarea value={fd.deadlines} onChange={v => set("deadlines", v)} placeholder="List priority pages and their deadlines..." /></WField>
    <WField><WLabel required>Overall Project Deadline</WLabel><WInput type="date" value={fd.overallDeadline} onChange={v => set("overallDeadline", v)} /></WField>
  </>);
}
function WStep4({ fd, set }: SP) {
  return (<><WTitle>Design & Brand Style</WTitle>
    <WField><WUploadZone label="Brand Guidelines & Style Assets" accept=".pdf,.png,.jpg,.ai,.svg" hint="PDF, PNG, JPG, AI, SVG (Max 20MB)" multiple required /></WField>
    <WField><WTextarea value={fd.brandNotes} onChange={v => set("brandNotes", v)} placeholder="Or paste brand guideline notes here..." /></WField>
    <WTwo>
      <div><WLabel required>Primary Brand Color</WLabel><WInput value={fd.primaryColor} onChange={v => set("primaryColor", v)} placeholder="E.g., #ef3c63" /></div>
      <div><WLabel required>Secondary Color(s)</WLabel><WInput value={fd.secondaryColors} onChange={v => set("secondaryColors", v)} placeholder="E.g., #000000, #FFFFFF" /></div>
    </WTwo>
    <WTwo>
      <div><WLabel required>Primary Font</WLabel><WInput value={fd.primaryFont} onChange={v => set("primaryFont", v)} placeholder="E.g., Inter, Poppins" /></div>
      <div><WLabel required>Secondary Font</WLabel><WInput value={fd.secondaryFont} onChange={v => set("secondaryFont", v)} placeholder="E.g., Roboto, Open Sans" /></div>
    </WTwo>
    <WField><WUploadZone label="Theme / Template Preferences" accept=".png,.jpg,.pdf" hint="PNG, JPG, PDF (Max 20MB)" multiple /></WField>
    <WField><WLabel required>Theme Demo URL</WLabel><WInput value={fd.themeDemoUrl} onChange={v => set("themeDemoUrl", v)} placeholder="https://demo.themename.com" /></WField>
    <WField><WTextarea value={fd.themeDesc} onChange={v => set("themeDesc", v)} placeholder="Describe theme/template preferences..." /></WField>
    <WField><WLabel required>Competitor Site References</WLabel><WTextarea value={fd.competitorRefs} onChange={v => set("competitorRefs", v)} placeholder={`"https://competitor.com - uses sticky navigation"`} /></WField>
    <WField><WUploadZone label="Preferred Design Examples / Inspiration" accept=".png,.jpg,.pdf" hint="PNG, JPG, PDF (Max 20MB)" multiple /></WField>
    <WField><WTextarea value={fd.designPrefsDesc} onChange={v => set("designPrefsDesc", v)} placeholder="Describe design preferences (colors, typography, layout styles)..." /></WField>
    <WField><WLabel required>Custom Layout or Feature Notes</WLabel><WTextarea value={fd.customLayout} onChange={v => set("customLayout", v)} placeholder="Describe any custom components, animations, or interactive features..." /></WField>
    <WField><WLabel required>Priority Pages / Sections for Style Compliance</WLabel><WInput value={fd.priorityPages} onChange={v => set("priorityPages", v)} placeholder="E.g., Homepage, Product Pages, Checkout, Contact" /></WField>
  </>);
}
function WStep5({ fd, set }: SP) {
  return (<><WTitle>Forms, Functional Elements & CAPTCHA</WTitle>
    <WField><WUploadZone label="Forms to be Tested" accept=".pdf,.png,.jpg,.docx" hint="PDF, PNG, JPG, DOCX (Max 10MB)" multiple required /></WField>
    <WField><WTextarea value={fd.formsList} onChange={v => set("formsList", v)} placeholder="List forms and test credentials..." /></WField>
    <WField><WLabel required>Form Fields & Validation Rules</WLabel><WTextarea value={fd.formFields} onChange={v => set("formFields", v)} placeholder={`"Email field - required, must be valid format"`} /></WField>
    <WField><WLabel required>CAPTCHA / reCAPTCHA Details</WLabel><WInput value={fd.captchaDetails} onChange={v => set("captchaDetails", v)} placeholder="E.g., Google reCAPTCHA v3. Site Key: ABC123..." /></WField>
    <WField><WTextarea value={fd.captchaBehavior} onChange={v => set("captchaBehavior", v)} placeholder="Describe CAPTCHA behavior on success/failure..." /></WField>
    <WField><WLabel required>Form Submission Flows</WLabel><WTextarea value={fd.formSubmissionFlows} onChange={v => set("formSubmissionFlows", v)} placeholder={`"Contact form → Thank you message → Email sent to admin"`} /></WField>
    <WField>
      <WLabel required>Interactive Elements & Widgets</WLabel>
      <WCheckGroup items={INTERACTIVE_ELEMENTS_LIST} selected={fd.interactiveElements} onChange={v => set("interactiveElements", v)} />
      <WTextarea value={fd.interactiveBehavior} onChange={v => set("interactiveBehavior", v)} placeholder="Describe expected behavior for interactive elements..." style={{ marginTop: 12 }} />
    </WField>
    <WField><WLabel required>Third-party Integrations</WLabel><WTextarea value={fd.thirdPartyIntegrations} onChange={v => set("thirdPartyIntegrations", v)} placeholder={`"Mailchimp integration; Stripe payment gateway on checkout"`} /></WField>
  </>);
}
function WStep6({ fd, set }: SP) {
  const addPage = () => set("seoPages", [...fd.seoPages, { id: Date.now(), page: "", title: "", description: "", keywords: "", index: true }]);
  const updatePage = (id: number, field: keyof SeoPage, value: any) => set("seoPages", fd.seoPages.map(p => p.id === id ? { ...p, [field]: value } : p));
  const removePage = (id: number) => set("seoPages", fd.seoPages.filter(p => p.id !== id));
  return (<><WTitle>SEO & Metadata Inputs</WTitle>
    <WField>
      <WLabel required>Page Titles, Meta Descriptions & Keywords</WLabel>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "#f9fafb" }}>{["Page", "Page Title", "Meta Description", "Keywords", "Index", ""].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1.5px solid #e8eaf0" }}>{h}</th>)}</tr></thead>
          <tbody>{fd.seoPages.map(p => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f0f1f5" }}>
              <td style={{ padding: "8px 10px" }}><WInput value={p.page} onChange={v => updatePage(p.id, "page", v)} placeholder="Page name" style={{ minWidth: 80 }} /></td>
              <td style={{ padding: "8px 10px" }}><WInput value={p.title} onChange={v => updatePage(p.id, "title", v)} placeholder="Page title..." style={{ minWidth: 160 }} /></td>
              <td style={{ padding: "8px 10px" }}><WInput value={p.description} onChange={v => updatePage(p.id, "description", v)} placeholder="Meta description..." style={{ minWidth: 180 }} /></td>
              <td style={{ padding: "8px 10px" }}><WInput value={p.keywords} onChange={v => updatePage(p.id, "keywords", v)} placeholder="keywords, here" style={{ minWidth: 140 }} /></td>
              <td style={{ padding: "8px 10px", textAlign: "center" }}><WToggle value={p.index} onChange={v => updatePage(p.id, "index", v)} /></td>
              <td style={{ padding: "8px 10px" }}><button type="button" onClick={() => removePage(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16 }}>×</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <button type="button" onClick={addPage} style={{ marginTop: 10, padding: "7px 16px", background: ACCENT, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Page</button>
    </WField>
    <WField><WLabel required>Canonical URLs</WLabel><WTextarea value={fd.canonicalUrls} onChange={v => set("canonicalUrls", v)} placeholder={`"Homepage → https://example.com/"`} /></WField>
    <WField><WLabel required>Alt Text for Images</WLabel><WTextarea value={fd.altText} onChange={v => set("altText", v)} placeholder={`"Homepage hero image → Woman shopping for organic vegetables"`} /></WField>
    <WField><WLabel required>Header Structure (H1, H2, H3)</WLabel><WTextarea value={fd.headerStructure} onChange={v => set("headerStructure", v)} placeholder={`"Homepage → H1: Welcome | H2: Our Products | H2: Why Choose Us"`} /></WField>
    <WField><WUploadZone label="Upload Sitemap XML" accept=".xml" hint="Upload sitemap.xml file" /></WField>
    <WField><WLabel required>Sitemap / Page Indexing Notes</WLabel><WTextarea value={fd.sitemapIndexNotes} onChange={v => set("sitemapIndexNotes", v)} placeholder={`"Index: Home, About | Exclude: /admin"`} /></WField>
    <WTwo>
      <div><WLabel required>Open Graph Tags</WLabel><WTextarea value={fd.ogTags} onChange={v => set("ogTags", v)} placeholder="Specify OG tags for social media sharing..." /></div>
      <div><WLabel required>Schema Markup</WLabel><WTextarea value={fd.schemaMarkup} onChange={v => set("schemaMarkup", v)} placeholder="List any schema.org markup used..." /></div>
    </WTwo>
    <WField><WLabel required>Robots.txt Configuration</WLabel><WTextarea value={fd.robotsTxt} onChange={v => set("robotsTxt", v)} placeholder="List any specific robots.txt directives..." /></WField>
  </>);
}
function WStep7({ fd, set }: SP) {
  return (<><WTitle>Media & Assets</WTitle>
    <WField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {["Images", "Videos", "Icons/SVGs"].map(label => (
          <div key={label}>
            <div style={{ border: "1.5px dashed #d1d5db", borderRadius: 10, padding: "20px 12px", textAlign: "center", background: "#fafafa" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>↑</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Upload {label.toLowerCase()}</div>
              <button type="button" style={{ padding: "5px 14px", border: "1.5px solid #d1d5db", borderRadius: 6, background: "#fff", fontSize: 11, cursor: "pointer", color: "#374151" }}>Choose</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 6, textAlign: "center" }}>{label}</div>
          </div>
        ))}
      </div>
    </WField>
    <WField><WLabel required>Compression Rules</WLabel><WInput value={fd.compressionRules} onChange={v => set("compressionRules", v)} placeholder="E.g., Images under 500KB, WebP format preferred" /></WField>
    <WField><WLabel required>Naming Conventions</WLabel><WInput value={fd.namingConventions} onChange={v => set("namingConventions", v)} placeholder="E.g., lowercase-with-hyphens.jpg" /></WField>
    <WField><WLabel required>Priority Media / Key Assets</WLabel><WTextarea value={fd.priorityMedia} onChange={v => set("priorityMedia", v)} placeholder={`"Homepage hero image, Product showcase video, Company logo"`} /></WField>
    <WToggleRow label="Auto-optimize Assets" sub="Automatically compress and optimize uploaded media" value={fd.autoOptimize} onChange={v => set("autoOptimize", v)} />
  </>);
}
function WStep8({ fd, set }: SP) {
  return (<><WTitle>Accessibility & Responsiveness Inputs</WTitle>
    <WField>
      <WLabel required>Target Accessibility Standards</WLabel>
      <WSelect value={fd.accessibilityStandard} onChange={v => set("accessibilityStandard", v)} placeholder="Select standard" options={["WCAG 2.0 Level A", "WCAG 2.0 Level AA", "WCAG 2.1 Level AA", "WCAG 2.1 Level AAA", "Section 508", "EN 301 549"]} />
      <WTextarea value={fd.customAccessibility} onChange={v => set("customAccessibility", v)} placeholder="Add any custom accessibility standards..." style={{ marginTop: 10 }} rows={2} />
    </WField>
    <WField>
      <WLabel required>Device Testing Requirements</WLabel>
      <WCheckGroup items={DEFAULT_DEVICES} selected={fd.deviceSizes} onChange={v => set("deviceSizes", v)} />
      <WInput value={fd.customDevices} onChange={v => set("customDevices", v)} placeholder="Add custom device sizes" style={{ marginTop: 10 }} />
    </WField>
    <WField>
      <WLabel required>Browser Compatibility Notes</WLabel>
      <WCheckGroup items={DEFAULT_BROWSERS} selected={fd.browsers} onChange={v => set("browsers", v)} />
      <WTextarea value={fd.browserNotes} onChange={v => set("browserNotes", v)} placeholder="Add specific browser version requirements..." style={{ marginTop: 10 }} rows={2} />
    </WField>
    <WField>
      <WLabel required>Accessibility-Specific Inputs</WLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#f9fafb", borderRadius: 10, padding: 16, border: "1.5px solid #e8eaf0" }}>
        {[
          { key: "altTextReq", label: "Alt Text Requirements", ph: "E.g., All images must have descriptive alt text" },
          { key: "textResizing", label: "Text Resizing Requirements", ph: "E.g., Text must be resizable up to 200%" },
          { key: "highContrast", label: "High Contrast / Theme Specifications", ph: "E.g., Provide dark mode toggle, minimum 4.5:1 contrast ratio" },
          { key: "keyboardNav", label: "Keyboard Navigation Requirements", ph: "E.g., All interactive elements must be keyboard accessible" },
          { key: "ariaLabels", label: "ARIA Labels & Screen Reader Requirements", ph: "E.g., All buttons and links must have proper ARIA labels" },
        ].map(({ key, label, ph }) => (
          <div key={key}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</div>
            <WInput value={(fd as any)[key]} onChange={v => set(key as keyof WizardFormData, v)} placeholder={ph} />
          </div>
        ))}
      </div>
    </WField>
    <WField><WLabel required>Priority Pages for Accessibility</WLabel><WTextarea value={fd.accessibilityPriorityPages} onChange={v => set("accessibilityPriorityPages", v)} placeholder={`"Homepage, Checkout pages, Contact form"`} /></WField>
    <WField><WLabel required>Additional Notes</WLabel><WTextarea value={fd.accessibilityNotes} onChange={v => set("accessibilityNotes", v)} placeholder={`"Use larger buttons on mobile for easier tap targets"`} /></WField>
  </>);
}
function WStep9({ fd, set }: SP) {
  return (<><WTitle>Security & Technical Inputs</WTitle>
    <WField>
      <WLabel required>SSL / HTTPS Setup</WLabel>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Indicate whether SSL is installed and active for all pages.</div>
      <WToggleRow label="SSL Enabled (HTTPS active for all pages)" sub="HTTPS certificate active and configured" value={fd.sslEnabled} onChange={v => set("sslEnabled", v)} />
      <WTextarea value={fd.sslDetails} onChange={v => set("sslDetails", v)} placeholder="Add SSL certificate details, expiration date..." rows={2} style={{ marginTop: 10 }} />
    </WField>
    <WField>
      <WLabel required>Redirects & URL Mapping</WLabel>
      <WTextarea value={fd.redirects} onChange={v => set("redirects", v)} placeholder={`"All HTTP → HTTPS (301), /old-about → /about (301)"`} />
      <div style={{ marginTop: 10 }}><WToggleRow label="Redirects Active & Verified" sub="Check redirect configuration" value={fd.redirectsVerified} onChange={v => set("redirectsVerified", v)} /></div>
    </WField>
    <WField>
      <WLabel required>Scripts & Custom Code</WLabel>
      <WTextarea value={fd.scriptsCode} onChange={v => set("scriptsCode", v)} placeholder={`"Google Tag Manager (GTM-XXXXXXX)"`} />
      <div style={{ marginTop: 10 }}><WUploadZone accept=".js,.html,.txt" hint="Upload custom scripts or code snippets (optional)" /></div>
    </WField>
    <WField><WLabel required>Performance & Page Load Notes</WLabel><WTextarea value={fd.performanceNotes} onChange={v => set("performanceNotes", v)} placeholder={`"Enable lazy loading, Minify CSS/JS, Use CDN"`} /></WField>
    <WField>
      <WLabel required>Third-Party Integrations</WLabel>
      <WTextarea value={fd.thirdPartyIntegrationsSec} onChange={v => set("thirdPartyIntegrationsSec", v)} placeholder={`"Stripe, HubSpot CRM, Google Analytics 4"`} />
      <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "#92400e" }}>
        <strong>Note:</strong> For security, avoid sharing production API keys. Use test/sandbox credentials only.
      </div>
    </WField>
    <WField>
      <WLabel required>Error Pages & Fallbacks</WLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#f9fafb", borderRadius: 10, padding: 16, border: "1.5px solid #e8eaf0" }}>
        {[
          { key: "custom404", label: "Custom 404 Page URL", ph: "/404.html or /error/not-found" },
          { key: "custom500", label: "Custom 500 Page URL", ph: "/500.html or /error/server-error" },
          { key: "otherErrors", label: "Other Error Pages (403, 502, etc.)", ph: "E.g., /403.html, /maintenance.html" },
        ].map(({ key, label, ph }) => (
          <div key={key}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</div>
            <WInput value={(fd as any)[key]} onChange={v => set(key as keyof WizardFormData, v)} placeholder={ph} />
          </div>
        ))}
        <WTextarea value={fd.errorHandlingNotes} onChange={v => set("errorHandlingNotes", v)} placeholder="Error handling notes..." rows={2} />
      </div>
    </WField>
    <WField><WLabel required>Priority Technical Checks</WLabel><WTextarea value={fd.priorityTechnicalChecks} onChange={v => set("priorityTechnicalChecks", v)} placeholder={`"Payment gateway on checkout, User authentication"`} /></WField>
    <WField><WLabel required>Backup / Recovery Notes</WLabel><WTextarea value={fd.backupNotes} onChange={v => set("backupNotes", v)} placeholder={`"Daily automated backups at 2 AM UTC"`} /></WField>
  </>);
}
function WStep10({ fd, set }: SP) {
  return (<><WTitle>Reporting Setup</WTitle>
    <WField><WLabel required>Report Recipients</WLabel><WTextarea value={fd.reportRecipients} onChange={v => set("reportRecipients", v)} placeholder="Enter email addresses, one per line" rows={3} /></WField>
    <WField><WLabel required>Report Format</WLabel><WSelect value={fd.reportFormat} onChange={v => set("reportFormat", v)} placeholder="Select format" options={["PDF", "Excel (XLSX)", "HTML", "CSV", "Google Sheets"]} /></WField>
    <WField><WLabel required>Severity Levels to Include</WLabel><WCheckGroup items={SEVERITY_LEVELS} selected={fd.severityLevels} onChange={v => set("severityLevels", v)} /></WField>
    <WField><WLabel required>Comments & Notes Section</WLabel>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Provide space for team comments or observations during QA.</div>
      <WTextarea value={fd.qaComments} onChange={v => set("qaComments", v)} placeholder="Add any team observations, concerns, or questions..." rows={3} />
    </WField>
    <WField><WLabel required>Follow-up Notes</WLabel><WTextarea value={fd.followUpNotes} onChange={v => set("followUpNotes", v)} placeholder="Any notes for the team or client about next steps..." /></WField>
    <WField>
      <WLabel required>Summary / Dashboard Metrics</WLabel>
      <div style={{ background: "#f9fafb", border: "1.5px solid #e8eaf0", borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e", marginBottom: 14 }}>Select KPIs to Track</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px" }}>
          {KPI_OPTIONS.map(kpi => (
            <label key={kpi} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>
              <input type="checkbox" checked={fd.kpiSelected.includes(kpi)}
                onChange={() => { const cur = fd.kpiSelected; set("kpiSelected", cur.includes(kpi) ? cur.filter(k => k !== kpi) : [...cur, kpi]); }}
                style={{ accentColor: ACCENT, width: 16, height: 16, flexShrink: 0 }} />{kpi}
            </label>
          ))}
        </div>
        <WTextarea value={fd.summaryMetrics} onChange={v => set("summaryMetrics", v)} placeholder="Add custom KPIs or additional metrics..." rows={2} style={{ marginTop: 14 }} />
      </div>
    </WField>
    <WField>
      <div style={{ background: "#f9fafb", border: "1.5px solid #e8eaf0", borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e", marginBottom: 4 }}>Delivery Timeline</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Indicate when reports should be generated.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {DELIVERY_TIMELINE_OPTIONS.map(opt => (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>
              <input type="checkbox" checked={fd.deliverySelected.includes(opt)}
                onChange={() => { const cur = fd.deliverySelected; set("deliverySelected", cur.includes(opt) ? cur.filter(d => d !== opt) : [...cur, opt]); }}
                style={{ accentColor: ACCENT, width: 16, height: 16, flexShrink: 0 }} />{opt}
            </label>
          ))}
        </div>
        <WTextarea value={fd.followUpNotes} onChange={v => set("followUpNotes", v)} placeholder="Additional delivery timeline notes..." rows={2} style={{ marginTop: 16 }} />
      </div>
    </WField>
    <WToggleRow label="Auto-generate Weekly Reports" sub="Send automated reports every week" value={fd.autoWeekly} onChange={v => set("autoWeekly", v)} />
  </>);
}

// ─────────────────────────── RunCheck Wizard ─────────────────────
function RunCheck({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stepTouched, setStepTouched] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token") ?? undefined;
    fetchRunNewChecksCount(token)
      .then(count => {
        const nextId = count === 0 ? "project_1" : `project_${count + 1}`;
        setForm(prev => ({ ...prev, projectId: nextId }));
      })
      .catch(() => {
        setForm(prev => ({ ...prev, projectId: "project_1" }));
      });
  }, []);

  const set = useCallback((key: keyof WizardFormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value })), []);

  const sp = useMemo(() => ({ fd: form, set }), [form, set]);

  const STEPS = useMemo(() => [
    <WStep1 {...sp} />, <WStep2 {...sp} />, <WStep3 {...sp} />, <WStep4 {...sp} />,
    <WStep5 {...sp} />, <WStep6 {...sp} />, <WStep7 {...sp} />, <WStep8 {...sp} />,
    <WStep9 {...sp} />, <WStep10 {...sp} />,
  ], [sp]);

  const reset = () => { setStep(0); setForm(INITIAL_FORM); setSubmitted(false); setStepTouched(false); setSaveError(null); };
  const progress = ((step + 1) / WIZARD_STEPS.length) * 100;

  const currentStepError = useMemo(() => validateStep(step, form), [step, form]);
  const isCurrentStepValid = currentStepError === null;

  const handleNext = () => {
    if (!isCurrentStepValid) { setStepTouched(true); return; }
    setStepTouched(false);
    setSaveError(null);
    setStep(s => Math.min(WIZARD_STEPS.length - 1, s + 1));
  };

  const handleStepClick = (i: number) => {
    if (i > step && !isCurrentStepValid) { setStepTouched(true); return; }
    if (i <= step) { setStepTouched(false); setSaveError(null); setStep(i); }
  };

  function wcagLevel(standard: string): string {
    if (standard.includes("AAA")) return "AAA";
    if (standard.includes("AA")) return "AA";
    return "A";
  }

  const handleCreateProject = async () => {
    const finalError = validateStep(step, form);
    if (finalError) { setSaveError(finalError); setStepTouched(true); return; }

    setSaving(true);
    setSaveError(null);

    // Always read token fresh inside the handler
    const token = localStorage.getItem("token") ?? undefined;

    const runCheckPayload: RunNewCheckPayload = {
      project_name: form.projectName, website_url: form.websiteUrl, project_id: form.projectId,
      client_region: form.clientRegion, project_type: form.projectType, language: form.language,
      content_placement: form.contentPlacement, proofreading: form.proofreading,
      missing_content: form.missingContent, sitemap_url: form.sitemapUrl,
      skip_incomplete: form.skipIncomplete, meeting_notes: form.meetingNotes,
      client_emails: form.clientEmails, special_requests: form.specialRequests,
      deadlines: form.deadlines, overall_deadline: form.overallDeadline,
      brand_notes: form.brandNotes, primary_color: form.primaryColor,
      secondary_colors: form.secondaryColors, primary_font: form.primaryFont,
      secondary_font: form.secondaryFont, theme_demo_url: form.themeDemoUrl,
      theme_desc: form.themeDesc, competitor_refs: form.competitorRefs,
      design_prefs_desc: form.designPrefsDesc, custom_layout: form.customLayout,
      priority_pages: form.priorityPages, forms_list: form.formsList,
      form_fields: form.formFields, captcha_details: form.captchaDetails,
      captcha_behavior: form.captchaBehavior, form_submission_flows: form.formSubmissionFlows,
      interactive_elements: form.interactiveElements, interactive_behavior: form.interactiveBehavior,
      third_party_integrations: form.thirdPartyIntegrations, seo_pages: form.seoPages,
      canonical_urls: form.canonicalUrls, alt_text: form.altText,
      header_structure: form.headerStructure, sitemap_index_notes: form.sitemapIndexNotes,
      og_tags: form.ogTags, schema_markup: form.schemaMarkup, robots_txt: form.robotsTxt,
      compression_rules: form.compressionRules, naming_conventions: form.namingConventions,
      priority_media: form.priorityMedia, auto_optimize: form.autoOptimize,
      accessibility_standard: form.accessibilityStandard, custom_accessibility: form.customAccessibility,
      device_sizes: form.deviceSizes, custom_devices: form.customDevices,
      browsers: form.browsers, browser_notes: form.browserNotes,
      alt_text_req: form.altTextReq, text_resizing: form.textResizing,
      high_contrast: form.highContrast, keyboard_nav: form.keyboardNav,
      aria_labels: form.ariaLabels, accessibility_priority_pages: form.accessibilityPriorityPages,
      accessibility_notes: form.accessibilityNotes, ssl_enabled: form.sslEnabled,
      ssl_details: form.sslDetails, redirects: form.redirects,
      redirects_verified: form.redirectsVerified, scripts_code: form.scriptsCode,
      performance_notes: form.performanceNotes, third_party_integrations_sec: form.thirdPartyIntegrationsSec,
      custom_404: form.custom404, custom_500: form.custom500, other_errors: form.otherErrors,
      error_handling_notes: form.errorHandlingNotes, priority_technical_checks: form.priorityTechnicalChecks,
      backup_notes: form.backupNotes, report_recipients: form.reportRecipients,
      report_format: form.reportFormat, severity_levels: form.severityLevels,
      kpi_selected: form.kpiSelected, delivery_selected: form.deliverySelected,
      auto_weekly: form.autoWeekly, qa_comments: form.qaComments,
      follow_up_notes: form.followUpNotes, summary_metrics: form.summaryMetrics,
    };

    const contentMap: Record<string, string[]> = {};
    if (form.contentPlacement) {
      contentMap["page"] = form.contentPlacement.split(",").map(s => s.trim());
    }
    const contentPayload = {
      url: form.websiteUrl, region: form.clientRegion || "US", tone_rules: [],
      missing_notes: form.missingContent ? [form.missingContent] : [],
      meeting_notes: form.meetingNotes ? [form.meetingNotes] : [],
      sitemap: form.sitemapUrl ? [form.sitemapUrl] : [],
      content_map: Object.keys(contentMap).length > 0 ? contentMap : undefined,
    };

    const designPayload = {
      url: form.websiteUrl,
      brand_colors: [form.primaryColor, ...form.secondaryColors.split(",").map(c => c.trim())].filter(Boolean),
      brand_fonts: [form.primaryFont, form.secondaryFont].filter(Boolean),
      theme_refs: form.themeDemoUrl ? [form.themeDemoUrl] : [],
      competitor_urls: form.competitorRefs ? form.competitorRefs.split(/[\n,]/).map(s => s.trim()).filter(Boolean) : [],
      custom_layout_rules: {},
      priority_pages: form.priorityPages ? form.priorityPages.split(",").map(s => s.trim()).filter(Boolean) : [],
    };

    const seoPayload = {
      url: form.websiteUrl,
      target_keywords: form.seoPages.flatMap(p => p.keywords.split(",").map(k => k.trim())).filter(Boolean),
      priority_pages: form.seoPages.map(p => p.page).filter(Boolean),
    };

    const breakpointMap: Record<string, { width: number; height: number }> = {};
    form.deviceSizes.forEach(ds => {
      const match = ds.match(/\((\d+)x(\d+)\)/);
      if (match) {
        const label = ds.toLowerCase().includes("mobile") ? "mobile"
          : ds.toLowerCase().includes("tablet") ? "tablet" : "desktop";
        breakpointMap[label] = { width: Number(match[1]), height: Number(match[2]) };
      }
    });
    const accessibilityPayload = {
      urls: [form.websiteUrl],
      wcag_level: wcagLevel(form.accessibilityStandard),
      browsers: form.browsers.map(b => b.toLowerCase()).map(b =>
        b === "safari" || b === "mobile safari" ? "webkit" : b === "firefox" ? "firefox" : "chromium"
      ),
      breakpoints: {
        desktop: breakpointMap["desktop"] ?? { width: 1920, height: 1080 },
        tablet: breakpointMap["tablet"] ?? { width: 768, height: 1024 },
        mobile: breakpointMap["mobile"] ?? { width: 375, height: 812 },
      },
    };

    const redirectRules: Record<string, string> = {};
    if (form.redirects) {
      form.redirects.split(/[\n,]/).forEach(line => {
        const parts = line.split(/→|->/).map(s => s.trim());
        if (parts.length === 2 && parts[0] && parts[1]) redirectRules[parts[0]] = parts[1];
      });
    }
    const technicalPayload = {
      base_url: form.websiteUrl, redirect_rules: redirectRules,
      custom_script_rules: form.scriptsCode ? form.scriptsCode.split(/[\n,]/).map(s => s.trim()).filter(Boolean) : [],
      performance_limits: { max_load_time: 4.0, image_max_kb: 300 },
      integrations: form.thirdPartyIntegrationsSec ? form.thirdPartyIntegrationsSec.split(/[\n,]/).map(s => s.trim().toLowerCase()).filter(Boolean) : [],
      critical_pages: { checkout: form.websiteUrl, login: form.websiteUrl, cart: form.websiteUrl },
    };

    const reportPayload = {
      url: form.websiteUrl, region: form.clientRegion || "US",
      keyword_targets: seoPayload.target_keywords,
      priority_pages: designPayload.priority_pages,
      brand_colors: designPayload.brand_colors,
      brand_fonts: designPayload.brand_fonts,
      competitors: designPayload.competitor_urls,
      layout_rules: {},
    };

    try {
      const [
        runCheckResult, contentResult, designResult, seoResult,
        accessibilityResult, technicalResult, reportResult,
      ] = await Promise.allSettled([
        saveRunNewCheck(runCheckPayload, token),
        analyzeContentAIWizard(contentPayload, token),
        analyzeDesignAIWizard(designPayload, token),
        analyzeSEOAIWizard(seoPayload, token),
        analyzeAccessibilityWizard(accessibilityPayload, token),
        analyzeTechnicalWizard(technicalPayload, token),
        generateReportWizard(reportPayload, token),
      ]);

      const checks: [PromiseSettledResult<unknown>, string][] = [
        [runCheckResult, "Project save"], [contentResult, "Content AI"],
        [designResult, "Design AI"], [seoResult, "SEO AI"],
        [accessibilityResult, "Accessibility"], [technicalResult, "Technical Audit"],
        [reportResult, "Report"],
      ];

      const failures = checks
        .filter(([r]) => r.status === "rejected")
        .map(([, label]) => label);

      if (runCheckResult.status === "rejected") {
        throw new Error((runCheckResult.reason as Error)?.message || "Failed to save project.");
      }

      if (failures.length > 0 && !failures.includes("Project save")) {
        console.warn("[RunCheck] Some AI services failed:", failures.join(", "));
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setSaveError((err as Error).message || "Failed to save project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: "#f8f9fc" }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: ACCENT_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 34 }}>✓</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", marginBottom: 10 }}>Project Created Successfully!</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>Your project has been set up and the QA check agent is ready to run.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button type="button" onClick={onClose} style={{ padding: "12px 24px", background: "#fff", color: "#374151", border: "1.5px solid #e8eaf0", borderRadius: 9, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Back to Dashboard</button>
          <button type="button" onClick={reset} style={{ padding: "12px 24px", background: ACCENT, color: "#fff", border: "none", borderRadius: 9, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Start Another Project</button>
        </div>
      </div>
    </div>
  );

  const visibleError = stepTouched ? (currentStepError || saveError) : saveError;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f8f9fc" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <button type="button" onClick={onClose} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, padding: 0, marginBottom: 14 }}>← Back to Dashboard</button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", margin: "0 0 4px" }}>New Project Wizard</h1>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step]}</div>
        </div>
        <div style={{ height: 4, background: "#e8eaf0", borderRadius: 4, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", background: ACCENT, borderRadius: 4, width: `${progress}%`, transition: "width .35s ease" }} />
        </div>
        <div style={{ display: "flex", marginBottom: 32, overflowX: "auto", paddingBottom: 4 }}>
          {WIZARD_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const stepValid = done && validateStep(i, form) === null;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 76 }}>
                <div onClick={() => handleStepClick(i)}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, cursor: i <= step ? "pointer" : "default",
                    background: active ? ACCENT : stepValid ? "#fff" : done ? "#fff" : "#f0f1f5",
                    color: active ? "#fff" : stepValid ? ACCENT : done ? "#9ca3af" : "#9ca3af",
                    border: stepValid ? `2px solid ${ACCENT}` : active ? `3px solid ${ACCENT}` : done ? "2px solid #d1d5db" : "2px solid #e8eaf0",
                    boxShadow: active ? `0 4px 12px ${ACCENT}40` : "none",
                    transition: "all .2s", flexShrink: 0,
                  }}>
                  {stepValid ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 10, color: active ? ACCENT : stepValid ? ACCENT : "#9ca3af", textAlign: "center", marginTop: 6, fontWeight: active || stepValid ? 700 : 400, lineHeight: 1.3, maxWidth: 70 }}>{s}</div>
              </div>
            );
          })}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8eaf0", padding: "32px 36px", boxShadow: "0 2px 16px rgba(0,0,0,.04)", marginBottom: 28 }}>
          {STEPS[step]}
        </div>

        {visibleError && (
          <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠</span>{visibleError}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button"
            onClick={() => { setStepTouched(false); setSaveError(null); setStep(s => Math.max(0, s - 1)); }}
            disabled={step === 0}
            style={{ padding: "11px 24px", borderRadius: 9, border: "1.5px solid #e8eaf0", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 14, cursor: step === 0 ? "not-allowed" : "pointer", opacity: step === 0 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 8 }}>
            ← Previous
          </button>
          {step < WIZARD_STEPS.length - 1 ? (
            <button type="button" onClick={handleNext}
              style={{ padding: "11px 32px", borderRadius: 9, border: "none", background: isCurrentStepValid ? ACCENT : "#f0a0ab", color: "#fff", fontWeight: 700, fontSize: 14, cursor: isCurrentStepValid ? "pointer" : "not-allowed", boxShadow: isCurrentStepValid ? `0 4px 14px ${ACCENT}50` : "none", transition: "background .2s, box-shadow .2s" }}>
              Next →
            </button>
          ) : (
            <button type="button" onClick={handleCreateProject} disabled={saving || !isCurrentStepValid}
              style={{ padding: "11px 36px", borderRadius: 9, border: "none", background: saving || !isCurrentStepValid ? "#f0a0ab" : ACCENT, color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving || !isCurrentStepValid ? "not-allowed" : "pointer", boxShadow: saving || !isCurrentStepValid ? "none" : `0 4px 14px ${ACCENT}50`, display: "flex", alignItems: "center", gap: 8, transition: "background .2s, box-shadow .2s" }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Create Project →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Score map builder ────────────────────
function buildScoreMap(data: any[]): Record<string, SavedScore> {
  const map: Record<string, SavedScore> = {};
  data.forEach((r: any) => {
    map[r.file_id] = {
      fileId: r.file_id,
      fileName: r.file_name,
      projectName: r.project_name,
      timestamp: r.updated_at ?? r.created_at ?? new Date().toISOString(),
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
      isCodeFile: r.is_code_file === 1,
    };
  });
  return map;
}

// ─────────────────────────── Main Dashboard ──────────────────────
const WebsiteDashboard = () => {
  const { navigate } = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [files, setFiles] = useState<WebsiteFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [scoreMap, setScoreMap] = useState<Record<string, SavedScore>>({});

  // Debounce: skip re-fetch if last fetch was <30s ago
  const lastFetch = useRef<number>(0);

  const loadData = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetch.current < 30_000) return;
    lastFetch.current = now;

    // Always read token fresh
    const token = localStorage.getItem("token") ?? undefined;

    setLoadingFiles(true);
    try {
      // ✅ FIX 1: Fetch files and scores in parallel — eliminates sequential waterfall
      const [filesResult, scoresResult] = await Promise.allSettled([
        fetchWebsiteFiles(token),
        fetchAnalysisResults(token),
      ]);

      if (filesResult.status === "fulfilled") {
        setFiles(filesResult.value.files);
      } else {
        console.error("Failed to fetch files", filesResult.reason);
      }

      if (scoresResult.status === "fulfilled" && scoresResult.value?.length > 0) {
        setScoreMap(buildScoreMap(scoresResult.value));
      } else if (scoresResult.status === "rejected") {
        // Fallback to localStorage if API fails
        try {
          const stored: SavedScore[] = JSON.parse(
            localStorage.getItem("bb_analysis_results") || "[]"
          );
          const map: Record<string, SavedScore> = {};
          const seen = new Set<string>();
          for (const s of stored) {
            if (!seen.has(s.fileId)) { map[s.fileId] = s; seen.add(s.fileId); }
          }
          setScoreMap(map);
        } catch { /* ignore */ }
      }
    } finally {
      // ✅ FIX 2: Single flag controls both — no double render cycle
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // ✅ FIX 3: Debounced focus listener — won't hammer API on every tab switch
    window.addEventListener("focus", loadData);
    return () => window.removeEventListener("focus", loadData);
  }, [loadData]);

  // ✅ FIX 4: Memoize derived data — no recalculation on every render
  const analysisRows = useMemo<AnalysisRow[]>(
    () => files.map(file => ({ file, score: scoreMap[file.id] })),
    [files, scoreMap]
  );

  const stats = useMemo(() => {
    const analysedCount = analysisRows.filter(r => r.score).length;
    const scores = Object.values(scoreMap);
    const totalCritical = scores.reduce((a, s) => a + s.issueCount.critical, 0);
    const totalHigh = scores.reduce((a, s) => a + s.issueCount.high, 0);
    const totalMedium = scores.reduce((a, s) => a + s.issueCount.medium, 0);
    const totalLow = scores.reduce((a, s) => a + s.issueCount.low, 0);
    const totalIssues = totalCritical + totalHigh + totalMedium + totalLow;
    const avgScore = analysedCount > 0
      ? Math.round(scores.reduce((a, s) => a + s.scores.overall, 0) / analysedCount)
      : 0;
    const issuesSub = analysedCount > 0
      ? `${totalCritical}C · ${totalHigh}H · ${totalMedium}M · ${totalLow}L`
      : "No files analysed yet";
    const qualitySub = analysedCount > 0
      ? `Avg. across ${analysedCount} file${analysedCount > 1 ? "s" : ""}`
      : "No files analysed yet";
    return { analysedCount, totalIssues, avgScore, issuesSub, qualitySub };
  }, [analysisRows, scoreMap]);

  const dashStats = useMemo(() => [
    { label: "Total Projects", value: String(files.length || 0), sub: `${stats.analysedCount} analysed`, icon: FolderKanban, route: "/modules/website/projects" },
    { label: "Active Scans", value: String(files.filter(f => !scoreMap[f.id]).length), sub: "Pending analysis", icon: Activity },
    { label: "Issues Found", value: String(stats.totalIssues), sub: stats.issuesSub, icon: AlertCircle },
    { label: "Quality Score", value: String(stats.avgScore), sub: stats.qualitySub, icon: null },
  ], [files, scoreMap, stats]);

  if (showWizard) return <RunCheck onClose={() => setShowWizard(false)} />;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Check Agent – Website QA & Validation</h2>
          <p className="text-sm text-gray-500 mt-1">AI-powered quality assurance by BrandingBeez</p>
        </div>
        <button type="button" onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90"
          style={{ backgroundColor: ACCENT }}>
          <Play className="w-4 h-4" fill="white" /> Run New Check
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {dashStats.map(stat => (
          <div key={stat.label} onClick={() => stat.route && navigate(stat.route)}
            className="bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">{stat.label}</span>
              {stat.icon ? <stat.icon className="w-5 h-5 text-gray-300" /> : <CheckCircle2 className="w-5 h-5 text-gray-300" />}
            </div>
            {stat.label === "Quality Score" ? (
              <>
                <QualityCircle score={Number(stat.value)} />
                {stat.sub && <p className="text-xs text-gray-400 mt-2">{stat.sub}</p>}
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-800 mb-1">{stat.value}</p>
                {stat.sub && <p className="text-xs text-gray-400">{stat.sub}</p>}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">Recent Projects</h3>
          <button onClick={loadData}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-[2fr_1.2fr_0.8fr_2fr_1.2fr_1fr] px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
          {["Project Name", "Status", "Issues", "Quality", "Date", "Actions"].map(h => <span key={h}>{h}</span>)}
        </div>

        {/* ✅ FIX 5: Skeleton count matches actual file count (capped at 5) */}
        {loadingFiles && Array.from({ length: Math.min(files.length || 3, 5) }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_1.2fr_0.8fr_2fr_1.2fr_1fr] items-center px-6 py-5 border-b border-gray-100">
            {[160, 100, 40, 160, 80, 80].map((w, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" style={{ maxWidth: w }} />
            ))}
          </div>
        ))}

        {!loadingFiles && analysisRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <FileText className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">No files uploaded yet. Go to Inputs to upload files.</p>
          </div>
        )}

        {!loadingFiles && analysisRows.map((row, i) => {
          const { file, score } = row;
          const isAnalysed = !!score;
          const totalIssuesRow = score
            ? score.issueCount.critical + score.issueCount.high + score.issueCount.medium + score.issueCount.low
            : null;
          const quality = score ? score.scores.overall : null;

          return (
            <div key={file.id}
              className={`grid grid-cols-[2fr_1.2fr_0.8fr_2fr_1.2fr_1fr] items-center px-6 py-5 ${i !== analysisRows.length - 1 ? "border-b border-gray-100" : ""}`}>
              <span className="text-sm font-medium text-gray-700 truncate pr-4">{file.name}</span>
              <div>
                {isAnalysed ? (
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#fff", border: "2px solid #22c55e", color: "#16a34a" }}>Complete</span>
                ) : file.status === "Processed" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#fff", border: "2px solid #fbbf24", color: "#d97706" }}>Pending</span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#fff", border: "2px solid #cbd5e1", color: "#64748b" }}>Scanning</span>
                )}
              </div>
              <span className="text-sm text-gray-600">{totalIssuesRow ?? "-"}</span>
              <div className="flex items-center gap-3 pr-4">
                {quality !== null ? (
                  <>
                    <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#1e293b", borderRadius: 999, width: `${quality}%`, transition: "width 1s ease" }} />
                    </div>
                    <span className="text-sm w-10 shrink-0" style={{ color: "#4b5563" }}>{quality}%</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-300">-</span>
                )}
              </div>
              <span className="text-sm text-gray-400">{file.uploadDate || "-"}</span>
              <div>
                {isAnalysed && (
                  <button type="button" onClick={() => navigate("/modules/website/inputs")}
                    className="text-sm font-semibold text-gray-700 hover:underline">View Results</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WebsiteDashboard;
