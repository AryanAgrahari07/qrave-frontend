
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
import { Search, Calendar, FileText, Download, Eye, Receipt, CreditCard, Utensils, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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
                    <TableHead className="font-bold">Payment</TableHead>
                    <TableHead className="font-bold text-right">Total Amount</TableHead>
                    <TableHead className="font-bold text-right">Action</TableHead>
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
                      <TableCell>
                        <Badge variant="secondary" className="font-bold text-[10px]">
                          {transaction.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-primary">
                        ${transaction.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="w-4 h-4" /> View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-primary" />
                                Bill Details - {transaction.id}
                              </DialogTitle>
                              <DialogDescription>Full itemized breakdown and transaction info.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-6">
                              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                    <Utensils className="w-3 h-3" /> Table
                                  </p>
                                  <p className="font-bold text-lg">{transaction.table}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Date
                                  </p>
                                  <p className="font-bold">{new Date(transaction.date).toLocaleDateString()}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> Method
                                  </p>
                                  <Badge className="font-bold">{transaction.method}</Badge>
                                </div>
                                <div className="space-y-1 text-right">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</p>
                                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">{transaction.status}</Badge>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                  Ordered Items
                                </h4>
                                <ScrollArea className="max-h-[200px] pr-4">
                                  <div className="space-y-2">
                                    {transaction.items.map((item, i) => (
                                      <div key={i} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                                        <div className="flex items-center gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                          <span className="font-medium">{item}</span>
                                        </div>
                                        <span className="text-muted-foreground font-mono">1 x $??.??</span>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span className="font-mono font-medium">${transaction.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">GST & Service Tax</span>
                                  <span className="font-mono font-medium">${transaction.tax.toFixed(2)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-lg">Grand Total</span>
                                  <span className="font-bold text-2xl text-primary font-mono">${transaction.total.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1">Print Bill</Button>
                              <Button className="flex-1">Share PDF</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
