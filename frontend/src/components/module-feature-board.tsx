import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";
import type { ModuleDefinition, ModuleFeature } from "../lib/modules";

type ModuleFeatureBoardProps = {
  module: ModuleDefinition;
  activeView: string;
  onNavigate?: (viewId: string) => void;
};

function FeatureCard({
  feature,
  isActive,
  onNavigate,
  moduleLabel,
}: {
  feature: ModuleFeature;
  isActive: boolean;
  onNavigate?: (viewId: string) => void;
  moduleLabel: string;
}) {
  return (
    <Card
      className={cn(
        "border transition-all duration-200 hover:shadow-sm",
        isActive ? "border-blue-200 bg-blue-50/60" : "border-slate-200",
      )}
    >
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <div
          className={cn(
            "rounded-full p-2 text-slate-700",
            isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100",
          )}
        >
          <feature.icon className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-1">
          <CardTitle className="text-base leading-snug">{feature.label}</CardTitle>
          <CardDescription className="text-sm">{feature.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3 pt-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Part of {moduleLabel}</span>
        </div>
        {onNavigate && (
          <Button
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(isActive ? "bg-blue-600 text-white hover:bg-blue-700" : "")}
            onClick={() => onNavigate(feature.id)}
          >
            View
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ModuleFeatureBoard({ module, activeView, onNavigate }: ModuleFeatureBoardProps) {
  const activeFeature = module.features.find((feature) => feature.id === activeView) ?? module.features[0];

  const supportingFeatures = module.features.filter((feature) => feature.id !== activeFeature?.id);

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <module.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg leading-tight">{module.label} module</CardTitle>
            <CardDescription className="text-sm text-slate-600">
              {module.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
            Multi-module workspace
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/70 p-4">
            <div className="rounded-lg bg-white p-2 text-blue-600 shadow-inner">
              <activeFeature.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-slate-900">{activeFeature.label}</p>
              <p className="text-sm text-slate-600">{activeFeature.description}</p>
            </div>
            {onNavigate && (
              <Button variant="link" className="text-blue-700" onClick={() => onNavigate(activeFeature.id)}>
                Jump to feature
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {supportingFeatures.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                isActive={false}
                onNavigate={onNavigate}
                moduleLabel={module.shortLabel}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Outcomes this module supports</CardTitle>
          <CardDescription>Use these quick wins to organize your roadmap.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Visibility
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Align teams around a shared module roadmap.</li>
              <li>• Keep owners, integrations, and success metrics in one view.</li>
              <li>• Switch modules without losing user context.</li>
            </ul>
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Execution
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• Prioritize experiments with the highest projected lift.</li>
              <li>• Share briefs and checklists without switching workspaces.</li>
              <li>• Document wins and lessons learned across teams.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Suggested next steps</CardTitle>
          <CardDescription>
            Pair the active feature with a few quick deliverables to get stakeholders aligned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">Share a module charter</p>
              <p className="text-sm text-slate-600">
                Outline scope, systems of record, and the success metrics for {module.shortLabel}.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">Assign owners to each feature</p>
              <p className="text-sm text-slate-600">
                Keep accountability clear for deliverables like research, QA, and reporting.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">Publish a 30-day roadmap</p>
              <p className="text-sm text-slate-600">
                Highlight the first waves of work and how they ladder into the quarterly plan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
