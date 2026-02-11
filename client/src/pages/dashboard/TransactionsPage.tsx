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
import { useState, useEffect } from "react";
import { Search, Calendar, FileText, Download, Eye, Receipt, CreditCard, Utensils, Clock, Printer, Share2, Loader2, ChevronLeft, ChevronRight, Filter, ChevronsLeft, ChevronsRight, Bluetooth, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant, useExportTransactionsCSV } from "@/hooks/api";
import { useTransactions, useTransactionDetail } from "@/hooks/api";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { BillData } from "@/lib/thermal-printer-utils";
import { WhatsAppBillFormatter, validateIndianPhoneNumber } from "@/lib/whatsapp-bill";

export default function TransactionsPage() {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  
  // Thermal Printer
  const {
    isConnected: isPrinterConnected,
    isConnecting: isPrinterConnecting,
    isPrinting,
    connect: connectPrinter,
    disconnect: disconnectPrinter,
    printBill: printThermalBill,
    testPrint,
  } = useThermalPrinter(32); // 32 chars for 58mm, 48 for 80mm
  
  // WhatsApp Sharing
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  
  // Pagination & filters state
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Separate state for detail modal
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  
  const limit = 20;
  const offset = (page - 1) * limit;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset WhatsApp phone when dialog closes
  useEffect(() => {
    if (!isWhatsAppDialogOpen) {
      setWhatsappPhone('');
      setPhoneError('');
    }
  }, [isWhatsAppDialogOpen]);

  // Fetch lightweight list data
  const { data, isLoading } = useTransactions(restaurantId, {
    limit,
    offset,
    search: debouncedSearch,
    paymentMethod: paymentFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  // Only fetch full details when modal opens
  const { data: transactionDetail, isLoading: isDetailLoading } = useTransactionDetail(
    restaurantId,
    selectedTransactionId
  );

  const exportCSV = useExportTransactionsCSV(restaurantId);

  const currency = restaurant?.currency || "₹";
  const transactions = data?.transactions || [];
  const pagination = data?.pagination;

  const handleExportCSV = () => {
    exportCSV.mutate({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      paymentMethod: paymentFilter || undefined,
    });
  };

  const handlePrint = () => {
    window.print();
  };

// Updated prepareBillData function with logo support
// Add this to your TransactionsPage.tsx file

/**
 * Prepare bill data from transaction detail - Enhanced with logo support
 */
const prepareBillData = (): BillData | null => {
  if (!transactionDetail || !restaurant) {
    return null;
  }

  return {
    restaurant: {
      name: restaurant.name,
      addressLine1: restaurant.addressLine1,
      addressLine2: restaurant.addressLine2,
      city: restaurant.city,
      state: restaurant.state,
      postalCode: restaurant.postalCode,
      phone: restaurant.phoneNumber,
      email: restaurant.email,
      gstNumber: restaurant.gstNumber,
      fssaiNumber: restaurant.fssaiNumber,
      // Add logo support - fetch from restaurant settings
      logo: restaurant.settings?.logo ? {
        url: restaurant.settings.logo.url,
        type: restaurant.settings.logo.type,
      } : undefined,
    },
    bill: {
      billNumber: transactionDetail.billNumber,
      // Format date as DD/MM/YY to match receipt
      date: new Date(transactionDetail.paidAt).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
      }),
      // Format time as HH:MM to match receipt
      time: new Date(transactionDetail.paidAt).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      tableNumber: transactionDetail.order?.table?.tableNumber,
      guestName: transactionDetail.order?.guestName,
      waiterName: transactionDetail.order?.placedByStaff?.fullName,
      cashier: transactionDetail.order?.placedByStaff?.fullName || 'System',
      dineIn: transactionDetail.order?.table?.tableNumber || 'Takeaway',
    },
    items: transactionDetail.order?.items?.map(item => ({
      name: item.itemName,
      quantity: item.quantity,
      price: parseFloat(item.totalPrice) / item.quantity,
      total: parseFloat(item.totalPrice),
    })) || [],
    totals: {
      subtotal: parseFloat(transactionDetail.subtotal),
      gst: parseFloat(transactionDetail.gstAmount),
      cgst: parseFloat(transactionDetail.gstAmount) / 2,
      sgst: parseFloat(transactionDetail.gstAmount) / 2,
      serviceCharge: parseFloat(transactionDetail.serviceTaxAmount),
      discount: parseFloat(transactionDetail.discountAmount || '0'),
      roundOff: parseFloat(transactionDetail.roundOff || '0'),
      grandTotal: parseFloat(transactionDetail.grandTotal),
    },
    currency: currency,
    taxRateGst: parseFloat(restaurant.taxRateGst || '0'),
    taxRateService: parseFloat(restaurant.taxRateService || '0'),
  };
};

  /**
   * Print bill to thermal printer
   */
  const handleThermalPrint = async () => {
    const billData = prepareBillData();
    if (!billData) {
      toast.error('Bill data not available');
      return;
    }

    if (!isPrinterConnected) {
      toast.error('Printer not connected. Please connect your thermal printer first.');
      return;
    }

    try {
      await printThermalBill(billData);
    } catch (error) {
      console.error('Thermal print error:', error);
    }
  };

  /**
   * Share bill via WhatsApp
   */
  const handleWhatsAppShare = () => {
    const billData = prepareBillData();
    if (!billData) {
      toast.error('Bill data not available');
      return;
    }

    // Validate phone number
    const validation = validateIndianPhoneNumber(whatsappPhone);
    if (!validation.valid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }

    setPhoneError('');

    try {
      const formatter = new WhatsAppBillFormatter({ width: 40 });
      formatter.shareViaWhatsApp(validation.formatted!, billData);
      
      toast.success('Opening WhatsApp...');
      setIsWhatsAppDialogOpen(false);
      setWhatsappPhone('');
    } catch (error) {
      console.error('WhatsApp share error:', error);
      toast.error('Failed to open WhatsApp');
    }
  };

  /**
   * Preview WhatsApp bill format
   */
  const getWhatsAppBillPreview = (): string => {
    const billData = prepareBillData();
    if (!billData) return '';

    const formatter = new WhatsAppBillFormatter({ width: 40 });
    return formatter.formatBill(billData);
  };

  const handleShare = async () => {
    if (!transactionDetail) return;
    
    const billContent = `
Bill Number: ${transactionDetail.billNumber}
Date: ${new Date(transactionDetail.paidAt).toLocaleString()}
Payment Method: ${transactionDetail.paymentMethod}
Total: ${currency}${parseFloat(transactionDetail.grandTotal).toFixed(2)}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill ${transactionDetail.billNumber}`,
          text: billContent,
        });
        toast.success("Bill shared successfully");
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(billContent);
      toast.success("Bill details copied to clipboard");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setPaymentFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasActiveFilters = searchTerm || paymentFilter || fromDate || toDate;

  // Render bill modal with lazy-loaded details
  const BillDetailModal = () => {
    if (!isBillDialogOpen || !selectedTransactionId) return null;

    return (
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Receipt className="w-5 h-5 text-primary shrink-0" />
            {isDetailLoading ? (
              "Loading..."
            ) : (
              <span className="truncate">Bill - {transactionDetail?.billNumber || ""}</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Full itemized breakdown and transaction info.
          </DialogDescription>
        </DialogHeader>
        
        {isDetailLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transactionDetail ? (
          <>
            <ScrollArea className="flex-1 px-4 sm:px-6">
              <div className="py-4 space-y-4 sm:space-y-5">
                {/* Bill Info Grid */}
                <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 sm:p-4 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                      <Utensils className="w-3 h-3" /> Table
                    </p>
                    <p className="font-bold text-sm sm:text-base truncate">
                      {transactionDetail.order?.table?.tableNumber ? `T${transactionDetail.order.table.tableNumber}` : transactionDetail.order?.guestName || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Date
                    </p>
                    <p className="font-semibold text-xs sm:text-sm">{new Date(transactionDetail.paidAt).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Method
                    </p>
                    <Badge className="font-semibold text-xs">{transactionDetail.paymentMethod}</Badge>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground tracking-wider">Status</p>
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">PAID</Badge>
                  </div>
                </div>

                {/* Ordered Items */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    Ordered Items
                  </h4>
                  <div className="space-y-2">
                    {transactionDetail.order?.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-start gap-3 text-sm p-2.5 rounded-md hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="text-muted-foreground font-mono text-sm shrink-0">{currency}{parseFloat(item.totalPrice).toFixed(2)}</span>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No items found
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono font-medium">{currency}{parseFloat(transactionDetail.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST & Service Tax</span>
                    <span className="font-mono font-medium">{currency}{(parseFloat(transactionDetail.gstAmount) + parseFloat(transactionDetail.serviceTaxAmount)).toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-base sm:text-lg">Grand Total</span>
                    <span className="font-bold text-xl sm:text-2xl text-primary font-mono">{currency}{parseFloat(transactionDetail.grandTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <Separator />
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6 pt-3">
              <Button variant="outline" className="flex-1 gap-2 h-9 sm:h-10 text-sm" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> PDF Print
              </Button>
              <Button 
                variant={isPrinterConnected ? "default" : "outline"} 
                className="flex-1 gap-2 h-9 sm:h-10 text-sm" 
                onClick={handleThermalPrint}
                disabled={isPrinting || !isPrinterConnected}
              >
                {isPrinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                {isPrinterConnected ? 'Print Bill' : 'Connect Printer'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2 h-9 sm:h-10 text-sm bg-green-50 hover:bg-green-100 text-green-700 border-green-200" 
                onClick={() => {
                  setIsBillDialogOpen(false);
                  setTimeout(() => setIsWhatsAppDialogOpen(true), 100);
                }}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Transaction not found
          </div>
        )}
      </DialogContent>
    );
  };

  if (isLoading && !data) {
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
          <p className="text-sm sm:text-base text-muted-foreground">
            Detailed history of all bills and payments.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Thermal Printer Connection Button */}
          <Button 
            variant={isPrinterConnected ? "default" : "outline"}
            className="gap-2 flex-1 sm:flex-initial h-9 sm:h-10"
            onClick={isPrinterConnected ? disconnectPrinter : connectPrinter}
            disabled={isPrinterConnecting}
          >
            {isPrinterConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bluetooth className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isPrinterConnected ? 'Printer Connected' : 'Connect Printer'}
            </span>
            <span className="sm:hidden">
              {isPrinterConnected ? 'Connected' : 'Printer'}
            </span>
          </Button>
          
          <Button 
            variant="outline" 
            className="gap-2 flex-1 sm:flex-initial h-9 sm:h-10"
            onClick={handleExportCSV}
            disabled={exportCSV.isPending}
          >
            {exportCSV.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Printer Status Banner */}
      {isPrinterConnected && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">
                Thermal printer connected and ready
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={testPrint}
              disabled={isPrinting}
              className="h-7 text-xs"
            >
              Test Print
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> 
                  <span className="hidden sm:inline">
                    All Bills ({pagination?.total || 0})
                  </span>
                  <span className="sm:hidden">Bills ({pagination?.total || 0})</span>
                </CardTitle>
                
                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search bills, table, guest..." 
                    className="pl-9 h-9 sm:h-10 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Date Range */}
                <div className="flex gap-2 flex-1">
                  <div className="flex-1">
                    <Input
                      type="date"
                      placeholder="From date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setPage(1);
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="date"
                      placeholder="To date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setPage(1);
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Payment Method Filter */}
                <Select
                  value={paymentFilter}
                  onValueChange={(value) => {
                    setPaymentFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="WALLET">Wallet</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 text-sm"
                  >
                    Clear
                  </Button>
                )}
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
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        {hasActiveFilters ? "No transactions found matching your filters." : "No transactions found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
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
                            open={isBillDialogOpen && selectedTransactionId === transaction.id} 
                            onOpenChange={(open) => {
                              setIsBillDialogOpen(open);
                              if (!open) setSelectedTransactionId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-2 text-xs"
                                onClick={() => {
                                  setSelectedTransactionId(transaction.id);
                                  setIsBillDialogOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" /> View
                              </Button>
                            </DialogTrigger>
                            <BillDetailModal />
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 px-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                  {hasActiveFilters ? "No transactions found matching your filters." : "No transactions found."}
                </div>
              ) : (
                transactions.map((transaction) => (
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
                        open={isBillDialogOpen && selectedTransactionId === transaction.id} 
                        onOpenChange={(open) => {
                          setIsBillDialogOpen(open);
                          if (!open) setSelectedTransactionId(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full gap-2 h-8 text-xs"
                            onClick={() => {
                              setSelectedTransactionId(transaction.id);
                              setIsBillDialogOpen(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" /> View Full Details
                          </Button>
                        </DialogTrigger>
                        <BillDetailModal />
                      </Dialog>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Enhanced Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-0 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {offset + 1} to {Math.min(offset + limit, pagination.total)} of {pagination.total} transactions
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    {/* First Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1 || isLoading}
                      className="h-8 w-8 p-0 hidden sm:flex"
                      title="First page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    
                    {/* Previous Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || isLoading}
                      className="h-8"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>
                    
                    {/* Page Numbers (Desktop) */}
                    <div className="hidden md:flex items-center gap-1">
                      {(() => {
                        const pages = [];
                        const totalPages = pagination.totalPages;
                        const currentPage = pagination.currentPage;
                        
                        // Always show first page
                        if (currentPage > 3) {
                          pages.push(
                            <Button
                              key={1}
                              variant={1 === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(1)}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                            >
                              1
                            </Button>
                          );
                          if (currentPage > 4) {
                            pages.push(<span key="ellipsis1" className="px-1 text-muted-foreground">...</span>);
                          }
                        }
                        
                        // Show pages around current page
                        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={i === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(i)}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                            >
                              {i}
                            </Button>
                          );
                        }
                        
                        // Always show last page
                        if (currentPage < totalPages - 2) {
                          if (currentPage < totalPages - 3) {
                            pages.push(<span key="ellipsis2" className="px-1 text-muted-foreground">...</span>);
                          }
                          pages.push(
                            <Button
                              key={totalPages}
                              variant={totalPages === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(totalPages)}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                            >
                              {totalPages}
                            </Button>
                          );
                        }
                        
                        return pages;
                      })()}
                    </div>
                    
                    {/* Mobile page indicator */}
                    <div className="md:hidden flex items-center gap-1">
                      <span className="text-sm font-medium">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                    </div>
                    
                    {/* Next Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasMore || isLoading}
                      className="h-8"
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    
                    {/* Last Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={page === pagination.totalPages || isLoading}
                      className="h-8 w-8 p-0 hidden sm:flex"
                      title="Last page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Jump to page (Desktop) */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Label htmlFor="page-jump" className="text-xs text-muted-foreground whitespace-nowrap">
                      Go to:
                    </Label>
                    <Input
                      id="page-jump"
                      type="number"
                      min={1}
                      max={pagination.totalPages}
                      placeholder="Page"
                      className="h-8 w-16 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = parseInt(e.currentTarget.value);
                          if (value >= 1 && value <= pagination.totalPages) {
                            setPage(value);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Share Dialog */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <MessageCircle className="w-5 h-5 text-green-600 shrink-0" />
              Share Bill via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter the customer's WhatsApp number to share the GST-compliant bill
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6">
            <div className="space-y-4 py-4">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone" className="text-sm font-medium">WhatsApp Number</Label>
                <div className="relative">
                  <Input
                    id="whatsapp-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={whatsappPhone}
                    onChange={(e) => {
                      // Allow only numbers, plus, and limit length
                      const value = e.target.value.replace(/[^\d+]/g, '');
                      if (value.length <= 13) { // +91 + 10 digits
                        setWhatsappPhone(value);
                        setPhoneError('');
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow Enter to submit
                      if (e.key === 'Enter' && whatsappPhone) {
                        handleWhatsAppShare();
                      }
                    }}
                    className={phoneError ? 'border-red-500' : ''}
                    autoComplete="tel"
                  />
                </div>
                {phoneError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span className="text-xs">⚠️</span> {phoneError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Examples: 9876543210, +919876543210, 919876543210
                </p>
              </div>

              {/* Bill Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bill Preview</Label>
                <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/30 p-3 sm:p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {getWhatsAppBillPreview()}
                  </pre>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  This is how the bill will appear in WhatsApp
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsWhatsAppDialogOpen(false)}
              className="flex-1 sm:flex-initial h-9 sm:h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWhatsAppShare}
              disabled={!whatsappPhone || whatsappPhone.length < 10}
              className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial h-9 sm:h-10"
            >
              <Send className="w-4 h-4" />
              Send via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}