
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Calendar, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_TRANSACTIONS = [
  {
    id: "INV-8492",
    date: "2026-01-17T10:30:00",
    table: "5",
    items: ["Wagyu Burger", "Truffle Fries", "Coke"],
    subtotal: 36.00,
    tax: 5.40,
    total: 41.40,
    method: "UPI",
    status: "PAID"
  },
  {
    id: "INV-2931",
    date: "2026-01-17T11:15:00",
    table: "2",
    items: ["Crispy Calamari", "Iced Tea"],
    subtotal: 20.00,
    tax: 3.00,
    total: 23.00,
    method: "CASH",
    status: "PAID"
  },
  {
    id: "INV-7742",
    date: "2026-01-17T12:05:00",
    table: "8",
    items: ["Pan-Seared Salmon", "Garden Salad", "Red Wine"],
    subtotal: 52.00,
    tax: 7.80,
    total: 59.80,
    method: "CARD",
    status: "PAID"
  },
  {
    id: "INV-1039",
    date: "2026-01-16T20:45:00",
    table: "4",
    items: ["Margherita Pizza", "Garlic Bread"],
    subtotal: 28.00,
    tax: 4.20,
    total: 32.20,
    method: "UPI",
    status: "PAID"
  }
];

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = MOCK_TRANSACTIONS.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.table.includes(searchTerm) ||
    t.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Transaction Records</h2>
          <p className="text-muted-foreground">Detailed history of all bills and payments.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> All Bills
              </CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by ID, Table or Method..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Bill ID</TableHead>
                    <TableHead className="font-bold">Date & Time</TableHead>
                    <TableHead className="font-bold">Table</TableHead>
                    <TableHead className="font-bold">Items Ordered</TableHead>
                    <TableHead className="font-bold">Payment</TableHead>
                    <TableHead className="font-bold text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium text-primary">
                        {transaction.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{new Date(transaction.date).toLocaleDateString()}</span>
                          <span className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleTimeString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">Table {transaction.table}</TableCell>
                      <TableCell className="max-w-[250px]">
                        <div className="flex flex-wrap gap-1">
                          {transaction.items.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] font-normal px-1 py-0 h-4">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold text-[10px]">
                          {transaction.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-primary">
                        ${transaction.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No transactions found matching your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
