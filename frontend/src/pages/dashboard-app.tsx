import { useEffect, useMemo, useState } from "react";
import { Accounts } from "../components/accounts";
import { AIRecommendations } from "../components/ai-recommendations";
import { AppSidebar } from "../components/app-sidebar";
import { ClientDetails } from "../components/client-details";
import { ClientReports } from "../components/client-reports";
import { DashboardOverview } from "../components/dashboard-overview";
import { ModuleFeatureBoard } from "../components/module-feature-board";
import { Settings } from "../components/settings";
import SeoHeader from "../components/seo-headers";
import DashboardHeader from "../components/website-header";
import { SetupChecklist } from "../components/setup-checklist";
import { SidebarProvider } from "../components/ui/sidebar";
import { UserManagement } from "../components/user-management";
import { BackendUser } from "../lib/api";
import { Alert as AlertType, Manager } from "../lib/mock-data";
import {
  GLOBAL_VIEW_ROUTES,
  MODULE_DEFINITIONS,
  MODULE_IDS,
  MODULE_VIEW_ROUTES,
  getModuleDefaultRoute,
  isModuleId,
} from "../lib/modules";
import { useRouter } from "../lib/router";

import type { ModuleId } from "../lib/modules";

import AiInsights from "../modules/seo/ai-insights";
import ContentSeo from "../modules/seo/content-seo";
import LinksSeo from "../modules/seo/links-seo";
import SeoOverview from "../modules/seo/overview";
import SpeedTest from "../modules/seo/speed-test";
import TechnicalSeo from "../modules/seo/technical-seo";
import WebErrors from "../modules/seo/web-errors";

import Reports from "../modules/website/reports";
import Inputs from "../modules/website/inputs";
import Projects from "../modules/website/projects";
import WebsiteDashboard from "../modules/website/dashboard";
import WebsiteSettings from "../modules/website/settings";


type DashboardAppProps = {
  user: BackendUser;
  token?: string;
  onLogout: () => void;
  onUserUpdated?: (user: BackendUser) => void;
  // ✅ These allow the app to restore state from the URL on hard reload
  initialModule?: ModuleId;
  initialView?: string;
};

type ViewContext = {
  moduleId: ModuleId;
  viewId: string;
  kind: "module" | "global";
  canonicalPath: string;
};

function resolveRoute(path: string, currentModule: ModuleId, isAdmin: boolean): ViewContext {
  for (const moduleId of MODULE_IDS) {
    const routes = MODULE_VIEW_ROUTES[moduleId];
    for (const [viewId, route] of Object.entries(routes)) {
      if (route === path) {
        const safeView =
          viewId === "users" && !isAdmin ? MODULE_DEFINITIONS[moduleId].defaultView : viewId;
        const canonicalPath = routes[safeView] ?? getModuleDefaultRoute(moduleId);
        return { moduleId, viewId: safeView, kind: "module", canonicalPath };
      }
    }
  }

  if (path.startsWith("/modules/")) {
    const [, , moduleSlug] = path.split("/");
    if (moduleSlug && isModuleId(moduleSlug)) {
      const defaultRoute = getModuleDefaultRoute(moduleSlug);
      return {
        moduleId: moduleSlug,
        viewId: MODULE_DEFINITIONS[moduleSlug].defaultView,
        kind: "module",
        canonicalPath: defaultRoute,
      };
    }
  }

  for (const [viewId, route] of Object.entries(GLOBAL_VIEW_ROUTES)) {
    if (route === path) {
      if (viewId === "users" && !isAdmin) break;
      return { moduleId: currentModule, viewId, kind: "global", canonicalPath: route };
    }
  }

  const fallbackModule = currentModule ?? "g-ads";
  const defaultRoute = getModuleDefaultRoute(fallbackModule);
  return {
    moduleId: fallbackModule,
    viewId: MODULE_DEFINITIONS[fallbackModule].defaultView,
    kind: "module",
    canonicalPath: defaultRoute,
  };
}

