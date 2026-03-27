import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Printer, ExternalLink, QrCode as QrIcon, Plus, Loader2, RefreshCw, Table } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useRestaurant, useTables, useGenerateQR, useGenerateAllQR, useQRStats } from "@/hooks/api";
import { useState, useRef } from "react";
import type { Table as TableType, QRCodeData } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import QRBoardTemplate from "@/components/qr/QRBoardTemplate";
import { toPng } from "html-to-image";

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

  const qrBoardRef = useRef<HTMLDivElement>(null);
  const [boardProps, setBoardProps] = useState<{qrCodeDataUrl: string, tableName: string | null} | null>(null);

  const isNativeApp = !!(window as any).Capacitor;
  const baseUrl = isNativeApp ? (import.meta.env.VITE_APP_URL || "https://orderzi.com") : window.location.origin;
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Since MainQR generates new ones, we assume refetching is triggered elsewhere or this just animates.
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleGenerateMainQRClick = async () => {
    handleRefresh();
    handleGenerateMainQR();
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

  const downloadQRBoard = async (qrCodeDataURL: string, tableName: string | null, filename: string) => {
    setBoardProps({ qrCodeDataUrl: qrCodeDataURL, tableName });
    
    // Allow React to render the hidden board
    setTimeout(async () => {
      if (qrBoardRef.current) {
        const loadingToast = toast.loading('Generating HD QR Board...');
        try {
          const dataUrl = await toPng(qrBoardRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            skipFonts: true,
            backgroundColor: 'white',
          });
          
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(`Downloaded ${filename}`, { id: loadingToast });
        } catch (error) {
          console.error("QR Board generation failed", error);
          toast.error("Failed to generate QR Board", { id: loadingToast });
        }
      }
    }, 150);
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
      <div className="max-w-6xl w-full mx-auto px-2 sm:px-0 pb-4 sm:pb-6">
        <div className="mb-3 sm:mb-4 px-2 sm:px-0 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold">QR Management</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Download and print codes for your tables.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 px-2 sm:px-0">
          {/* Main QR Preview */}
          <Card className="overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/5">
            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
              <div className="bg-white p-2 sm:p-3 rounded-2xl shadow-xl">
                {mainQR?.qrCodeDataURL ? (
                  <img
                    src={mainQR.qrCodeDataURL}
                    alt="Restaurant QR Code"
                    className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56"
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 bg-white flex items-center justify-center relative border-4 border-black rounded-xl">
                    <div className="absolute inset-4 border-4 border-black rounded-lg opacity-10"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <QrIcon className="w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 text-black" strokeWidth={1.5} />
                    </div>
                    <div className="absolute bg-white p-2 rounded-full shadow-lg">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">Q</div>
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

              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center w-full px-2">
                {!mainQR ? (
                  <Button
                    className="shadow-sm w-full sm:w-auto h-8 text-xs"
                    onClick={handleGenerateMainQR}
                    disabled={generateQR.isPending}
                  >
                    {generateQR.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Generate QR Code
                  </Button>
                ) : (
                  <>
                    <Button
                      className="shadow-sm w-full sm:w-auto h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => downloadQRBoard(mainQR.qrCodeDataURL, null, `${restaurant?.slug || "restaurant"}-qr-board.png`)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Download QR Board
                    </Button>
                    <Button variant="outline" onClick={handleGenerateMainQRClick} disabled={generateQR.isPending || isRefreshing} className="w-full sm:w-auto h-8 text-xs">
                      <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", (generateQR.isPending || isRefreshing) && "animate-spin")} /> Regenerate
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
            <div className="bg-background border border-border p-3 sm:p-4 rounded-xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Table Specific Codes</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    Generate unique codes for each table to track occupancy.
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
                            downloadQRBoard(tableQR.qrCodeDataURL, table.tableNumber, `table-${table.tableNumber}-qr-board.png`);
                          } else {
                            handleGenerateTableQR(table.id);
                          }
                        }}
                      >
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 rounded flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                          {isLoadingThis ? (
                            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
                          ) : tableQR ? (
                            <img src={tableQR.qrCodeDataURL} loading="lazy" alt={`Table ${table.tableNumber}`} className="w-full h-full" />
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
                <div className="text-center py-6 sm:py-8 border-2 border-dashed rounded-lg">
                  <Table className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">No tables configured</p>
                  <Link href="/dashboard/floor-map">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Tables
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Stats */}
            {qrStats && (
              <div className="bg-muted/30 p-3 sm:p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
                  <div>
                    <p className="text-lg sm:text-xl font-bold">{qrStats.totalTables}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Tables</p>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold">{qrStats.tablesWithQR}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">With QR Codes</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2.5 sm:p-3 rounded-lg flex items-start gap-2">
              <div className="w-1 bg-blue-500 rounded-full shrink-0 self-stretch"></div>
              <div>
                <p className="text-[10px] sm:text-xs text-blue-800 dark:text-blue-300 font-medium mb-0.5">Pro Tip: Tracking</p>
                <p className="text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 leading-tight">
                  Table QRs let you see what each table ordered instantly during dine-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden QR Board Template for html2canvas to capture */}
      <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none opacity-0">
        {boardProps && (
          <QRBoardTemplate 
            ref={qrBoardRef}
            restaurantName={restaurant?.name || "Restaurant"}
            tableNumber={boardProps.tableName}
            qrCodeDataUrl={boardProps.qrCodeDataUrl}
          />
        )}
      </div>
    </DashboardLayout>
  );
}