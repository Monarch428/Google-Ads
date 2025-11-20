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

const recentActivities: ActivityItem[] = [];

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
        {recentActivities.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity to display.</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
