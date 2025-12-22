import { useRouter } from "../../lib/router";
import { ArrowLeft, Mail, Shield, FileText, Calendar } from "lucide-react";

export type LegalSection = {
  title: string;
  body: string[];
};

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  introduction: string[];
  sections: LegalSection[];
}

export function LegalPage({ title, lastUpdated, introduction, sections }: LegalPageProps) {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-slate-50">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-100/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-8 sm:py-12">
        {/* Back button */}
        <button
          type="button"
          className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to sign in
        </button>

        {/* Header section with icon */}
        <header className="mb-12">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 mt-1">
              <div className="relative">
                {/* <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  {title.includes('Privacy') ? (
                    <Shield className="h-7 w-7 text-white" />
                  ) : (
                    <FileText className="h-7 w-7 text-white" />
                  )}
                </div> */}
                <div className="absolute inset-0 rounded-2xl bg-red-400/20 blur-xl" />
              </div>
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  AAA Legal
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3 leading-tight">
                {title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="h-4 w-4" />
                <span>Last updated: {lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Introduction card */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/50 border border-slate-200/60">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-purple-500" />
            <div className="p-6 sm:p-8 space-y-4">
              {introduction.map((paragraph, index) => (
                <p key={index} className="text-base leading-relaxed text-slate-800">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </header>

        {/* Sections */}
        <div className="space-y-6 mb-12">
          {sections.map((section, idx) => (
            <section
              key={section.title}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 border border-slate-200/60 hover:shadow-lg hover:shadow-slate-300/50 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center text-sm font-bold text-red-600 border border-red-100">
                      {idx + 1}
                    </div>
                  </div>
                  <h2 className="flex-1 text-xl sm:text-2xl font-bold text-slate-900">
                    {section.title}
                  </h2>
                </div>
                <div className="space-y-4 pl-11">
                  {section.body.map((paragraph, index) => (
                    <p key={index} className="text-base leading-relaxed text-slate-800">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Contact footer */}
        <footer className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/60 shadow-lg shadow-red-200/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {/* <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Mail className="h-6 w-6 text-white" />
                </div> */}
              </div>
              <div>
                <p className="text-lg font-bold text-red-900 mb-2">
                  Have Questions?
                </p>
                <p className="text-base text-red-900 leading-relaxed">
                  Our team is here to help. Reach out at{' '}
                  <a
                    className="font-semibold text-red-600 hover:text-red-700 underline underline-offset-2 decoration-2 transition-colors"
                    href="mailto:info@brandingbeez.co.uk"
                  >
                    info@brandingbeez.co.uk
                  </a>{' '}
                  for any clarifications about this policy.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}