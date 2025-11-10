import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Activity,
  CheckCircle, 
  AlertTriangle, 
  UserPlus, 
  FileText, 
  Package,
  TrendingUp,
  Settings,
  Play,
  XCircle,
  MessageSquare,
  User
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "recommendation" | "execution" | "alert" | "client" | "report" | "bundle" | "approval" | "rejection";
  user: string;
  action: string;
  target?: string;
  timestamp: string;
  status?: "success" | "warning" | "error" | "info";
}

// Mock data for recent activities across the platform
const recentActivities: ActivityItem[] = [
  {
    id: "1",
    type: "execution",
    user: "Sarah Johnson",
    action: "Executed action bundle",
    target: "TechStart Inc",
    timestamp: "5 minutes ago",
    status: "success",
  },
  {
    id: "2",
    type: "approval",
    user: "Mike Chen",
    action: "Approved AI recommendation",
    target: "Fashion Forward - Budget Reallocation",
    timestamp: "12 minutes ago",
    status: "success",
  },
  {
    id: "3",
    type: "alert",
    user: "System",
    action: "Critical alert triggered",
    target: "EcoLife Solutions - CTR Drop 35%",
    timestamp: "18 minutes ago",
    status: "error",
  },
  {
    id: "4",
    type: "report",
    user: "Sarah Johnson",
    action: "Generated monthly report",
    target: "TechStart Inc",
    timestamp: "25 minutes ago",
    status: "info",
  },
  {
    id: "5",
    type: "bundle",
    user: "Emily Rodriguez",
    action: "Created action bundle with 3 recommendations",
    target: "Global Fitness",
    timestamp: "32 minutes ago",
    status: "info",
  },
  {
    id: "6",
    type: "recommendation",
    user: "AI System",
    action: "Generated new recommendation",
    target: "HomeDecor Pro - Keyword Optimization",
    timestamp: "45 minutes ago",
    status: "info",
  },
  {
    id: "7",
    type: "client",
    user: "Admin",
    action: "Added new client account",
    target: "AutoParts Direct",
    timestamp: "1 hour ago",
    status: "success",
  },
  {
    id: "8",
    type: "rejection",
    user: "Mike Chen",
    action: "Rejected AI recommendation",
    target: "Fashion Forward - Ad Copy Update",
    timestamp: "1 hour ago",
    status: "warning",
  },
  {
    id: "9",
    type: "execution",
    user: "Sarah Johnson",
    action: "Executed keyword optimization",
    target: "TechStart Inc - Q4 Launch Campaign",
    timestamp: "2 hours ago",
    status: "success",
  },
  {
    id: "10",
    type: "approval",
    user: "Emily Rodriguez",
    action: "Approved budget adjustment",
    target: "Global Fitness - New Year Promo",
    timestamp: "2 hours ago",
    status: "success",
  },
];

export function RecentActivityPanel() {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "recommendation":
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case "execution":
        return <Play className="w-4 h-4 text-blue-600" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "client":
        return <UserPlus className="w-4 h-4 text-green-600" />;
      case "report":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "bundle":
        return <Package className="w-4 h-4 text-indigo-600" />;
      case "approval":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejection":
        return <XCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "bg-green-50";
      case "warning":
        return "bg-yellow-50";
      case "error":
        return "bg-red-50";
      default:
        return "bg-blue-50";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-600" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentActivities.slice(0, 4).map((activity, index) => (
            <div key={activity.id}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${getStatusColor(activity.status)} flex items-center justify-center flex-shrink-0`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        {activity.action}
                      </p>
                      {activity.target && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {activity.target}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <User className="w-3 h-3" />
                          <span>{activity.user}</span>
                        </div>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {index < 3 && (
                <div className="h-px bg-slate-100 my-3" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
