
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, ArrowUpRight, ArrowDownRight, MousePointer2, Clock, Users } from "lucide-react";

const SCAN_DATA = [
  { time: "8 AM", scans: 12 },
  { time: "10 AM", scans: 25 },
  { time: "12 PM", scans: 85 },
  { time: "2 PM", scans: 64 },
  { time: "4 PM", scans: 42 },
  { time: "6 PM", scans: 95 },
  { time: "8 PM", scans: 120 },
  { time: "10 PM", scans: 45 },
];

const DISH_DATA = [
  { name: "Burger", value: 400 },
  { name: "Pasta", value: 300 },
  { name: "Pizza", value: 300 },
  { name: "Salad", value: 200 },
];

const COLORS = ["hsl(var(--primary))", "#fbbf24", "#10b981", "#6366f1"];

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Analytics</h2>
          <p className="text-muted-foreground">Deep insights into your restaurant's performance.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Peak Scan Time
                <Clock className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8:00 PM - 9:00 PM</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <ArrowUpRight className="w-3 h-3 mr-1" /> High engagement window
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Table Turnover
                <TrendingUp className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42 mins</div>
              <p className="text-xs text-red-600 flex items-center mt-1">
                <ArrowDownRight className="w-3 h-3 mr-1" /> 5% slower than last week
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Menu Conversion
                <MousePointer2 className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <ArrowUpRight className="w-3 h-3 mr-1" /> Scans to interactions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Traffic</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SCAN_DATA}>
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="scans" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScans)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Popularity</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DISH_DATA}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {DISH_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {DISH_DATA.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
