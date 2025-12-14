import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle, Info, User } from "lucide-react";
import { useData } from "../lib/data-context";

interface ReportPreviewProps {
  reportId: string;
  onBack: () => void;
}

export function ReportPreview({ reportId, onBack }: ReportPreviewProps) {
  const { clients, clientsLoading } = useData();
  const client = clients.find((c) => c.id === reportId);

  const formatNumber = (value?: number) =>
    typeof value === "number" ? value.toLocaleString() : "—";

  const formatCurrency = (value?: number, currency = "USD") => {
    if (typeof value !== "number") return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const metrics = [
    { label: "Ad Spend", value: formatCurrency(client?.adSpend, client?.currencyCode) },
    { label: "Impressions", value: formatNumber(client?.impressions) },
    { label: "Clicks", value: formatNumber(client?.clicks) },
    { label: "Conversions", value: formatNumber(client?.conversions) },
    { label: "CTR", value: client?.ctr ? `${client.ctr}%` : "—" },
    { label: "CPA", value: formatCurrency(client?.cpa, client?.currencyCode) },
    { label: "ROAS", value: client?.roas ? `${client.roas}x` : "—" },
    { label: "Conversion Rate", value: client?.conversionRate ? `${client.conversionRate}%` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-slate-900">Client performance snapshot</h1>
            <p className="text-slate-500">
              {client?.name ?? (clientsLoading ? "Loading client details…" : "No client data available")}
            </p>
          </div>
        </div>
        {client && <Badge variant="outline">Live data</Badge>}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{client ? `${client.name} performance` : "Report data coming soon"}</CardTitle>
              <p className="text-sm text-slate-500">
                {client
                  ? "Showing the latest metrics we have for this client."
                  : "We couldn't find live data for this report yet."}
              </p>
            </div>
            {client && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4" />
                {client.customerId || client.customerIds?.join(", ") || "No customer ID on file"}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">{metric.label}</p>
                <p className="text-sm font-semibold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>

          <Separator />

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Report generation is coming soon</AlertTitle>
            <AlertDescription>
              Detailed PDF and chart-based reporting is being built. In the meantime, this preview shows
              live metrics for the selected client so you always see real data instead of static mock
              content.
            </AlertDescription>
          </Alert>

          {!client && !clientsLoading && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>No client selected</AlertTitle>
              <AlertDescription>
                Generate a report from the client list to see the latest performance metrics here.
              </AlertDescription>
            </Alert>
          )}

          {clientsLoading && !client && (
            <p className="text-sm text-slate-500">Loading client data from the workspace…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
            <div>
              <p className="text-sm font-medium text-slate-900">Export and delivery</p>
              <p className="text-xs text-slate-600">
                Once full reporting is live you'll be able to export PDFs and email reports directly to your
                clients.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 mt-1" />
            <div>
              <p className="text-sm font-medium text-slate-900">Coming soon</p>
              <p className="text-xs text-slate-600">
                Chart visualizations, keyword insights, and AI recommendations will appear here as they become
                available for this client.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
