import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Lightbulb, ArrowUpRight } from "lucide-react";
import { AIRecommendation } from "../lib/mock-data";

interface AIRecommendationOverviewProps {
  recommendations: AIRecommendation[];
  loading?: boolean;
  onViewAll?: () => void;
}

export function AIRecommendationOverview({ recommendations, loading = false, onViewAll }: AIRecommendationOverviewProps) {
  const pendingRecs = recommendations.filter(r => r.status === "pending");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "outline";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Recommendations Overview</CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          View All
          <ArrowUpRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Loading latest AI recommendations...</p>
        ) : pendingRecs.length === 0 ? (
          <p className="text-sm text-slate-500">No pending AI recommendations right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingRecs.slice(0, 4).map((rec) => (
              <div key={rec.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm text-slate-900">{rec.clientName}</h4>
                      <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{rec.campaignName} • {rec.type}</p>
                    <p className="text-sm text-slate-700">{rec.recommendation}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-green-600">{rec.impact}</p>
                      <p className="text-xs text-slate-400">{rec.createdAt}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
