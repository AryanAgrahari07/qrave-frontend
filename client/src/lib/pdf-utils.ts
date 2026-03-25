import { jsPDF } from "jspdf";
import { BillData } from "./thermal-printer-utils";

export const generatePDFBill = (billData: BillData) => {
  // Generate an A4 invoice-style PDF with thermal-like placement
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
