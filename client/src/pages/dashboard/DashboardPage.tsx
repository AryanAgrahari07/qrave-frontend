
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_STATS } from "@/lib/mockData";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Users, QrCode, DollarSign, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

const DATA = [
  { name: "Mon", scans: 120 },
  { name: "Tue", scans: 145 },
  { name: "Wed", scans: 132 },
  { name: "Thu", scans: 198 },
  { name: "Fri", scans: 245 },
  { name: "Sat", scans: 310 },
  { name: "Sun", scans: 280 },
];

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard title="Total Scans" value={MOCK_STATS.scansWeek} icon={QrCode} trend="+12% from last week" />
        <StatsCard title="Active Tables" value={`${MOCK_STATS.activeTables}/${MOCK_STATS.totalTables}`} icon={Users} trend="60% occupancy" />
        <StatsCard title="Top Dish" value={MOCK_STATS.mostPopular} icon={Utensils} trend="45 orders today" />
        <StatsCard title="Est. Revenue" value="$2,340" icon={DollarSign} trend="+8% from yesterday" />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Scan Activity</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={DATA}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Live Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-sm font-bold border-2 transition-all cursor-pointer hover:scale-105",
                    i % 3 === 0 ? "bg-red-100 border-red-200 text-red-600" : "bg-green-100 border-green-200 text-green-600"
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6 text-sm text-muted-foreground justify-center">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded" /> Free</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded" /> Occupied</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatsCard({ title, value, icon: Icon, trend }: any) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-heading">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
