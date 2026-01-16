
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_ORDERS } from "@/lib/mockData";
import { CheckCircle2, Clock, Utensils, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LiveOrdersPage() {
  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Live Orders</h2>
          <p className="text-muted-foreground">Monitor and manage active orders from tables.</p>
        </div>
        <Button className="shadow-lg shadow-primary/20">
          Place Manual Order
        </Button>
      </div>

      <div className="grid gap-6">
        {MOCK_ORDERS.map((order) => (
          <Card key={order.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold font-heading">Table {order.table}</span>
                    <Badge variant={order.status === "PENDING" ? "destructive" : order.status === "PREPARING" ? "secondary" : "outline"} className="capitalize">
                      {order.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {order.time} • ID: {order.id}
                  </p>
                </div>

                <div className="flex-1 md:px-8">
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-sm bg-muted px-2 py-1 rounded-md border border-border">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Total Amount</p>
                    <p className="text-xl font-bold font-heading text-primary">${order.total}</p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "PENDING" && (
                      <Button size="sm">Accept Order</Button>
                    )}
                    {order.status === "PREPARING" && (
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        Mark Served
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
