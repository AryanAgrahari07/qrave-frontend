import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTables } from "@/hooks/api";
import { 
  useDashboardSummary, 
  // useTableStats, 
  useOrderStats, 
  useQueueStats,
  useScanActivity,
  useRecentOrders,
} from "@/hooks/api.ts";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Users, DollarSign, Utensils, Clock, ShoppingCart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Table } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardPage() {
  const { restaurantId } = useAuth();
  const isMobile = useIsMobile();

  // Option 1: Use single summary endpoint (more efficient)
  const { data: summary, isLoading, isError, error } = useDashboardSummary(restaurantId);
  
  // Option 2: Use individual endpoints (more flexible)
  // const { data: tableStats, isLoading: tablesLoading } = useTableStats(restaurantId);
  // const { data: orderStats, isLoading: ordersLoading } = useOrderStats(restaurantId);
  // const { data: queueStats, isLoading: queueLoading } = useQueueStats(restaurantId);
  // const { data: scanActivity, isLoading: scanLoading } = useScanActivity(restaurantId);
  // const { data: recentOrders, isLoading: recentLoading } = useRecentOrders(restaurantId, 5);
  
  // Get full table details for the grid
  const { data: tables } = useTables(restaurantId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-600 font-semibold">Error loading dashboard</p>
            <p className="text-muted-foreground text-sm mt-2">{error?.message || "Unknown error"}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!summary) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">No dashboard data available</p>
        </div>
      </DashboardLayout>
    );
  }

  const { tableStats, orderStats, queueStats, scanActivity, recentOrders } = summary;

  return (
    <DashboardLayout>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 sm:mb-8">
        <StatsCard 
          title="Total Orders" 
          value={orderStats.totalOrders.toString()} 
          icon={ShoppingCart} 
          trend={`${orderStats.pendingOrders} pending, ${orderStats.preparingOrders} preparing`} 
        />
        <StatsCard 
          title="Active Tables" 
          value={`${tableStats.occupied_tables}/${tableStats.total_tables}`} 
          icon={Users} 
          trend={`${tableStats.occupancy_rate}% occupancy`} 
        />
        <StatsCard 
          title="Queue Waiting" 
          value={queueStats.totalWaiting.toString()} 
          icon={Clock} 
          trend={queueStats.avgWaitTime > 0 ? `Avg: ${queueStats.avgWaitTime} min wait` : "No wait time"} 
        />
        <StatsCard 
          title="Today's Revenue" 
          value={`₹${parseFloat(orderStats.totalRevenue).toLocaleString()}`} 
          icon={DollarSign} 
          trend={`Avg: ₹${parseFloat(orderStats.avgOrderValue).toFixed(0)}/order`} 
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-7">
        <Card className="shadow-sm md:col-span-4">
          <CardHeader>
            <CardTitle>Weekly Scan Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:pl-2">
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
              <BarChart data={scanActivity} margin={isMobile ? { top: 4, right: 8, left: -12, bottom: 0 } : { top: 8, right: 12, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  tickLine={false} 
                  axisLine={false} 
                  interval={0}
                  tick={{ fill: "#888888", fontSize: isMobile ? 10 : 12 }}
                />
                <YAxis 
                  stroke="#888888" 
                  tickLine={false} 
                  axisLine={false} 
                  width={isMobile ? 28 : 40}
                  tick={{ fill: "#888888", fontSize: isMobile ? 10 : 12 }}
                  tickFormatter={(value) => `${value}`} 
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                />
                <Bar 
                  dataKey="scans" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  barSize={isMobile ? 18 : 28}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm md:col-span-3">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle>Live Tables</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
            {tables && tables.length > 0 ? (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                  {tables.slice(0, 16).map((table: Table) => (
                    <div 
                      key={table.id} 
                      className={cn(
                        "aspect-square rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer hover:scale-[1.02] sm:hover:scale-105", 
                        table.currentStatus === "OCCUPIED" 
                          ? "bg-red-100 border-red-200 text-red-600" 
                          : table.currentStatus === "RESERVED"
                          ? "bg-yellow-100 border-yellow-200 text-yellow-600"
                          : table.currentStatus === "BLOCKED"
                          ? "bg-gray-100 border-gray-200 text-gray-600"
                          : "bg-green-100 border-green-200 text-green-600"
                      )}
                      title={`Table ${table.tableNumber} - ${table.currentStatus}`}
                    >
                      {table.tableNumber}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-6 text-xs sm:text-sm text-muted-foreground justify-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded" /> 
                    Available ({tableStats.available_tables})
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded" /> 
                    Occupied ({tableStats.occupied_tables})
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded" /> 
                    Reserved ({tableStats.reserved_tables})
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No tables configured</p>
                <p className="text-sm">Add tables in Floor Map</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Section */}
      {recentOrders && recentOrders.length > 0 && (
        <Card className="mt-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      order.status === "PENDING" ? "bg-yellow-500" :
                      order.status === "PREPARING" ? "bg-blue-500" :
                      order.status === "SERVED" ? "bg-green-500" :
                      order.status === "PAID" ? "bg-gray-500" : "bg-red-500"
                    )} />
                    <div>
                      <p className="font-medium text-sm">
                        {order.table?.tableNumber 
                          ? `Table ${order.table.tableNumber}` 
                          : order.guestName || `Order #${order.id.slice(-6)}`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} items • {order.orderType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{parseFloat(order.totalAmount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {order.status.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!recentOrders || recentOrders.length === 0) && (
        <Card className="mt-6 shadow-sm">
          <CardContent className="py-10">
            <div className="text-center text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No recent orders</p>
              <p className="text-sm">Orders will appear here as they come in</p>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType; 
  trend: string;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
        <CardTitle className="text-[11px] leading-4 sm:text-sm font-medium text-muted-foreground truncate pr-2">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        <div className="text-lg sm:text-2xl font-bold font-heading leading-tight break-words">
          {value}
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 break-words">
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}