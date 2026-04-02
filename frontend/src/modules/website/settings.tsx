import React, { useState, useEffect, useCallback } from "react";
import { fetchWebsiteSettings, saveWebsiteSettings } from "../../lib/api";

const ACCENT = "#EF4F6E";

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
      style={{ backgroundColor: enabled ? "#1e293b" : "#cbd5e1" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold"
      style={{ backgroundColor: type === "success" ? "#1e293b" : "#dc2626" }}
    >
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

interface Settings {
  company_name: string;
  default_region: string;
  email_notifs: boolean;
  weekly_reports: boolean;
  issue_alerts: boolean;
  accessibility_std: string;
  page_load_target: string;
  language_pref: string;
}

const EMPTY: Settings = {
  company_name: "",
  default_region: "",
  email_notifs: true,
  weekly_reports: true,
  issue_alerts: true,
  accessibility_std: "",
  page_load_target: "",
  language_pref: "",
};

const WebsiteSettings = () => {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [saved, setSaved]       = useState<Settings>(EMPTY);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  // ── Load from DB on mount ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token") ?? undefined;
    fetchWebsiteSettings(token)
      .then((data) => {
        setSettings(data);
        setSaved(data);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
        // 404 = no settings saved yet, stay with EMPTY (user fills in first time)
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Save to DB ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token") ?? undefined;
      const data = await saveWebsiteSettings(settings, token);
      setSaved(data);
      setToast({ message: "Settings saved successfully!", type: "success" });
    } catch (err) {
      setToast({ message: "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => setSettings(saved);

  const set = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your Check Agent preferences</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700">General Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Company Name</label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              className="w-full px-4 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Default Region</label>
            <input
              type="text"
              value={settings.default_region}
              onChange={(e) => set("default_region", e.target.value)}
              className="w-full px-4 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700">Notification Preferences</h3>
        <div className="space-y-5">
          {[
            { key: "email_notifs" as const,   label: "Email Notifications", desc: "Receive email updates on scan completion" },
            { key: "weekly_reports" as const,  label: "Weekly Reports",      desc: "Auto-send weekly summary reports" },
            { key: "issue_alerts" as const,    label: "Issue Alerts",        desc: "Get notified of high-severity issues" },
          ].map(({ key, label, desc }, i) => (
            <div key={key} className={`flex items-start justify-between ${i > 0 ? "border-t border-slate-100 pt-5" : ""}`}>
              <div>
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <Toggle enabled={settings[key]} onToggle={() => set(key, !settings[key])} />
            </div>
          ))}
        </div>
      </div>

      {/* Default QA Standards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-700">Default QA Standards</h3>
        <div className="space-y-4">
          {[
            { key: "accessibility_std"  as const, label: "Accessibility Standard" },
            { key: "page_load_target"   as const, label: "Page Load Target (seconds)" },
            { key: "language_pref"      as const, label: "Language Preference" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{label}</label>
              <input
                type="text"
                value={settings[key] as string}
                onChange={(e) => set(key, e.target.value)}
                className="w-full px-4 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleCancel}
          disabled={!isDirty || saving}
          className="px-6 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: ACCENT }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

    </div>
  );
};

export default WebsiteSettings;