export function DashboardApp({
  user,
  token,
  onLogout,
  onUserUpdated,
  initialModule,
  initialView,
}: DashboardAppProps) {

  const { path, navigate } = useRouter();

  const normalizedRole = (user.role ?? "").toLowerCase();
  const isAdmin = normalizedRole === "admin";

  // ✅ Initialize from URL-derived props so hard reload restores the correct module
  // If initialModule is provided (from URL parsing in App.tsx), use it directly
  // instead of null — this skips the module selection screen on reload
  const [selectedModule, setSelectedModule] = useState<ModuleId | null>(
    initialModule ?? null
  );

  const [moduleSwitcherDocked, setModuleSwitcherDocked] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const routeContext = useMemo(
    () => resolveRoute(path, selectedModule ?? "g-ads", isAdmin),
    [path, selectedModule, isAdmin],
  );

  // sync module with route
  useEffect(() => {
    if (!selectedModule) return;
    if (
      routeContext.kind === "module" &&
      routeContext.moduleId !== selectedModule &&
      routeContext.canonicalPath === path
    ) {
      setSelectedModule(routeContext.moduleId);
    }
  }, [routeContext, selectedModule]);

  // keep canonical route
  // ✅ On first render after hard reload, if initialView is provided we skip
  // the canonical redirect so the user lands on the correct view immediately
  useEffect(() => {
    if (routeContext.canonicalPath !== path) {
      navigate(routeContext.canonicalPath, { replace: true });
    }
  }, [routeContext.canonicalPath, path, navigate]);

  // reset panels on navigation
  useEffect(() => {
    setSelectedClient(null);
    setSelectedAlert(null);
    setSelectedManager(null);
    setSelectedBundle(null);
    setSelectedReport(null);
  }, [path]);

  const handleViewChange = (view: string) => {
    if (view === "users" && !isAdmin) {
      navigate(getModuleDefaultRoute(selectedModule ?? "g-ads"), { replace: true });
      return;
    }

    const moduleRoutes = MODULE_VIEW_ROUTES[selectedModule ?? "g-ads"];
    if (moduleRoutes[view]) {
      const targetRoute = moduleRoutes[view];
      if (targetRoute !== path) navigate(targetRoute);
      return;
    }

    if (GLOBAL_VIEW_ROUTES[view]) {
      const targetRoute = GLOBAL_VIEW_ROUTES[view];
      if (targetRoute !== path) navigate(targetRoute);
      return;
    }

    const targetRoute = moduleRoutes[view] ?? getModuleDefaultRoute(selectedModule ?? "g-ads");
    if (targetRoute !== path) navigate(targetRoute);
  };

  const handleModuleChange = (moduleId: ModuleId) => {
    const targetRoute = getModuleDefaultRoute(moduleId);
    navigate(targetRoute);
    setSelectedModule(moduleId);
    setModuleSwitcherDocked(true);
  };

  const handleModuleSectionToggle = () => {
    setModuleSwitcherDocked((prev) => !prev);
  };

  const renderContent = () => {
    if (routeContext.viewId === "settings") {
      return <Settings user={user} authToken={token} onUserUpdated={onUserUpdated} />;
    }

    if (routeContext.viewId === "users" && isAdmin) {
      return <UserManagement onManagerClick={setSelectedManager} />;
    }

    if (selectedClient) {
      return <ClientDetails clientId={selectedClient} onBack={() => setSelectedClient(null)} />;
    }

    if (selectedModule === "g-ads") {
      switch (routeContext.viewId) {
        case "dashboard":
          return (
            <DashboardOverview
              onClientClick={setSelectedClient}
              onNavigate={handleViewChange}
              onAlertClick={setSelectedAlert}
              onManagerClick={setSelectedManager}
              onBundleClick={setSelectedBundle}
              onReportClick={setSelectedReport}
            />
          );
        case "accounts":
          return <Accounts onClientClick={setSelectedClient} />;
        case "recommendations":
          return <AIRecommendations onBundleClick={setSelectedBundle} />;
        case "reports":
          return <ClientReports onReportClick={setSelectedReport} />;
        case "checklist":
          return <SetupChecklist />;
        default:
          return <DashboardOverview onClientClick={setSelectedClient} onNavigate={handleViewChange} />;
      }
    }

    if (selectedModule === "seo") {
      switch (routeContext.viewId) {
        case "seo-overview":  return <SeoOverview />;
        case "web-errors":    return <WebErrors />;
        case "technical-seo": return <TechnicalSeo />;
        case "content-seo":   return <ContentSeo />;
        case "links-seo":     return <LinksSeo />;
        case "speed-test":    return <SpeedTest />;
        case "ai-insights":   return <AiInsights />;
        default:              return <SeoOverview />;
      }
    }

    if (selectedModule === "website") {
      switch (routeContext.viewId) {
        case "website-dashboard":
        case "dashboard":        return <WebsiteDashboard />;
        case "projects":         return <Projects />;
        case "inputs":           return <Inputs />;
        case "reports":          return <Reports />;
        case "website-settings": return <WebsiteSettings />;
        default:                 return <WebsiteDashboard />;
      }
    }

    const moduleDefinition = MODULE_DEFINITIONS[selectedModule ?? "g-ads"];
    return (
      <ModuleFeatureBoard
        module={moduleDefinition}
        activeView={routeContext.viewId}
        onNavigate={handleViewChange}
      />
    );
  };

  // ✅ Only show module selection screen if no module is selected AND
  // there's no initialModule from the URL (i.e. user navigated to / fresh)
  if (!selectedModule) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-10">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-800">Select a Module</h1>
            <p className="text-slate-500 mt-2">Choose which platform you want to manage</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Google Ads */}
            <button
              onClick={() => handleModuleChange("g-ads")}
              className="group bg-white rounded-xl shadow hover:shadow-xl transition-all border-4 border-transparent overflow-hidden text-left"
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#dbeafe')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
            >
              <div className="bg-blue-50 border-b border-blue-100 p-4 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-2.5 w-20 bg-blue-200 rounded-full" />
                  <div className="h-2 w-10 bg-blue-100 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="bg-white rounded-lg p-2 border border-blue-100">
                      <div className="h-1.5 w-8 bg-blue-200 rounded-full mb-1.5" />
                      <div className="h-3 w-10 bg-blue-400 rounded-sm" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-2 border border-blue-100 flex gap-1 items-end h-10">
                  {[3, 5, 4, 6, 4, 7, 5].map((h, i) => (
                    <div key={i} className="flex-1 bg-blue-300 rounded-sm" style={{ height: `${h * 4}px` }} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-8">
                <div className="text-4xl">📢</div>
                <h2 className="text-xl font-semibold text-slate-800">Google Ads</h2>
                <p className="text-sm text-slate-500">Manage ad campaigns, monitor performance, and optimize budgets.</p>
                <span className="text-sm font-medium group-hover:underline" style={{ color: '#EF4F6E' }}>Open Dashboard →</span>
              </div>
            </button>

            {/* SEO Agents */}
            <button
              onClick={() => handleModuleChange("seo")}
              className="group bg-white rounded-xl shadow hover:shadow-xl transition-all border-4 border-transparent overflow-hidden text-left"
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#d1fae5')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
            >
              <div className="bg-green-50 border-b border-green-100 p-4 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-2.5 w-20 bg-green-200 rounded-full" />
                  <div className="h-2 w-10 bg-green-100 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="bg-white rounded-lg p-2 border border-green-100">
                      <div className="h-1.5 w-8 bg-green-200 rounded-full mb-1.5" />
                      <div className="h-3 w-10 bg-green-400 rounded-sm" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-2 border border-green-100 flex gap-1 items-end h-10">
                  {[4, 6, 3, 7, 5, 6, 4].map((h, i) => (
                    <div key={i} className="flex-1 bg-green-300 rounded-sm" style={{ height: `${h * 4}px` }} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-8">
                <div className="text-4xl">🔍</div>
                <h2 className="text-xl font-semibold text-slate-800">SEO Agents</h2>
                <p className="text-sm text-slate-500">Track rankings, optimize content, and automate SEO tasks.</p>
                <span className="text-sm font-medium group-hover:underline" style={{ color: '#EF4F6E' }}>Open Dashboard →</span>
              </div>
            </button>

            {/* Website Checklists */}
            <button
              onClick={() => handleModuleChange("website")}
              className="group bg-white rounded-xl shadow hover:shadow-xl transition-all border-4 border-transparent overflow-hidden text-left"
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#f3e8ff')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
            >
              <div className="bg-purple-50 border-b border-purple-100 p-4 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-2.5 w-20 bg-purple-200 rounded-full" />
                  <div className="h-2 w-10 bg-purple-100 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="bg-white rounded-lg p-2 border border-purple-100">
                      <div className="h-1.5 w-8 bg-purple-200 rounded-full mb-1.5" />
                      <div className="h-3 w-10 bg-purple-400 rounded-sm" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-2 border border-purple-100 flex gap-1 items-end h-10">
                  {[5, 3, 6, 4, 7, 3, 6].map((h, i) => (
                    <div key={i} className="flex-1 bg-purple-300 rounded-sm" style={{ height: `${h * 4}px` }} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-8">
                <div className="text-4xl">🌐</div>
                <h2 className="text-xl font-semibold text-slate-800">Website Checklists</h2>
                <p className="text-sm text-slate-500">Audit websites, manage tasks, and improve performance.</p>
                <span className="text-sm font-medium group-hover:underline" style={{ color: '#EF4F6E' }}>Open Dashboard →</span>
              </div>
            </button>

          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50">
        <AppSidebar
          currentView={routeContext.kind === "module" ? routeContext.viewId : null}
          currentModule={selectedModule}
          moduleSwitcherDocked={moduleSwitcherDocked}
          onModuleSwitcherToggle={handleModuleSectionToggle}
          onModuleChange={handleModuleChange}
          onViewChange={handleViewChange}
          user={user}
          onLogout={onLogout}
        />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {selectedModule === "website" && <DashboardHeader />}
          {selectedModule === "seo" && (
            <SeoHeader title="SEO Dashboard" subtitle="SEO Analyze Agent" />
          )}
          <div className="flex-1 overflow-auto overflow-x-hidden">
            <div className="p-6">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
