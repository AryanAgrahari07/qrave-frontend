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
import { useState, useCallback, useEffect, useMemo } from "react";
import { Search, Calendar, FileText, Download, Eye, Receipt, CreditCard, Utensils, Clock, Printer, Share2, Loader2, ChevronLeft, ChevronRight, Filter, ChevronsLeft, ChevronsRight, MessageCircle, Send, MinusCircle, X } from "lucide-react";
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
import { useRestaurant, useExportTransactionsCSV, useRestaurantLogo } from "@/hooks/api";
import { useTransactions, useTransactionDetail, useRemoveOrderServiceCharge } from "@/hooks/api";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { BillData } from "@/lib/thermal-printer-utils";
import { WhatsAppBillFormatter, validateIndianPhoneNumber } from "@/lib/whatsapp-bill";
import { jsPDF } from "jspdf";
import { subDays, format, isBefore, startOfDay } from "date-fns";

function mergeSameOrderItems<T extends { itemName: string; quantity: number; totalPrice: string }>(
  items: (T & {
    unitPrice?: string | number;
    variantName?: string | null;
    selectedModifiers?: any;
    notes?: string | null;
  })[] = [],
): (T & { quantity: number; totalPrice: string })[] {
  const map = new Map<string, any>();

  for (const it of items) {
    const qty = Number(it.quantity || 0);
    const total = Number(it.totalPrice || 0);
    const unit = it.unitPrice !== undefined ? Number(it.unitPrice) : qty ? total / qty : 0;

    const key = [
      it.itemName,
      unit.toFixed(2),
      it.variantName ?? "",
      // modifiers/customizations: stable stringify
      it.selectedModifiers ? JSON.stringify(it.selectedModifiers) : "",
      it.notes ?? "",
    ].join("|");

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...it,
        quantity: qty,
        totalPrice: total.toFixed(2),
      });
    } else {
      existing.quantity += qty;
      existing.totalPrice = (Number(existing.totalPrice) + total).toFixed(2);
    }
  }

  return Array.from(map.values());
}

