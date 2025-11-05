import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Package, Download, Eye } from "lucide-react";
import { mockActionBundles } from "../lib/mock-data";
import { BundleDetails } from "./bundle-details";
import { CreateBundle } from "./create-bundle";

interface ActionBundlesProps {
  onBundleClick?: (bundleId: string) => void;
}

export function ActionBundles({ onBundleClick }: ActionBundlesProps) {
  const [showCreateBundle, setShowCreateBundle] = useState(false);

  if (showCreateBundle) {
    return (
      <CreateBundle
        onBack={() => setShowCreateBundle(false)}
        onSave={() => setShowCreateBundle(false)}
      />
    );
  }
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { variant: "default" as const, label: "Completed" };
      case "in-progress":
        return { variant: "outline" as const, label: "In Progress" };
      default:
        return { variant: "secondary" as const, label: "Pending" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Action Bundles</h1>
          <p className="text-slate-500">Grouped recommendations ready for execution</p>
        </div>
        <Button onClick={() => setShowCreateBundle(true)}>Create New Bundle</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Total Bundles</p>
            <p className="text-slate-900">{mockActionBundles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">In Progress</p>
            <p className="text-slate-900 text-blue-600">{mockActionBundles.filter(b => b.status === "in-progress").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-1">Completed</p>
            <p className="text-slate-900 text-green-600">{mockActionBundles.filter(b => b.status === "completed").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bundles List */}
      <div className="space-y-4">
        {mockActionBundles.map((bundle) => {
          const statusBadge = getStatusBadge(bundle.status);
          return (
            <Card key={bundle.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-slate-900">{bundle.clientName}</h3>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">Created by {bundle.managerName}</p>
                      </div>
                      <p className="text-xs text-slate-400">{bundle.createdAt}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Recommendations Included</p>
                        <p className="text-sm text-slate-900">{bundle.recommendationsCount} actions</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Estimated Impact</p>
                        <p className="text-sm text-green-600">{bundle.estimatedImpact}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-200">
                      <Button variant="outline" size="sm" onClick={() => onBundleClick?.(bundle.id)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Export to Google Ads
                      </Button>
                      {bundle.status === "pending" && (
                        <Button size="sm">
                          Start Execution
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
