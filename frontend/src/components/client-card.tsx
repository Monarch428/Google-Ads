import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowUpRight, TrendingUp, Target, DollarSign } from "lucide-react";
import { Client } from "../lib/mock-data";
import { formatCurrency } from "../lib/currencies";

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const getStatusColor = () => {
    switch (client.status) {
      case "healthy":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
    }
  };

  const getStatusLabel = () => {
    switch (client.status) {
      case "healthy":
        return "Healthy";
      case "warning":
        return "Warning";
      case "critical":
        return "Critical";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {client.logo ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                <img src={client.logo} alt={client.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">{getInitials(client.name)}</span>
              </div>
            )}
            <div>
              <h3 className="text-slate-900">{client.name}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {client.impressions.toLocaleString()} impressions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Clicks</p>
            <p className="text-slate-900">{client.clicks.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">CTR</p>
            <p className="text-slate-900">{client.ctr}%</p>
          </div>
          <div>
          <p className="text-xs text-slate-500 mb-1">CPA</p>
          <p className="text-slate-900">{formatCurrency(client.cpa, client.currencyCode)}</p>
        </div>
      </div>

        <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-slate-500">Conv. Rate</p>
              <p className="text-sm text-slate-900">{client.conversionRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div>
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="text-sm text-slate-900">{formatCurrency(client.revenue, client.currencyCode)}</p>
          </div>
        </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <Badge variant="outline" className="text-xs">ROAS: {client.roas.toFixed(2)}</Badge>
          <p className="text-sm text-slate-500">Ad Spend: {formatCurrency(client.adSpend, client.currencyCode)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
