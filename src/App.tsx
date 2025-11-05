import { useState } from "react";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { DashboardOverview } from "./components/dashboard-overview";
import { Accounts } from "./components/accounts";
import { AIRecommendations } from "./components/ai-recommendations";
import { ClientReports } from "./components/client-reports";
import { UserManagement } from "./components/user-management";
import { ClientDetails } from "./components/client-details";
import { Settings } from "./components/settings";
import { SetupChecklist } from "./components/setup-checklist";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./components/ui/sheet";
import { ManagerDetails } from "./components/manager-details";
import { BundleDetails } from "./components/bundle-details";
import { ReportPreview } from "./components/report-preview";
import { AlertDetails } from "./components/alert-details";
import { Alert as AlertType, Manager } from "./lib/mock-data";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  
  // Global side panel state
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Handle view change and clear any detail views
  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setSelectedClient(null); // Clear client details when navigating
  };

  const renderContent = () => {
    if (selectedClient) {
      return <ClientDetails clientId={selectedClient} onBack={() => setSelectedClient(null)} />;
    }

    switch (currentView) {
      case "dashboard":
        return <DashboardOverview 
          onClientClick={setSelectedClient} 
          onNavigate={handleViewChange}
          onAlertClick={setSelectedAlert}
          onManagerClick={setSelectedManager}
          onBundleClick={setSelectedBundle}
          onReportClick={setSelectedReport}
        />;
      case "accounts":
        return <Accounts onClientClick={setSelectedClient} />;
      case "recommendations":
        return <AIRecommendations onBundleClick={setSelectedBundle} />;
      case "reports":
        return <ClientReports onReportClick={setSelectedReport} />;
      case "users":
        return <UserManagement onManagerClick={setSelectedManager} />;
      case "checklist":
        return <SetupChecklist />;
      case "settings":
        return <Settings />;
      default:
        return <DashboardOverview 
          onClientClick={setSelectedClient} 
          onNavigate={handleViewChange}
          onAlertClick={setSelectedAlert}
          onManagerClick={setSelectedManager}
          onBundleClick={setSelectedBundle}
          onReportClick={setSelectedReport}
        />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar currentView={currentView} onViewChange={handleViewChange} />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster position="top-right" richColors />

      {/* Global Side Panels */}
      
      {/* Alert Details Panel */}
      <Sheet open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Alert Details</SheetTitle>
              <SheetDescription>View detailed information about this alert</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedAlert && (
                <AlertDetails 
                  alert={selectedAlert}
                  onClose={() => setSelectedAlert(null)}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manager Details Panel */}
      <Sheet open={!!selectedManager} onOpenChange={(open) => !open && setSelectedManager(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Manager Details</SheetTitle>
              <SheetDescription>View manager activity and performance details</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedManager && (
                <ManagerDetails 
                  manager={selectedManager}
                  onBack={() => setSelectedManager(null)}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bundle Details Panel */}
      <Sheet open={!!selectedBundle} onOpenChange={(open) => !open && setSelectedBundle(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Action Bundle Details</SheetTitle>
              <SheetDescription>View recommendations and actions in this bundle</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedBundle && (
                <BundleDetails 
                  bundleId={selectedBundle}
                  onBack={() => setSelectedBundle(null)}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Report Preview Panel */}
      <Sheet open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          <div className="px-6 py-6">
            <SheetHeader>
              <SheetTitle>Report Preview</SheetTitle>
              <SheetDescription>Preview client report before downloading or sending</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {selectedReport && (
                <ReportPreview 
                  reportId={selectedReport}
                  onBack={() => setSelectedReport(null)}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