export default function TransactionsPage() {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: restaurantLogo } = useRestaurantLogo(restaurantId);

  // Thermal Printer
  const {
    isConnected: isPrinterConnected,
    isPrinting,
    printBill: printThermalBill,
  } = useThermalPrinter(32); // connection handled globally (Dashboard sidebar)

  // WhatsApp Sharing
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Pagination & filters state
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Separate state for detail modal
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);

  // Export Dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportOption, setExportOption] = useState<string>("current");
  const [customExportStart, setCustomExportStart] = useState("");
  const [customExportEnd, setCustomExportEnd] = useState("");

  const limit = 20;
  const offset = (page - 1) * limit;

  // Debounce search removed: user wants explicit search trigger
  const handleSearchSubmit = useCallback(() => {
    setDebouncedSearch(searchTerm);
    setPage(1);
  }, [searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
  }, []);

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
    orderType: orderTypeFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  // Only fetch full details when modal opens
  const {
    data: transactionDetail,
    isLoading: isDetailLoading,
    refetch: refetchTransactionDetail,
  } = useTransactionDetail(restaurantId, selectedTransactionId);

  const removeServiceCharge = useRemoveOrderServiceCharge(restaurantId);

  const exportCSV = useExportTransactionsCSV(restaurantId);

  const currency = useMemo(() => restaurant?.currency || "₹", [restaurant?.currency]);
  const transactions = data?.transactions || [];
  const pagination = data?.pagination;

  const handleExportCSV = () => {
    let exportFromDate = undefined;
    let exportToDate = undefined;

    const today = new Date();

    switch (exportOption) {
      case "current":
        exportFromDate = fromDate || undefined;
        exportToDate = toDate || undefined;
        break;
      case "7days":
        exportFromDate = format(subDays(today, 7), 'yyyy-MM-dd');
        break;
      case "30days":
        exportFromDate = format(subDays(today, 30), 'yyyy-MM-dd');
        break;
      case "90days":
        exportFromDate = format(subDays(today, 90), 'yyyy-MM-dd');
        break;
      case "custom":
        if (!customExportStart || !customExportEnd) {
          toast.error("Please select both start and end dates");
          return;
        }
        
        const startDate = new Date(customExportStart);
        const maxPastDate = subDays(today, 90);
        
        if (isBefore(startDate, startOfDay(maxPastDate))) {
          toast.error("Start date cannot be older than 90 days");
          return;
        }

        exportFromDate = customExportStart;
        exportToDate = customExportEnd;
        break;
    }

    exportCSV.mutate({
      fromDate: exportFromDate,
      toDate: exportToDate,
      paymentMethod: paymentFilter || undefined,
      orderType: orderTypeFilter || undefined,
    }, {
      onSuccess: () => {
        setIsExportDialogOpen(false);
      }
    });
  };

  const handlePrint = () => {
    const billData = prepareBillData();
    if (!billData) {
      toast.error('Bill data not available');
      return;
    }

    // IMPORTANT:
    // Browser print dialogs can paginate automatically and may shrink fonts.
    // To guarantee a single-page PDF (even for 100 items), generate the PDF directly
    // with a custom page height based on the receipt text lines.

    // Generate an A4 invoice-style PDF with thermal-like placement:
    // - item text on left
    // - amounts on right (right-aligned)
    // using a readable font.

    const paperWidthMm = 210;
    const paperHeightMm = 297;
    const marginMm = 12;
    const maxY = paperHeightMm - marginMm;

    const fontSizePt = 11; // ~10-12px readable
    const lineHeightMm = fontSizePt * 0.55;

    const doc = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Use a readable proportional font, but keep alignment by explicitly positioning columns.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSizePt);

    const leftX = marginMm;
    const rightX = paperWidthMm - marginMm;
    const gapMm = 6;
    const amountColWidthMm = 38;
    const leftColWidthMm = paperWidthMm - marginMm * 2 - amountColWidthMm - gapMm;

    const ensureSpace = (nextY: number) => {
      if (nextY > maxY) {
        doc.addPage();
        return marginMm + lineHeightMm;
      }
      return nextY;
    };

    const textWrap = (t: string, widthMm: number) => (doc.splitTextToSize(t || "", widthMm) as string[]);

    const printCentered = (t: string, yPos: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(t, paperWidthMm / 2, yPos, { align: "center" });
      doc.setFont("helvetica", "normal");
    };

    const pdfCurrency = (billData.currency || '').trim() === '₹' ? 'Rs.' : (billData.currency || '').trim();

    const printLeftRight = (left: string, right: string, yPos: number) => {
      // Left text wrapped in left column
      const leftLines = textWrap(left, leftColWidthMm);
      const startY = yPos;
      let yy = startY;
      for (let i = 0; i < leftLines.length; i++) {
        yy = ensureSpace(yy);
        doc.text(leftLines[i], leftX, yy);
        if (i === 0 && right) {
          // Right-align amount in amount column
          doc.text(right, rightX, yy, { align: "right" });
        }
        yy += lineHeightMm;
      }
      return yy;
    };

    let y = marginMm + lineHeightMm;

    // Header
    printCentered(billData.restaurant.name?.toUpperCase?.() || "", y, true);
    y += lineHeightMm;

    const headerLines = [
      billData.restaurant.addressLine1,
      billData.restaurant.addressLine2,
      [billData.restaurant.city, billData.restaurant.state].filter(Boolean).join(", "),
      billData.restaurant.postalCode,
      billData.restaurant.phone ? `Phone: ${billData.restaurant.phone}` : "",
      billData.restaurant.email ? `Email: ${billData.restaurant.email}` : "",
      billData.restaurant.gstNumber ? `GSTIN: ${billData.restaurant.gstNumber}` : "",
      billData.restaurant.fssaiNumber ? `FSSAI LIC NO: ${billData.restaurant.fssaiNumber}` : "",
    ].filter(Boolean) as string[];

    for (const hl of headerLines) {
      y = ensureSpace(y);
      printCentered(hl, y);
      y += lineHeightMm;
    }

    y += 1;
    y = ensureSpace(y);
    doc.setDrawColor(0);
    doc.line(leftX, y, rightX, y);
    y += lineHeightMm;

    // Meta
    if (billData.bill.guestName) {
      y = printLeftRight(`Name: ${billData.bill.guestName}`, "", y);
    }
    y = printLeftRight(`Date & time : ${billData.bill.time} ${billData.bill.date}`.trim(), "", y);
    if (billData.bill.dineIn) y = printLeftRight(`Dine In: ${billData.bill.dineIn}`, "", y);
    if (billData.bill.cashier) y = printLeftRight(`Cashier: ${billData.bill.cashier}`, "", y);
    if (billData.bill.waiterName) y = printLeftRight(`Waiter: ${billData.bill.waiterName}`, "", y);
    y = printLeftRight(`Bill No.: ${billData.bill.billNumber}`, "", y);

    y = ensureSpace(y);
    doc.line(leftX, y, rightX, y);
    y += lineHeightMm;

    // Column headers
    doc.setFont("helvetica", "bold");
    doc.text("Item", leftX, y);
    doc.text("Amount", rightX, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += lineHeightMm;

    y = ensureSpace(y);
    doc.line(leftX, y, rightX, y);
    y += lineHeightMm;

    // Items
    for (const it of billData.items) {
      const amount = `${pdfCurrency}${it.total.toFixed(2)}`;
      y = printLeftRight(it.name, amount, y);
      // Qty line like thermal
      const qtyLine = `${it.quantity} x ${pdfCurrency}${it.price.toFixed(2)}`;
      y = printLeftRight(qtyLine, "", y);
      y += 0.5;
    }

    y = ensureSpace(y);
    doc.line(leftX, y, rightX, y);
    y += lineHeightMm;

    // Totals (thermal-like: label left, amount right)
    y = printLeftRight("Sub Total", `${pdfCurrency}${billData.totals.subtotal.toFixed(2)}`, y);
    if (billData.totals.serviceCharge > 0) {
      const sr = billData.taxRateService ?? 0;
      const label = sr ? `Service Charge ${sr.toFixed(0)}%` : "Service Charge";
      y = printLeftRight(label, `${pdfCurrency}${billData.totals.serviceCharge.toFixed(2)}`, y);
    }

    if (billData.totals.cgst !== undefined && billData.totals.sgst !== undefined) {
      const gr = billData.taxRateGst ?? 0;
      const half = gr ? gr / 2 : 0;
      const sgstLabel = half ? `SGST ${half.toFixed(1)}%` : "SGST";
      const cgstLabel = half ? `CGST ${half.toFixed(1)}%` : "CGST";
      y = printLeftRight(sgstLabel, `${pdfCurrency}${billData.totals.sgst.toFixed(2)}`, y);
      y = printLeftRight(cgstLabel, `${pdfCurrency}${billData.totals.cgst.toFixed(2)}`, y);
    } else if (billData.totals.gst > 0) {
      const gr = billData.taxRateGst ?? 0;
      const label = gr ? `GST ${gr.toFixed(1)}%` : "GST";
      y = printLeftRight(label, `${pdfCurrency}${billData.totals.gst.toFixed(2)}`, y);
    }

    if (billData.totals.discount && billData.totals.discount > 0) {
      y = printLeftRight("Discount", `${pdfCurrency}${billData.totals.discount.toFixed(2)}`, y);
    }

    if (billData.totals.roundOff && billData.totals.roundOff !== 0) {
      y = printLeftRight("Round Off", `${pdfCurrency}${billData.totals.roundOff.toFixed(2)}`, y);
    }

    y = ensureSpace(y);
    doc.line(leftX, y, rightX, y);
    y += lineHeightMm;

    doc.setFont("helvetica", "bold");
    y = printLeftRight("GRAND TOTAL", `${pdfCurrency}${billData.totals.grandTotal.toFixed(2)}`, y);
    doc.setFont("helvetica", "normal");

    y += lineHeightMm;
    y = ensureSpace(y);
    printCentered("Thank you! Visit Again", y);

    doc.save(`Bill-${billData.bill.billNumber}.pdf`);
  };

  /**
   * Prepare bill data from transaction detail
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
        // Ensures the thermal printer can print logo at the very top of the receipt
        logo: restaurantLogo ? { url: restaurantLogo.url, type: restaurantLogo.type } : undefined,
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
        cashier: transactionDetail.order?.placedByStaff?.fullName,
        dineIn: transactionDetail.order?.table?.tableNumber ? 'Dine In' : 'Takeaway',
      },
      items: mergeSameOrderItems(transactionDetail.order?.items as any)?.map((item: any) => {
        const qty = Number(item.quantity || 0);
        const total = Number(item.totalPrice || 0);
        const unit = item.unitPrice !== undefined ? Number(item.unitPrice) : qty ? total / qty : 0;
        return {
          name: item.itemName,
          quantity: qty,
          price: unit,
          total: total,
        };
      }) || [],
      totals: {
        subtotal: parseFloat(transactionDetail.subtotal),
        gst: parseFloat(transactionDetail.gstAmount),
        cgst: parseFloat(transactionDetail.gstAmount) / 2,
        sgst: parseFloat(transactionDetail.gstAmount) / 2,
        serviceCharge: parseFloat(transactionDetail.serviceTaxAmount),
        discount: Math.abs(parseFloat((transactionDetail.discountAmount || '0').replace(/,/g, '')) || 0),
        roundOff: parseFloat(transactionDetail.roundOff || '0'),
        grandTotal: parseFloat(transactionDetail.grandTotal),
      },
      currency: currency,
      // Use saved snapshot rates from the transaction (fallback to current restaurant rates for legacy rows)
      taxRateGst: parseFloat(transactionDetail.taxRateGst ?? restaurant.taxRateGst ?? '0'),
      taxRateService: parseFloat(transactionDetail.taxRateService ?? restaurant.taxRateService ?? '0'),
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

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    setPaymentFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }, []);

  const hasActiveFilters = searchTerm || paymentFilter || fromDate || toDate;

  // Render bill modal with lazy-loaded details
  const BillDetailModal = () => {
    if (!isBillDialogOpen || !selectedTransactionId) return null;

    return (
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] h-[90vh] flex flex-col overflow-hidden p-0">
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
            <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
              <div className="py-4 space-y-4 sm:space-y-5">
                {/* Bill Info Grid */}
                <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 sm:p-4 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                      <Utensils className="w-3 h-3" /> Type
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm sm:text-base truncate">
                        {transactionDetail.order?.orderType === "DINE_IN" ? "Dine-in" : 
                         transactionDetail.order?.orderType === "TAKEAWAY" ? "Takeaway" : 
                         transactionDetail.order?.orderType === "DELIVERY" ? "Delivery" : 
                         transactionDetail.order?.orderType?.replace("_", " ") || "N/A"}
                      </p>
                      {transactionDetail.order?.status === "CANCELLED" && (
                        <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] h-5 px-1.5 shrink-0">CANCELLED</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1">
                      <Utensils className="w-3 h-3" /> Table/Guest
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
                </div>

                {/* Ordered Items */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    Ordered Items
                  </h4>
                  <div className="space-y-2">
                    {mergeSameOrderItems(transactionDetail.order?.items as any)?.map((item: any, i: number) => (
                      <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-sm p-2.5 rounded-md hover:bg-muted/30 transition-colors border border-transparent hover:border-border overflow-hidden">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground truncate">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-mono font-semibold tabular-nums text-sm text-right whitespace-nowrap pl-2">
                          {currency}{parseFloat(item.totalPrice).toFixed(2)}
                        </span>
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                    <span className="text-muted-foreground sm:flex-1 min-w-0 truncate">Subtotal</span>
                    <span className="font-mono font-semibold tabular-nums sm:shrink-0 sm:min-w-[88px] sm:text-right text-right">
                      {currency}{parseFloat(transactionDetail.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                    <span className="text-muted-foreground sm:flex-1 min-w-0 truncate">GST</span>
                    <span className="font-mono font-semibold tabular-nums sm:shrink-0 sm:min-w-[88px] sm:text-right text-right">
                      {currency}{parseFloat(transactionDetail.gstAmount).toFixed(2)}
                    </span>
                  </div>

                  {transactionDetail.order?.orderType === "DINE_IN" &&
                    parseFloat(transactionDetail.serviceTaxAmount || "0") > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                        <div className="flex items-center gap-2 sm:flex-1 min-w-0">
                          <span className="text-muted-foreground truncate">Service Charge</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            title="Remove service charge"
                            disabled={removeServiceCharge.isPending || !transactionDetail.order?.id}
                            onClick={async () => {
                              const orderId = transactionDetail.order?.id;
                              if (!orderId) return;
                              try {
                                await removeServiceCharge.mutateAsync({ orderId });
                                await refetchTransactionDetail();
                              } catch {
                                // toast handled by mutation
                              }
                            }}
                          >
                            {removeServiceCharge.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MinusCircle className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <span className="font-mono font-semibold tabular-nums sm:shrink-0 sm:min-w-[88px] sm:text-right text-right">
                          {currency}{parseFloat(transactionDetail.serviceTaxAmount).toFixed(2)}
                        </span>
                      </div>
                    )}

                  {parseFloat(transactionDetail.discountAmount || "0") > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                      <span className="text-muted-foreground sm:flex-1 min-w-0 truncate">Discount</span>
                      <span className="font-mono font-semibold tabular-nums sm:shrink-0 sm:min-w-[88px] sm:text-right text-right text-green-700">
                        -{currency}{parseFloat(transactionDetail.discountAmount || "0").toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Separator className="my-2" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 pt-1">
                    <span className="font-bold text-base sm:text-lg sm:flex-1 min-w-0 truncate">Grand Total</span>
                    <span className="font-bold text-xl sm:text-2xl text-primary font-mono tabular-nums sm:shrink-0 sm:min-w-[104px] sm:text-right text-right">
                      {currency}{parseFloat(transactionDetail.grandTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <Separator />

            {/* Action Buttons */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3">
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="flex-1 min-w-0 gap-2 h-9 sm:h-10 text-sm"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4" />
                  <span className="truncate">Download PDF</span>
                </Button>

                <Button
                  className="flex-1 min-w-0 gap-2 h-9 sm:h-10 text-sm"
                  onClick={handleThermalPrint}
                  disabled={isPrinting || !isPrinterConnected}
                  title={!isPrinterConnected ? "Pair/connect printer from the sidebar first" : undefined}
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  <span className="truncate">Print Bill</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 min-w-0 gap-2 h-9 sm:h-10 text-sm bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  onClick={() => {
                    setIsBillDialogOpen(false);
                    setTimeout(() => setIsWhatsAppDialogOpen(true), 100);
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="truncate">WhatsApp</span>
                </Button>
              </div>
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
      <div className="max-w-6xl w-full mx-auto px-2 sm:px-0 pb-6 sm:pb-8 min-w-0 overflow-x-hidden sm:overflow-visible">
        {/* <div className="flex justify-between items-center mb-4 sm:mb-6 px-2 md:px-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-xl sm:text-3xl font-heading font-bold truncate">Transaction Records</h2>
            <p className="text-xs sm:text-base text-muted-foreground truncate">
              Detailed history of all bills and payments.
            </p>
          </div>
        </div> */}

        <div className="grid gap-4 sm:gap-6 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-3 px-4 sm:px-6 min-w-0">
              <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
                  <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                    <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-primary" />
                      <span className="hidden sm:inline truncate">
                        All Bills ({pagination?.total || 0})
                      </span>
                      <span className="sm:hidden truncate">Bills ({pagination?.total || 0})</span>
                    </CardTitle>

                    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-8 shrink-0 ml-auto gap-2"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Export</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Export Transactions</DialogTitle>
                          <DialogDescription>
                            Select the date range for your CSV export.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-4 py-4">
                          <Select value={exportOption} onValueChange={setExportOption}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="current">Current Page Data/Filters</SelectItem>
                              <SelectItem value="7days">Last 7 Days</SelectItem>
                              <SelectItem value="30days">Last 30 Days</SelectItem>
                              <SelectItem value="90days">Last 90 Days</SelectItem>
                              <SelectItem value="custom">Custom Date Range</SelectItem>
                            </SelectContent>
                          </Select>

                          {exportOption === "custom" && (
                            <div className="flex flex-col gap-3 animate-in fade-in zoom-in duration-200">
                              <div className="space-y-1.5">
                                <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                                <Input 
                                  id="start-date" 
                                  type="date"
                                  value={customExportStart}
                                  onChange={(e) => setCustomExportStart(e.target.value)}
                                  min={format(subDays(new Date(), 90), 'yyyy-MM-dd')}
                                  max={format(new Date(), 'yyyy-MM-dd')}
                                  className="h-10 text-sm"
                                />
                                <p className="text-xs text-muted-foreground">Maximum 90 days ago</p>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                                <Input 
                                  id="end-date" 
                                  type="date"
                                  value={customExportEnd}
                                  onChange={(e) => setCustomExportEnd(e.target.value)}
                                  min={customExportStart || undefined}
                                  max={format(new Date(), 'yyyy-MM-dd')}
                                  className="h-10 text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsExportDialogOpen(false)}
                            disabled={exportCSV.isPending}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleExportCSV} 
                            disabled={exportCSV.isPending}
                            className="gap-2"
                          >
                            {exportCSV.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            Download CSV
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-72 mt-1 md:mt-0 shrink-0">
                    <Input
                      placeholder="Search bills, table, guest..."
                      className="pr-16 h-9 sm:h-10 text-sm w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSubmit();
                        }
                      }}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={handleClearSearch}
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:bg-primary/10"
                        onClick={handleSearchSubmit}
                        title="Search"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-row items-center gap-1.5 pb-1 w-full min-w-0">
                  {/* Date Range */}
                  <div className="flex gap-1.5 flex-[2] min-w-0 max-w-[260px]">
                    <Input
                      type={fromDate ? "date" : "text"}
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = "text";
                      }}
                      placeholder="From"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setPage(1);
                      }}
                      className="h-8 flex-1 min-w-0 text-[10px] sm:text-xs px-1.5 sm:px-2"
                    />
                    <Input
                      type={toDate ? "date" : "text"}
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => {
                        if (!e.target.value) e.target.type = "text";
                      }}
                      placeholder="To"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setPage(1);
                      }}
                      className="h-8 flex-1 min-w-0 text-[10px] sm:text-xs px-1.5 sm:px-2"
                    />
                  </div>

                  {/* Payment Method Filter */}
                  <div className="flex-[1.2] min-w-0 max-w-[140px]">
                    <Select
                      value={paymentFilter || "all"}
                      onValueChange={(value) => {
                        setPaymentFilter(value === "all" ? "" : value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-8 text-[10px] sm:text-xs px-1.5 sm:px-2">
                        <SelectValue placeholder="Pay Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Order Type Filter */}
                  <div className="flex-[1.2] min-w-0 max-w-[140px]">
                    <Select
                      value={orderTypeFilter || "all"}
                      onValueChange={(value) => {
                        setOrderTypeFilter(value === "all" ? "" : value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full h-8 text-[10px] sm:text-xs px-1.5 sm:px-2">
                        <SelectValue placeholder="Order Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="DINE_IN">Dine-in</SelectItem>
                        <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
                        <SelectItem value="DELIVERY">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearFilters}
                      className="h-8 w-8 shrink-0 rounded-full"
                      title="Clear Filters"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
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
                          <TableCell className="font-mono text-primary text-sm min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transaction.billNumber}</span>
                              {transaction.order?.status === "CANCELLED" && (
                                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] leading-tight px-1.5 py-0 h-4">
                                  CANC
                                </Badge>
                              )}
                            </div>
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
              <div className="md:hidden space-y-3 px-4 sm:px-0">
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
                    <Card key={transaction.id} className="shadow-sm overflow-hidden max-w-full">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 lg:mb-0.5">
                              <p className="font-mono font-bold text-primary text-sm truncate">{transaction.billNumber}</p>
                              {transaction.order?.status === "CANCELLED" && (
                                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[9px] leading-normal px-1 py-0 h-auto">
                                  CANC
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{new Date(transaction.paidAt).toLocaleDateString()}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{new Date(transaction.paidAt).toLocaleTimeString()}</p>
                          </div>
                          <Badge variant="secondary" className="font-bold text-[10px] shrink-0 whitespace-nowrap">
                            {transaction.paymentMethod}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center mb-3 min-w-0 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Utensils className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs sm:text-sm font-medium truncate">
                              {transaction.order?.table?.tableNumber ? `Table ${transaction.order.table.tableNumber}` : transaction.order?.guestName || "N/A"}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                            <p className="font-bold font-mono text-primary text-sm sm:text-base whitespace-nowrap">
                              {currency}{parseFloat(transaction.grandTotal).toFixed(2)}
                            </p>
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
      </div>
    </DashboardLayout>
  );
}