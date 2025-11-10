import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down";
  variant?: "default" | "warning" | "success";
}

export function KPICard({ title, value, icon: Icon, trend, trendDirection, variant = "default" }: KPICardProps) {
  const getVariantColor = () => {
    switch (variant) {
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "success":
        return "text-green-600 bg-green-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-slate-500">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-slate-900">{value}</p>
              {trend && (
                <span className={`text-xs flex items-center gap-1 ${trendDirection === "up" ? "text-green-600" : "text-red-600"}`}>
                  {trendDirection === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {trend}
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${getVariantColor()}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
