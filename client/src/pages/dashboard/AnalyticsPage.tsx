import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Users, 
  Calendar,
  DollarSign,
  Trophy,
  Loader2
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnalyticsOverview } from "@/hooks/api";
import { useAuth } from "@/context/AuthContext";

const COLORS = ["hsl(var(--primary))", "#fbbf24", "#10b981", "#6366f1", "#f43f5e"];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<"day" | "month" | "quarter" | "year">("day");
  const { user } = useAuth();
  const { restaurantId } = useAuth();

    
  const { data: analytics, isLoading } = useAnalyticsOverview(restaurantId, timeframe);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalRevenue = analytics.kpis.revenue;
  const revenueChange = analytics.kpis.revenueChangePercent;
  const peakHoursText = `${formatHour(analytics.peakHours.startHour)} - ${formatHour(analytics.peakHours.endHour)}`;
  const avgOrderValue = analytics.kpis.avgOrderValue.toFixed(2);
  const growthPercent = analytics.kpis.avgOrderValueChangePercent.toFixed(1);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold">Analytics</h2>
            <p className="text-muted-foreground">Deep insights into your restaurant's performance.</p>
          </div>
          
          <Select value={timeframe} onValueChange={(val: any) => setTimeframe(val)}>
            <SelectTrigger className="w-[180px] bg-white border-primary/20 shadow-sm">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily View</SelectItem>
              <SelectItem value="month">Monthly View</SelectItem>
              <SelectItem value="quarter">Quarterly View</SelectItem>
              <SelectItem value="year">Yearly View</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm border-primary/10 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Total Revenue
                <DollarSign className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                ₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p
                className={cn(
                  "text-xs font-bold flex items-center mt-2",
                  revenueChange >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {revenueChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {Math.abs(revenueChange).toFixed(1)}% vs prev
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Paid Orders
                <Users className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.kpis.paidOrders.toLocaleString()}</div>
              <p
                className={cn(
                  "text-xs font-bold flex items-center mt-2",
                  analytics.kpis.paidOrdersChangePercent >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {analytics.kpis.paidOrdersChangePercent >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {Math.abs(analytics.kpis.paidOrdersChangePercent).toFixed(1)}% vs prev
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Peak Hours
                <Clock className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{peakHoursText}</div>
              <p className="text-xs text-blue-600 font-bold flex items-center mt-2">
                Highest footfall
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Avg Order Value
                <TrendingUp className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{avgOrderValue}</div>
              <p className={cn(
                "text-xs font-bold flex items-center mt-2",
                Number(growthPercent) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {Number(growthPercent) >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {Math.abs(Number(growthPercent))}% growth
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Table Turnover
                <Clock className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.kpis.tableTurnoverMinutes} mins</div>
              <p className="text-xs text-slate-500 font-bold flex items-center mt-2">
                Optimal range
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Revenue Trends ({timeframe.charAt(0).toUpperCase() + timeframe.slice(1)})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueSeries.points}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    tickFormatter={(value) => `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <Tooltip
                    formatter={(value: any) => `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Top Dishes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics.topItems.map((dish, index) => (
                  <div key={dish.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                        index === 0 ? "bg-yellow-100 text-yellow-700" : 
                        index === 1 ? "bg-slate-100 text-slate-700" : "bg-orange-50 text-orange-700"
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-sm group-hover:text-primary transition-colors">{dish.name}</p>
                        <p className="text-xs text-muted-foreground">{dish.orders.toLocaleString()} orders</p>
                        <p className="text-[11px] text-muted-foreground/80">₹{dish.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    {dish.trend === "up" ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border-red-200">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-6 text-xs text-primary font-bold">
                VIEW ALL RANKINGS
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown.map((c) => ({ name: c.name, value: c.revenue }))}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Peak Traffic Volume</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.trafficVolume}>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}