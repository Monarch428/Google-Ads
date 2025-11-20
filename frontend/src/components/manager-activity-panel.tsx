import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle, Clock, Package } from "lucide-react";
import { Manager } from "../lib/mock-data";
import { GoogleAdsSyncControls } from "./google-ads-sync-controls";

interface ManagerActivityPanelProps {
  managers: Manager[];
  onManagerClick?: (manager: Manager) => void;
}

export function ManagerActivityPanel({ managers, onManagerClick }: ManagerActivityPanelProps) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle>Manager Activity</CardTitle>
        <GoogleAdsSyncControls
          size="compact"
          contextLabel="manager performance"
        />
      </CardHeader>
      <CardContent>
        {managers.length === 0 ? (
          <p className="text-sm text-slate-500">No manager performance data available.</p>
        ) : (
          <div className="space-y-4">
            {managers.map((manager) => (
              <div
                key={manager.id}
                className="border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
                onClick={() => onManagerClick?.(manager)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-slate-900">{manager.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{manager.role}</p>
                  </div>
                  <Badge variant={manager.status === "active" ? "default" : "secondary"}>
                    {manager.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Approved</p>
                      <p className="text-sm text-slate-900">{manager.recommendationsApproved}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pending</p>
                      <p className="text-sm text-slate-900">{manager.recommendationsPending}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Bundles</p>
                      <p className="text-sm text-slate-900">{manager.actionBundlesCreated}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-500">{manager.clientsAssigned} clients assigned</p>
                  <p className="text-xs text-slate-500">Avg. approval: {manager.avgTimeToApproval}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
