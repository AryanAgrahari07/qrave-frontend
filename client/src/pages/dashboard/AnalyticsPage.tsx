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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnalyticsOverview } from "@/hooks/api";
import { useAuth } from "@/context/AuthContext";

const COLORS = ["hsl(var(--primary))", "#fbbf24", "#10b981", "#6366f1", "#f43f5e"];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<"day" | "month" | "quarter" | "year">("day");
  const [isTopDishesOpen, setIsTopDishesOpen] = useState(false);
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
      <div className="space-y-4 sm:space-y-8 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          {/* <div> */}
          {/* <h2 className="text-3xl font-heading font-bold">Analytics</h2> */}
          {/* <p className="text-muted-foreground">Deep insights into your restaurant's performance.</p> */}
          {/* </div> */}

          <Select value={timeframe} onValueChange={(val: any) => setTimeframe(val)}>
            <SelectTrigger className="w-[180px] bg-background border-primary/20 shadow-sm">
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

        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-5 mb-4 sm:mb-8">
          <Card className="shadow-sm border-primary/10 hover:shadow-md transition-shadow bg-gradient-to-br from-card to-muted/20 min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardTitle className="text-[11px] leading-4 sm:text-sm font-medium text-muted-foreground truncate pr-2">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-base sm:text-2xl font-bold font-heading leading-tight break-words font-mono">
                ₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p
                className={cn(
                  "text-[11px] sm:text-xs font-bold flex items-center mt-1 break-words",
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

          <Card className="shadow-sm border-primary/10 hover:shadow-md transition-shadow min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardTitle className="text-[11px] leading-4 sm:text-sm font-medium text-muted-foreground truncate pr-2">
                Paid Orders
              </CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-base sm:text-2xl font-bold font-heading leading-tight break-words">
                {analytics.kpis.paidOrders.toLocaleString()}
              </div>
              <p
                className={cn(
                  "text-[11px] sm:text-xs font-bold flex items-center mt-1 break-words",
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

          <Card className="shadow-sm border-primary/10 hover:shadow-md transition-shadow min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardTitle className="text-[11px] leading-4 sm:text-sm font-medium text-muted-foreground truncate pr-2">
                Peak Hours
              </CardTitle>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-base sm:text-2xl font-bold font-heading leading-tight break-words">
                {peakHoursText}
              </div>
              <p className="text-[11px] sm:text-xs text-blue-600 font-bold flex items-center mt-1 break-words">
                Highest footfall
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10 hover:shadow-md transition-shadow min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardTitle className="text-[11px] leading-4 sm:text-sm font-medium text-muted-foreground truncate pr-2">
                Avg Order Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-base sm:text-2xl font-bold font-heading leading-tight break-words">
                ₹{avgOrderValue}
              </div>
              <p className={cn(
                "text-[11px] sm:text-xs font-bold flex items-center mt-1 break-words",
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

          <Card className="shadow-sm border-primary/10 hover:shadow-md transition-shadow min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
              <CardTitle className="text-[11px] leading-4 sm:text-sm font-medium text-muted-foreground truncate pr-2">
                Table Turnover
              </CardTitle>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
              <div className="text-base sm:text-2xl font-bold font-heading leading-tight break-words">
                {analytics.kpis.tableTurnoverMinutes} mins
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold flex items-center mt-1 break-words">
                Optimal range
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 min-w-0">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  Revenue Trends ({timeframe.charAt(0).toUpperCase() + timeframe.slice(1)})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueSeries.points}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <Tooltip
                    formatter={(value: any) => `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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

          <Card className="min-w-0">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="w-5 h-5 text-yellow-500 shrink-0" /> <span className="truncate">Top Dishes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-4 sm:space-y-6">
                {analytics.topItems.map((dish, index) => (
                  <div key={dish.name} className="flex items-center justify-between group gap-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm",
                        index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500" :
                          index === 1 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500"
                      )}>
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">{dish.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{dish.orders.toLocaleString()} orders</p>
                        <p className="text-[11px] text-muted-foreground/80">₹{dish.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    {dish.trend === "up" ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-500 dark:border-green-800">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-500 dark:border-red-800">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-6 text-xs text-primary font-bold"
                onClick={() => setIsTopDishesOpen(true)}
              >
                VIEW ALL RANKINGS
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* View All Top Dishes Dialog */}
        <Dialog open={isTopDishesOpen} onOpenChange={setIsTopDishesOpen}>
          <DialogContent className="max-w-md w-[95vw] h-[80vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-2 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                All Dish Rankings
              </DialogTitle>
              <DialogDescription>
                Complete list of your best-performing menu items
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {analytics.topItems.map((dish, index) => (
                  <div key={dish.name} className="flex items-center justify-between group gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm",
                        index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500" :
                        index === 1 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" :
                        index === 2 ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">
                          {dish.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{dish.orders.toLocaleString()}</span> orders
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            ₹{dish.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center">
                      {dish.trend === "up" ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-500 dark:border-green-800">
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                          Up
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-500 dark:border-red-800">
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                          Down
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-base sm:text-lg">Sales by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[300px] flex items-center px-2 sm:px-6">
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
                  <Tooltip 
                    formatter={(value: any) => `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-base sm:text-lg">Peak Traffic Volume</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] sm:h-[300px] px-2 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.trafficVolume}>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
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