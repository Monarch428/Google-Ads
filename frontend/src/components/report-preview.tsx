import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  MousePointer,
  Eye,
  BarChart3,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ReportPreviewProps {
  reportId: string;
  onBack: () => void;
}

// Mock report data
const performanceData = [
  { date: "Week 1", impressions: 245000, clicks: 8500, conversions: 168 },
  { date: "Week 2", impressions: 268000, clicks: 9200, conversions: 192 },
  { date: "Week 3", impressions: 252000, clicks: 8800, conversions: 178 },
  { date: "Week 4", impressions: 289000, clicks: 10200, conversions: 215 },
];

const campaignData = [
  { name: "Q4 Product Launch", spend: 18500, conversions: 312, roas: 3.2, status: "healthy" },
  { name: "Brand Awareness", spend: 12200, conversions: 178, roas: 2.8, status: "healthy" },
  { name: "Retargeting", spend: 8900, conversions: 245, roas: 4.1, status: "healthy" },
  { name: "Shopping Campaigns", spend: 5630, conversions: 157, roas: 2.4, status: "warning" },
];

const deviceBreakdown = [
  { name: "Mobile", value: 45, color: "#3b82f6" },
  { name: "Desktop", value: 38, color: "#8b5cf6" },
  { name: "Tablet", value: 17, color: "#ec4899" },
];

const topKeywords = [
  { keyword: "enterprise software solution", impressions: 45200, clicks: 1580, ctr: 3.49, position: 1.8 },
  { keyword: "cloud platform", impressions: 38900, clicks: 1320, ctr: 3.39, position: 2.1 },
  { keyword: "business automation tool", impressions: 32100, clicks: 1150, ctr: 3.58, position: 1.9 },
  { keyword: "workflow management", impressions: 28700, clicks: 980, ctr: 3.41, position: 2.3 },
  { keyword: "project collaboration", impressions: 24300, clicks: 890, ctr: 3.66, position: 1.7 },
];

export function ReportPreview({ reportId, onBack }: ReportPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-slate-900">Monthly Performance Report</h1>
            <p className="text-slate-500">TechStart Inc • October 2025</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">Pending Approval</Badge>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button>
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve Report
          </Button>
        </div>
      </div>

      {/* Report Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Client</p>
                <p className="text-sm text-slate-900">TechStart Inc</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Period</p>
                <p className="text-sm text-slate-900">Oct 1-31, 2025</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Prepared By</p>
                <p className="text-sm text-slate-900">Sarah Johnson</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <BarChart3 className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Report Type</p>
                <p className="text-sm text-slate-900">Monthly Performance</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI-Generated Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900 mb-1">
                  <strong>Increase budget for Q4 Product Launch campaign</strong>
                </p>
                <p className="text-xs text-slate-600">
                  This campaign is showing exceptional ROAS (3.2x). Consider increasing budget by 20% 
                  to capitalize on momentum. Expected impact: +45 conversions/month.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900 mb-1">
                  <strong>Expand lookalike audiences for Retargeting campaign</strong>
                </p>
                <p className="text-xs text-slate-600">
                  Based on high conversion rates (4.1x ROAS), create lookalike audiences from current 
                  converters. Expected impact: +30% reach with similar performance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-900 mb-1">
                  <strong>Optimize Shopping Campaigns budget allocation</strong>
                </p>
                <p className="text-xs text-slate-600">
                  Shopping campaign ROAS (2.4x) is below account average. Consider reducing budget by 
                  15% and reallocating to higher-performing campaigns. Expected impact: +$850 revenue.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps & Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps & Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-900">
                Review and approve recommended budget increase for Q4 Product Launch campaign
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-900">
                Schedule A/B test for new ad copy variations on Brand Awareness campaign
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-900">
                Implement negative keyword recommendations to reduce wasted spend
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-900">
                Create lookalike audiences based on high-value converters
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary - Horizontal */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Total Ad Spend</span>
              </div>
              <p className="text-slate-900">$45,230</p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>+12.5% vs last month</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <Eye className="w-4 h-4" />
                <span className="text-sm">Impressions</span>
              </div>
              <p className="text-slate-900">1,245,000</p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>+8.3% vs last month</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <MousePointer className="w-4 h-4" />
                <span className="text-sm">Clicks</span>
              </div>
              <p className="text-slate-900">42,952</p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>+15.2% vs last month</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500">
                <Target className="w-4 h-4" />
                <span className="text-sm">Conversions</span>
              </div>
              <p className="text-slate-900">892</p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>+18.7% vs last month</span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">CTR</p>
              <p className="text-slate-900">3.45%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">CPA</p>
              <p className="text-slate-900">$50.70</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Conv. Rate</p>
              <p className="text-slate-900">4.2%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">ROAS</p>
              <p className="text-green-600">2.78x</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-slate-900">
              <strong>Key Highlights:</strong> This month showed strong performance across all key metrics. 
              Conversion rate improved by 18.7% compared to last month, driven primarily by the Q4 Product 
              Launch campaign. The retargeting campaign achieved the highest ROAS at 4.1x, exceeding target by 28%.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={12}
                />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="impressions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Impressions"
                />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Clicks"
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Conversions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignData.map((campaign, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        campaign.status === "healthy" ? "bg-green-500" : "bg-yellow-500"
                      }`} />
                      <p className="text-sm text-slate-900">{campaign.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      ROAS: {campaign.roas}x
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500">Spend</p>
                      <p className="text-slate-900">${campaign.spend.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Conversions</p>
                      <p className="text-slate-900">{campaign.conversions}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">CPA</p>
                      <p className="text-slate-900">${(campaign.spend / campaign.conversions).toFixed(2)}</p>
                    </div>
                  </div>
                  {index < campaignData.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {deviceBreakdown.map((device, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: device.color }}
                    />
                    <span className="text-sm text-slate-600">{device.name}</span>
                  </div>
                  <span className="text-sm text-slate-900">{device.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topKeywords.map((keyword, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                    <p className="text-sm text-slate-900">{keyword.keyword}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500">Impressions</p>
                      <p className="text-slate-900">{keyword.impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Clicks</p>
                      <p className="text-slate-900">{keyword.clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">CTR</p>
                      <p className="text-slate-900">{keyword.ctr}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Avg. Position</p>
                      <p className="text-slate-900">{keyword.position}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
