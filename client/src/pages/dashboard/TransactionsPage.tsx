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
import { Search, Calendar, FileText, Download, Eye, Receipt, CreditCard, Utensils, Clock, Printer, Share2, Loader2 } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { useTransactions, useRestaurant } from "@/hooks/api";
import { toast } from "sonner";

export default function TransactionsPage() {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: transactions, isLoading } = useTransactions(restaurantId, { limit: 100 });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);

  const currency = restaurant?.currency || "₹";

  const filteredTransactions = (transactions || []).filter((t: any) => 
    t.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.order?.table?.tableNumber?.toString().includes(searchTerm) ||
    t.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!selectedTransaction) return;
    
    const billContent = `
Bill Number: ${selectedTransaction.billNumber}
Date: ${new Date(selectedTransaction.paidAt).toLocaleString()}
Payment Method: ${selectedTransaction.paymentMethod}
Total: ${currency}${parseFloat(selectedTransaction.grandTotal).toFixed(2)}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill ${selectedTransaction.billNumber}`,
          text: billContent,
        });
        toast.success("Bill shared successfully");
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(billContent);
      toast.success("Bill details copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold">Transaction Records</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Detailed history of all bills and payments.</p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto h-9 sm:h-10">
          <Download className="w-4 h-4" /> 
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> 
                <span className="hidden sm:inline">All Bills ({filteredTransactions.length})</span>
                <span className="sm:hidden">Bills ({filteredTransactions.length})</span>
              </CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search bills..." 
                  className="pl-9 h-9 sm:h-10 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-xs">Bill ID</TableHead>
                    <TableHead className="font-bold text-xs">Date & Time</TableHead>
                    <TableHead className="font-bold text-xs">Table</TableHead>
                    <TableHead className="font-bold text-xs">Payment</TableHead>
                    <TableHead className="font-bold text-xs text-right">Total Amount</TableHead>
                    <TableHead className="font-bold text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction: any) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium text-primary text-sm">
                        {transaction.billNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{new Date(transaction.paidAt).toLocaleDateString()}</span>
                          <span className="text-xs text-muted-foreground">{new Date(transaction.paidAt).toLocaleTimeString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-sm">
                        {transaction.order?.table?.tableNumber ? `Table ${transaction.order.table.tableNumber}` : transaction.order?.guestName || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold text-[10px]">
                          {transaction.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono text-primary text-sm">
                        {currency}{parseFloat(transaction.grandTotal).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog 
                          open={isBillDialogOpen && selectedTransaction?.id === transaction.id} 
                          onOpenChange={(open) => {
                            setIsBillDialogOpen(open);
                            if (!open) setSelectedTransaction(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-2 text-xs"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setIsBillDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" /> View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                                <Receipt className="w-5 h-5 text-primary" />
                                Bill - {transaction.billNumber}
                              </DialogTitle>
                              <DialogDescription className="text-xs sm:text-sm">Full itemized breakdown and transaction info.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4 sm:space-y-6">
                              <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-muted/30 p-3 sm:p-4 rounded-lg">
                                <div className="space-y-1">
                                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                    <Utensils className="w-3 h-3" /> Table
                                  </p>
                                  <p className="font-bold text-base sm:text-lg truncate">
                                    {transaction.order?.table?.tableNumber ? `T${transaction.order.table.tableNumber}` : transaction.order?.guestName || "N/A"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Date
                                  </p>
                                  <p className="font-bold text-xs sm:text-sm">{new Date(transaction.paidAt).toLocaleDateString()}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> Method
                                  </p>
                                  <Badge className="font-bold text-xs">{transaction.paymentMethod}</Badge>
                                </div>
                                <div className="space-y-1 text-right">
                                  <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</p>
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">PAID</Badge>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2">
                                  Ordered Items
                                </h4>
                                <ScrollArea className="max-h-[150px] sm:max-h-[200px] pr-2 sm:pr-4">
                                  <div className="space-y-2">
                                    {transaction.order?.items?.map((item: any, i: number) => (
                                      <div key={i} className="flex justify-between items-center text-xs sm:text-sm p-2 rounded-md hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                          <span className="font-medium truncate">{item.itemName} x {item.quantity}</span>
                                        </div>
                                        <span className="text-muted-foreground font-mono text-xs sm:text-sm ml-2">{currency}{parseFloat(item.totalPrice).toFixed(2)}</span>
                                      </div>
                                    )) || (
                                      <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">
                                        No items found
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <div className="flex justify-between text-xs sm:text-sm">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span className="font-mono font-medium">{currency}{parseFloat(transaction.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm">
                                  <span className="text-muted-foreground">GST & Service Tax</span>
                                  <span className="font-mono font-medium">{currency}{(parseFloat(transaction.gstAmount) + parseFloat(transaction.serviceTaxAmount)).toFixed(2)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-base sm:text-lg">Grand Total</span>
                                  <span className="font-bold text-xl sm:text-2xl text-primary font-mono">{currency}{parseFloat(transaction.grandTotal).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                              <Button variant="outline" className="flex-1 gap-2 h-9 sm:h-10 text-sm" onClick={handlePrint}>
                                <Printer className="w-4 h-4" /> Print
                              </Button>
                              <Button className="flex-1 gap-2 h-9 sm:h-10 text-sm" onClick={handleShare}>
                                <Share2 className="w-4 h-4" /> Share
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {searchTerm ? "No transactions found matching your search." : "No transactions found."}
                </div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 px-4">
              {filteredTransactions.map((transaction: any) => (
                <Card key={transaction.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-bold text-primary text-sm truncate">{transaction.billNumber}</p>
                        <p className="text-xs text-muted-foreground">{new Date(transaction.paidAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(transaction.paidAt).toLocaleTimeString()}</p>
                      </div>
                      <Badge variant="secondary" className="font-bold text-[10px] shrink-0 ml-2">
                        {transaction.paymentMethod}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {transaction.order?.table?.tableNumber ? `Table ${transaction.order.table.tableNumber}` : transaction.order?.guestName || "N/A"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold font-mono text-primary text-base">{currency}{parseFloat(transaction.grandTotal).toFixed(2)}</p>
                      </div>
                    </div>

                    <Dialog 
                      open={isBillDialogOpen && selectedTransaction?.id === transaction.id} 
                      onOpenChange={(open) => {
                        setIsBillDialogOpen(open);
                        if (!open) setSelectedTransaction(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full gap-2 h-8 text-xs"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setIsBillDialogOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" /> View Full Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-xl">
                            <Receipt className="w-5 h-5 text-primary" />
                            <span className="truncate">Bill - {transaction.billNumber}</span>
                          </DialogTitle>
                          <DialogDescription className="text-xs">Full itemized breakdown and transaction info.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg">
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                <Utensils className="w-3 h-3" /> Table
                              </p>
                              <p className="font-bold text-base truncate">
                                {transaction.order?.table?.tableNumber ? `T${transaction.order.table.tableNumber}` : transaction.order?.guestName || "N/A"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Date
                              </p>
                              <p className="font-bold text-xs">{new Date(transaction.paidAt).toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> Method
                              </p>
                              <Badge className="font-bold text-xs">{transaction.paymentMethod}</Badge>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Status</p>
                              <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">PAID</Badge>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-bold text-xs flex items-center gap-2">
                              Ordered Items
                            </h4>
                            <ScrollArea className="max-h-[150px] pr-2">
                              <div className="space-y-2">
                                {transaction.order?.items?.map((item: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-xs p-2 rounded-md hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                      <span className="font-medium truncate">{item.itemName} x {item.quantity}</span>
                                    </div>
                                    <span className="text-muted-foreground font-mono text-xs ml-2">{currency}{parseFloat(item.totalPrice).toFixed(2)}</span>
                                  </div>
                                )) || (
                                  <div className="text-center py-4 text-muted-foreground text-xs">
                                    No items found
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-mono font-medium">{currency}{parseFloat(transaction.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">GST & Service Tax</span>
                              <span className="font-mono font-medium">{currency}{(parseFloat(transaction.gstAmount) + parseFloat(transaction.serviceTaxAmount)).toFixed(2)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-base">Grand Total</span>
                              <span className="font-bold text-xl text-primary font-mono">{currency}{parseFloat(transaction.grandTotal).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" className="flex-1 gap-2 h-9 text-sm" onClick={handlePrint}>
                            <Printer className="w-4 h-4" /> Print
                          </Button>
                          <Button className="flex-1 gap-2 h-9 text-sm" onClick={handleShare}>
                            <Share2 className="w-4 h-4" /> Share
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  {searchTerm ? "No transactions found matching your search." : "No transactions found."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}