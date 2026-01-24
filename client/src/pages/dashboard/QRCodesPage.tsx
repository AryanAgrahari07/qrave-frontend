import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Printer, ExternalLink, QrCode as QrIcon, Plus, Loader2, RefreshCw, Table } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant, useTables, useGenerateQR, useGenerateAllQR, useQRStats } from "@/hooks/api";
import { useState } from "react";
import type { Table as TableType, QRCodeData } from "@/types";
import { toast } from "sonner";

export default function QRCodesPage() {
  const { restaurantId } = useAuth();
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(restaurantId);
  const { data: tables, isLoading: tablesLoading } = useTables(restaurantId);
  const { data: qrStats } = useQRStats(restaurantId);
  
  const generateQR = useGenerateQR(restaurantId);
  const generateAllQR = useGenerateAllQR(restaurantId);

  const [mainQR, setMainQR] = useState<QRCodeData | null>(null);
  const [tableQRs, setTableQRs] = useState<Record<string, QRCodeData>>({});
  const [loadingTableId, setLoadingTableId] = useState<string | null>(null);

  const baseUrl = window.location.origin;
  const qrUrl = restaurant?.slug ? `${baseUrl}/r/${restaurant.slug}` : "";

  const handleGenerateMainQR = async () => {
    try {
      const qr = await generateQR.mutateAsync({ type: "RESTAURANT" });
      setMainQR(qr);
      toast.success("QR code generated!");
    } catch {
      // Error handled by mutation
    }
  };

  const handleGenerateTableQR = async (tableId: string) => {
    setLoadingTableId(tableId);
    try {
      const qr = await generateQR.mutateAsync({ type: "TABLE", tableId });
      setTableQRs(prev => ({ ...prev, [tableId]: qr }));
      toast.success("Table QR generated!");
    } catch {
      // Error handled by mutation
    } finally {
      setLoadingTableId(null);
    }
  };

  const handleGenerateAllQRs = async () => {
    try {
      const result = await generateAllQR.mutateAsync();
      const qrMap: Record<string, QRCodeData> = {};
      result.qrCodes.forEach((qr: QRCodeData) => {
        if (qr.tableId) qrMap[qr.tableId] = qr;
      });
      setTableQRs(qrMap);
    } catch {
      // Error handled by mutation
    }
  };

  const downloadQR = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${filename}`);
  };

  const isLoading = restaurantLoading || tablesLoading;

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
      <div className="mb-6 sm:mb-8 px-4 sm:px-0">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold">QR Management</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Download and print codes for your tables.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 px-4 sm:px-0">
        {/* Main QR Preview */}
        <Card className="overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="p-6 sm:p-8 lg:p-12 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xl">
              {mainQR?.qrCodeDataURL ? (
                <img 
                  src={mainQR.qrCodeDataURL} 
                  alt="Restaurant QR Code" 
                  className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 bg-white flex items-center justify-center relative border-4 border-black rounded-xl">
                  <div className="absolute inset-4 border-4 border-black rounded-lg opacity-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <QrIcon className="w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48 text-black" strokeWidth={1.5} />
                  </div>
                  <div className="absolute bg-white p-2 rounded-full shadow-lg">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">Q</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2 w-full px-2">
              <h3 className="text-xl sm:text-2xl font-bold font-heading break-words">{restaurant?.name || "Restaurant"}</h3>
              <p className="text-muted-foreground font-mono bg-muted px-2 sm:px-3 py-1 rounded text-xs sm:text-sm break-all">
                {qrUrl || "No URL available"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center w-full px-2">
              {!mainQR ? (
                <Button 
                  className="shadow-lg shadow-primary/20 w-full sm:w-auto"
                  onClick={handleGenerateMainQR}
                  disabled={generateQR.isPending}
                >
                  {generateQR.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Generate QR Code
                </Button>
              ) : (
                <>
                  <Button 
                    className="shadow-lg shadow-primary/20 w-full sm:w-auto"
                    onClick={() => downloadQR(mainQR.qrCodeDataURL, `${restaurant?.slug || "restaurant"}-qr.png`)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download PNG
                  </Button>
                  <Button variant="outline" onClick={handleGenerateMainQR} className="w-full sm:w-auto">
                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                  </Button>
                </>
              )}
              {restaurant?.slug && (
                <Link href={`/r/${restaurant.slug}`}>
                  <Button variant="ghost" className="w-full sm:w-auto">
                    <ExternalLink className="w-4 h-4 mr-2" /> Test Link
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table Specific QRs */}
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-background border border-border p-4 sm:p-6 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
              <div>
                <h3 className="font-bold text-base sm:text-lg">Table Specific Codes</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Generate unique codes for each table to track occupancy and ordering.
                </p>
              </div>
              {tables && tables.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateAllQRs}
                  disabled={generateAllQR.isPending}
                  className="w-full sm:w-auto"
                >
                  {generateAllQR.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Generate All
                </Button>
              )}
            </div>
            
            {tables && tables.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {tables.map((table: TableType) => {
                  const tableQR = tableQRs[table.id];
                  const isLoadingThis = loadingTableId === table.id;
                  
                  return (
                    <div 
                      key={table.id} 
                      className="border rounded-lg p-3 sm:p-4 text-center hover:border-primary cursor-pointer transition-colors group"
                      onClick={() => {
                        if (tableQR) {
                          downloadQR(tableQR.qrCodeDataURL, `table-${table.tableNumber}-qr.png`);
                        } else {
                          handleGenerateTableQR(table.id);
                        }
                      }}
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 rounded flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                        {isLoadingThis ? (
                          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
                        ) : tableQR ? (
                          <img src={tableQR.qrCodeDataURL} alt={`Table ${table.tableNumber}`} className="w-full h-full" />
                        ) : (
                          <QrIcon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground group-hover:text-primary" />
                        )}
                      </div>
                      <p className="font-bold text-sm sm:text-base">Table {table.tableNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {tableQR ? "Click to download" : "Click to generate"}
                      </p>
                    </div>
                  );
                })}
                <Link href="/dashboard/floor-map">
                  <div className="border border-dashed rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer h-full min-h-[120px] sm:min-h-[140px]">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
                    <span className="text-xs sm:text-sm font-medium">Add Tables</span>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 border-2 border-dashed rounded-lg">
                <Table className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm sm:text-base text-muted-foreground mb-2">No tables configured</p>
                <Link href="/dashboard/floor-map">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add Tables
                  </Button>
                </Link>
              </div>
            )}
          </div>
          
          {/* Stats */}
          {qrStats && (
            <div className="bg-muted/30 p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{qrStats.totalTables}</p>
                  <p className="text-xs text-muted-foreground">Total Tables</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{qrStats.tablesWithQR}</p>
                  <p className="text-xs text-muted-foreground">With QR Codes</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 sm:p-6 rounded-xl">
            <h3 className="font-bold text-base sm:text-lg text-blue-800 dark:text-blue-300 mb-2">Pro Tip</h3>
            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
              Table-specific QR codes include tracking information. When a customer scans a table QR, you'll see which table ordered what - great for dine-in service!
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}