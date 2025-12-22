import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  BarChart3,
  Zap,
  Check,
  Eye,
  Lock,
  Database,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "../../lib/router";

export function HomePage() {
  const { navigate } = useRouter();

  // ✅ Fix: strict TS friendly typing
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    {
      icon: BarChart3,
      title: "Campaign analytics",
      description: "Real-time performance tracking across all accounts",
    },
    {
      icon: Zap,
      title: "Automated recommendations",
      description: "AI-powered insights that drive results",
    },
    {
      icon: TrendingUp,
      title: "Client-ready reports",
      description: "Professional reports in seconds, not hours",
    },
  ];

  const trustPoints = [
    {
      icon: Eye,
      title: "Why we request Google data",
      description:
        "To calculate KPIs, generate insights, and surface alerts that help your team act faster and make data-driven decisions.",
    },
    {
      icon: Lock,
      title: "How your data is used",
      description:
        "Data stays within AI Agency Analyst — never sold or shared for advertising. Your information remains completely confidential.",
    },
    {
      icon: Database,
      title: "Your control",
      description:
        "Revoke access or request deletion anytime. Full transparency, always. You own your data, period.",
    },
  ];

  const stats = [
    { value: "10x", label: "Faster reporting" },
    { value: "99.9%", label: "Uptime SLA" },
    { value: "24/7", label: "Data sync" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <span className="text-base font-bold tracking-tight">AI Agency Analyst</span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <button
              type="button"
              onClick={() => navigate("/privacy-policy")}
              className="hidden font-medium text-slate-600 transition-colors hover:text-slate-900 md:block"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => navigate("/terms-of-service")}
              className="hidden font-medium text-slate-600 transition-colors hover:text-slate-900 md:block"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.03] hover:bg-slate-800 hover:shadow-xl"
            >
              Go to Login
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <section className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* LEFT */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Purpose-built for agencies
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Google Ads intelligence,
              <br />
              <span className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                built for agencies.
              </span>
            </h1>

            <p className="max-w-xl text-xl leading-relaxed text-slate-600">
              AI Agency Analyst centralizes performance, automates reporting, and surfaces AI-powered recommendations —
              all while keeping you fully in control of your data.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-[1.03] hover:bg-slate-800"
              >
                Start with your account
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/privacy-policy")}
                className="rounded-xl border-2 border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                Review data practices
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    onMouseEnter={() => setHoveredFeature(i)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:scale-[1.03] hover:border-slate-300 hover:shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-slate-900">
                        <Icon className="h-5 w-5 text-slate-700 transition-colors group-hover:text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900">{feature.title}</div>
                        {hoveredFeature === i && (
                          <div className="mt-1 text-xs text-slate-600">{feature.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-slate-200 to-slate-100 opacity-50 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="bg-gradient-to-br from-slate-50 to-white p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Unified Dashboard</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">Cross-account health</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-3 shadow-lg">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {[
                    { label: "Performance alerts", value: "3 active", colorClass: "text-amber-600" },
                    { label: "AI insights", value: "12 new", colorClass: "text-blue-600" },
                    { label: "Budget pacing", value: "On track", colorClass: "text-emerald-600" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:scale-[1.02] hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-2 w-2 rounded-full bg-slate-300 transition-colors group-hover:bg-slate-900" />
                        <span className="font-medium text-slate-900">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${item.colorClass}`}>{item.value}</span>
                        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-900" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini chart decoration */}
                <div className="mt-6 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Last 30 days</span>
                    <span className="text-emerald-600">↑ 24% growth</span>
                  </div>
                  <div className="flex h-16 items-end gap-1">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 95, 75, 88, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-slate-900 to-slate-600"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST / DATA */}
        <section className="mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-xl">
          <div className="p-10 md:p-12">
            <div className="mb-10 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Transparent & secure data handling</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {trustPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.title}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative">
                      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-3 transition-colors group-hover:bg-slate-900">
                        <Icon className="h-6 w-6 text-slate-700 transition-colors group-hover:text-white" />
                      </div>
                      <p className="mb-3 text-lg font-bold text-slate-900">{point.title}</p>
                      <p className="text-sm leading-relaxed text-slate-600">{point.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-6 py-4">
              <Check className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-700">
                SOC 2 Type II Certified • GDPR Compliant • ISO 27001
              </span>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => navigate("/privacy-policy")}
                className="font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:underline"
              >
                View Privacy Policy
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => navigate("/terms-of-service")}
                className="font-semibold text-slate-600 transition-colors hover:text-slate-900 hover:underline"
              >
                Terms of Service
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-semibold text-slate-900 transition-colors hover:underline"
              >
                Proceed to login →
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm text-slate-600">
                © {new Date().getFullYear()} AI Agency Analyst. Built for Google Ads agencies.
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <button
                type="button"
                onClick={() => navigate("/privacy-policy")}
                className="font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => navigate("/terms-of-service")}
                className="font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-semibold text-slate-900 transition-colors hover:underline"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
