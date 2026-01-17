
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  MousePointer2, 
  Clock, 
  Users, 
  Calendar,
  DollarSign,
  ChevronDown,
  Trophy
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

const REVENUE_DATA = {
  day: [
    { name: "Mon", total: 1200 },
    { name: "Tue", total: 1500 },
    { name: "Wed", total: 1100 },
    { name: "Thu", total: 1800 },
    { name: "Fri", total: 2400 },
    { name: "Sat", total: 3200 },
    { name: "Sun", total: 2800 },
  ],
  month: [
    { name: "Week 1", total: 8500 },
    { name: "Week 2", total: 9200 },
    { name: "Week 3", total: 7800 },
    { name: "Week 4", total: 11500 },
  ],
  quarter: [
    { name: "Jan", total: 32000 },
    { name: "Feb", total: 28000 },
    { name: "Mar", total: 35000 },
  ],
  year: [
    { name: "Q1", total: 95000 },
    { name: "Q2", total: 110000 },
    { name: "Q3", total: 105000 },
    { name: "Q4", total: 130000 },
  ]
};

const DISH_RANKING: Record<string, { name: string; orders: number; trend: "up" | "down" }[]> = {
  day: [
    { name: "Wagyu Burger", orders: 45, trend: "up" },
    { name: "Truffle Fries", orders: 38, trend: "up" },
    { name: "Crispy Calamari", orders: 22, trend: "down" },
    { name: "Salmon Bowl", orders: 18, trend: "up" },
  ],
  month: [
    { name: "Wagyu Burger", orders: 1250, trend: "up" },
    { name: "Truffle Fries", orders: 1100, trend: "up" },
    { name: "Pan-Seared Salmon", orders: 850, trend: "up" },
    { name: "Margherita Pizza", orders: 720, trend: "down" },
  ],
  quarter: [
    { name: "Wagyu Burger", orders: 3800, trend: "up" },
    { name: "Truffle Fries", orders: 3200, trend: "up" },
    { name: "Crispy Calamari", orders: 2100, trend: "up" },
    { name: "Salmon Bowl", orders: 1950, trend: "down" },
  ],
  year: [
    { name: "Wagyu Burger", orders: 15400, trend: "up" },
    { name: "Truffle Fries", orders: 12800, trend: "up" },
    { name: "Pan-Seared Salmon", orders: 9200, trend: "up" },
    { name: "Crispy Calamari", orders: 8500, trend: "up" },
  ]
};

const COLORS = ["hsl(var(--primary))", "#fbbf24", "#10b981", "#6366f1", "#f43f5e"];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<keyof typeof REVENUE_DATA>("day");

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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm border-primary/10 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Total Revenue
                <DollarSign className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">
                ${REVENUE_DATA[timeframe].reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}
              </div>
              <p className="text-xs text-green-600 font-bold flex items-center mt-2">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +12.5% vs prev
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
              <div className="text-2xl font-bold">7 PM - 9 PM</div>
              <p className="text-xs text-blue-600 font-bold flex items-center mt-2">
                Dinner Rush Active
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
              <div className="text-2xl font-bold">$42.50</div>
              <p className="text-xs text-green-600 font-bold flex items-center mt-2">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +3% growth
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Table Turnover
                <Users className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">48 mins</div>
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
                <AreaChart data={REVENUE_DATA[timeframe]}>
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
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
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
                {(DISH_RANKING[timeframe]).map((dish, index) => (
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
                    data={[
                      { name: "Mains", value: 45 },
                      { name: "Starters", value: 25 },
                      { name: "Drinks", value: 20 },
                      { name: "Desserts", value: 10 },
                    ]}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {[0, 1, 2, 3].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
                <BarChart data={[
                  { hour: "12PM", count: 45 },
                  { hour: "2PM", count: 30 },
                  { hour: "4PM", count: 20 },
                  { hour: "6PM", count: 65 },
                  { hour: "8PM", count: 85 },
                  { hour: "10PM", count: 40 },
                ]}>
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
