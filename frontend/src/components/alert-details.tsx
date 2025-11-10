import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  XCircle,
  TrendingUp,
  Target,
  Calendar,
  User,
  ArrowRight,
  CheckCircle,
  Activity
} from "lucide-react";
import { Alert as AlertType, mockClients } from "../lib/mock-data";
import { useData } from "../lib/data-context";

interface AlertDetailsProps {
  alert: AlertType;
  onClose: () => void;
}

export function AlertDetails({ alert, onClose }: AlertDetailsProps) {
  const { clients } = useData();
  const availableClients = clients.length ? clients : mockClients;
  // Find the client related to this alert
  const client = availableClients.find(c => c.name === alert.clientName);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "ctr-drop":
        return TrendingDown;
      case "cpa-spike":
        return TrendingDown;
      case "budget-overspend":
        return DollarSign;
      case "underperforming":
        return XCircle;
      default:
        return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200 text-red-900";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-900";
      default:
        return "bg-blue-50 border-blue-200 text-blue-900";
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "default";
      default:
        return "secondary";
    }
  };

  // Generate detailed metrics based on alert type
  const getAlertMetrics = () => {
    if (!client) return null;

    switch (alert.type) {
      case "ctr-drop":
        return {
          current: `${client.ctr}%`,
          previous: `${(client.ctr * 1.4).toFixed(2)}%`,
          change: "-28.6%",
          metric: "Click-Through Rate"
        };
      case "cpa-spike":
        return {
          current: `$${client.cpa}`,
          previous: `$${(client.cpa * 0.7).toFixed(2)}`,
          change: "+42.9%",
          metric: "Cost Per Acquisition"
        };
      case "budget-overspend":
        return {
          current: `$${client.adSpend.toLocaleString()}`,
          previous: `$${(client.adSpend * 0.85).toLocaleString()}`,
          change: "+17.6%",
          metric: "Ad Spend"
        };
      case "underperforming":
        return {
          current: `${client.conversionRate}%`,
          previous: `${(client.conversionRate * 1.5).toFixed(1)}%`,
          change: "-33.3%",
          metric: "Conversion Rate"
        };
      default:
        return null;
    }
  };

  const metrics = getAlertMetrics();
  const Icon = getAlertIcon(alert.type);

  // Generate recommended actions based on alert type
  const getRecommendedActions = () => {
    switch (alert.type) {
      case "ctr-drop":
        return [
          "Review ad copy for relevance and engagement",
          "Test new ad creative variations",
          "Analyze audience targeting settings",
          "Check for seasonal or competitive factors"
        ];
      case "cpa-spike":
        return [
          "Pause underperforming keywords immediately",
          "Review and adjust bidding strategy",
          "Optimize landing page conversion rate",
          "Refine audience targeting criteria"
        ];
      case "budget-overspend":
        return [
          "Implement daily budget caps",
          "Review automated bidding settings",
          "Pause low-performing campaigns",
          "Reallocate budget to top performers"
        ];
      case "underperforming":
        return [
          "A/B test landing pages",
          "Review conversion tracking setup",
          "Optimize ad relevance and quality score",
          "Adjust bid strategy for better positioning"
        ];
      default:
        return [];
    }
  };

  const recommendedActions = getRecommendedActions();

  return (
    <div className="space-y-4">
      {/* Alert Header */}
      <Card className={`border-2 ${getSeverityColor(alert.severity)}`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              alert.severity === "critical" ? "bg-red-100" : 
              alert.severity === "warning" ? "bg-yellow-100" : "bg-blue-100"
            }`}>
              <Icon className={`w-6 h-6 ${
                alert.severity === "critical" ? "text-red-600" : 
                alert.severity === "warning" ? "text-yellow-600" : "text-blue-600"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getSeverityBadgeVariant(alert.severity)} className={alert.severity === "warning" ? "bg-yellow-500 text-white border-transparent hover:bg-yellow-600" : ""}>
                  {alert.severity.toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-500">{alert.timestamp}</span>
              </div>
              <h2 className="text-slate-900 mb-2">{alert.message}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{alert.clientName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{alert.campaignName}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-2">{metrics.metric}</p>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Current</p>
                    <p className="text-2xl text-slate-900">{metrics.current}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 mb-2" />
                  <div>
                    <p className="text-xs text-slate-500">Previous</p>
                    <p className="text-2xl text-slate-400">{metrics.previous}</p>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded text-sm ${
                  metrics.change.startsWith("+") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                }`}>
                  {metrics.change.startsWith("+") ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{metrics.change}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Overview */}
      {client && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Ad Spend</p>
                <p className="text-lg text-slate-900">${client.adSpend.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">ROAS</p>
                <p className="text-lg text-slate-900">{client.roas.toFixed(2)}x</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Conversions</p>
                <p className="text-lg text-slate-900">{client.conversions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">CTR</p>
                <p className="text-lg text-slate-900">{client.ctr}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendedActions.map((action, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-900">{action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Impact Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impact Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900">Alert triggered</p>
                <p className="text-xs text-slate-500 mt-0.5">{alert.timestamp}</p>
              </div>
            </div>
            <div className="h-px bg-slate-200 ml-4" />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900">Performance degradation detected</p>
                <p className="text-xs text-slate-500 mt-0.5">Started 3 days ago</p>
              </div>
            </div>
            <div className="h-px bg-slate-200 ml-4" />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900">Previously performing well</p>
                <p className="text-xs text-slate-500 mt-0.5">Last week</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button className="flex-1">
          Create Action Bundle
        </Button>
        <Button variant="outline" className="flex-1">
          Assign to Manager
        </Button>
      </div>

      <Button variant="ghost" onClick={onClose} className="w-full">
        Close
      </Button>
    </div>
  );
}
