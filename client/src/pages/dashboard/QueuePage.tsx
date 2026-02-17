import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Clock, UserPlus, Phone, Loader2, RefreshCw, Bell, X, ChevronRight, QrCode, ExternalLink, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useQueueActive, useTables, useRegisterInQueue, useCallNextGuest, useSeatGuest, useCancelQueueEntry, useQueueStats, useRestaurant } from "@/hooks/api";
import type { QueueEntry, Table } from "@/types";
import { formatDistanceToNow } from "date-fns";
import QRCode from "qrcode";

export default function QueuePage() {
  const { restaurantId } = useAuth();
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: queueEntries, isLoading, refetch } = useQueueActive(restaurantId);
  const { data: tables } = useTables(restaurantId);
  const { data: queueStats } = useQueueStats(restaurantId);
  
  const registerInQueue = useRegisterInQueue(restaurantId);
  const callNext = useCallNextGuest(restaurantId);
  const seatGuest = useSeatGuest(restaurantId);
  const cancelEntry = useCancelQueueEntry(restaurantId);

  const [selectedGuest, setSelectedGuest] = useState<QueueEntry | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSeatDialogOpen, setIsSeatDialogOpen] = useState(false);
  const [isQueueQrDialogOpen, setIsQueueQrDialogOpen] = useState(false);

  // Customer-facing queue QR
  const [queueQrDataUrl, setQueueQrDataUrl] = useState<string | null>(null);
  const queueJoinUrl = useMemo(() => {
    const base = window.location.origin;
    return restaurant?.slug ? `${base}/q/${restaurant.slug}` : "";
  }, [restaurant?.slug]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!queueJoinUrl) {
        setQueueQrDataUrl(null);
        return;
      }
      try {
        const url = await QRCode.toDataURL(queueJoinUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 256,
        });
        if (!cancelled) setQueueQrDataUrl(url);
      } catch {
        if (!cancelled) setQueueQrDataUrl(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [queueJoinUrl]);
  
  // New guest form
  const [newGuest, setNewGuest] = useState({
    guestName: "",
    partySize: 2,
    phoneNumber: "",
    notes: "",
  });

  const availableTables = tables?.filter((t: Table) => t.currentStatus === "AVAILABLE") || [];

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuest.guestName.trim()) return;
    
    await registerInQueue.mutateAsync({
      guestName: newGuest.guestName.trim(),
      partySize: newGuest.partySize,
      phoneNumber: newGuest.phoneNumber.trim() || undefined,
      notes: newGuest.notes.trim() || undefined,
    });
    
    setNewGuest({ guestName: "", partySize: 2, phoneNumber: "", notes: "" });
    setIsAddDialogOpen(false);
  };

  const handleCallNext = async () => {
    try {
      await callNext.mutateAsync();
    } catch {
      // Error handled by mutation
    }
  };

  const handleSeatGuest = async () => {
    if (!selectedGuest) return;
    
    await seatGuest.mutateAsync({
      queueId: selectedGuest.id,
      tableId: selectedTableId || undefined,
    });
    
    setSelectedGuest(null);
    setSelectedTableId(null);
    setIsSeatDialogOpen(false);
  };

  const handleCancelEntry = async (queueId: string) => {
    if (!confirm("Are you sure you want to remove this guest from the queue?")) return;
    cancelEntry.mutate(queueId);
  };

  const getWaitTime = (entryTime: string) => {
    try {
      return formatDistanceToNow(new Date(entryTime), { addSuffix: false });
    } catch {
      return "just now";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CALLED":
        return <Badge className="bg-primary animate-pulse text-xs">CALLED</Badge>;
      case "WAITING":
        return <Badge variant="secondary" className="text-xs">WAITING</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
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

  const copyQueueLink = async () => {
    if (!queueJoinUrl) return;
    try {
      await navigator.clipboard.writeText(queueJoinUrl);
      toast.success("Queue link copied");
    } catch {
      toast.error("Failed to copy");
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

  // Separate called guests from waiting
  const calledGuests = queueEntries?.filter((e: QueueEntry) => e.status === "CALLED") || [];
  const waitingGuests = queueEntries?.filter((e: QueueEntry) => e.status === "WAITING") || [];

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold">Guest Queue</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage waitlists and seat guests efficiently.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Button variant="outline" size="icon" onClick={() => refetch()} className="shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleCallNext}
            disabled={callNext.isPending || waitingGuests.length === 0}
            className="flex-1 sm:flex-none"
          >
            <Bell className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Call Next</span>
          </Button>

          <Dialog open={isQueueQrDialogOpen} onOpenChange={setIsQueueQrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                <QrCode className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Customer QR</span>
                <span className="sm:hidden">QR</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle>Customer Queue QR</DialogTitle>
                <DialogDescription>
                  Customers can scan this QR to enter their details and join the queue.
                </DialogDescription>
              </DialogHeader>

              {queueJoinUrl ? (
                <div className="space-y-4 py-2">
                  <div className="w-full flex justify-center">
                    <div className="bg-white p-3 rounded-xl shadow-sm border">
                      {queueQrDataUrl ? (
                        <img
                          src={queueQrDataUrl}
                          alt="Queue QR Code"
                          className="w-56 h-56"
                        />
                      ) : (
                        <div className="w-56 h-56 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm font-mono break-all rounded-md bg-muted/50 p-2 border">
                    {queueJoinUrl}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(queueJoinUrl, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> Open
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyQueueLink}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!queueQrDataUrl}
                      onClick={() =>
                        queueQrDataUrl &&
                        downloadQR(
                          queueQrDataUrl,
                          `${restaurant?.slug || "restaurant"}-queue-qr.png`,
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2" /> Download QR
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4">
                  Queue link not available (missing restaurant slug).
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                <UserPlus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add to Queue</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">Add Guest to Queue</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">Register a new guest for the waitlist.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddToQueue} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="guest-name" className="text-xs sm:text-sm">Guest Name *</Label>
                  <Input 
                    id="guest-name" 
                    placeholder="Enter name..." 
                    value={newGuest.guestName}
                    onChange={(e) => setNewGuest({ ...newGuest, guestName: e.target.value })}
                    required
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="party-size" className="text-xs sm:text-sm">Party Size *</Label>
                    <Input 
                      id="party-size" 
                      type="number" 
                      min="1" 
                      max="20"
                      value={newGuest.partySize}
                      onChange={(e) => setNewGuest({ ...newGuest, partySize: parseInt(e.target.value) || 1 })}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="+91 98765..."
                      value={newGuest.phoneNumber}
                      onChange={(e) => setNewGuest({ ...newGuest, phoneNumber: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs sm:text-sm">Notes</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Special requests, occasion, etc..."
                    value={newGuest.notes}
                    onChange={(e) => setNewGuest({ ...newGuest, notes: e.target.value })}
                    className="h-16 sm:h-20 text-sm"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full h-10 sm:h-11" disabled={registerInQueue.isPending}>
                    {registerInQueue.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add to Queue
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Summary */}
      {queueStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Waiting</p>
            <p className="text-xl sm:text-2xl font-bold">{queueStats.totalWaiting}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Called</p>
            <p className="text-xl sm:text-2xl font-bold">{queueStats.totalCalled}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Seated Today</p>
            <p className="text-xl sm:text-2xl font-bold">{queueStats.totalSeated}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Avg Wait</p>
            <p className="text-xl sm:text-2xl font-bold">{queueStats.avgWaitTimeMinutes ? `${Math.round(parseFloat(queueStats.avgWaitTimeMinutes))}m` : "—"}</p>
          </Card>
        </div>
      )}

      {/* Called Guests (Priority) */}
      {calledGuests.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h3 className="font-heading font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" /> 
            <span className="hidden sm:inline">Called - Ready to Seat</span>
            <span className="sm:hidden">Called</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {calledGuests.map((guest: QueueEntry) => (
              <Card key={guest.id} className="border-l-4 border-l-primary ring-2 ring-primary/20 bg-primary/5">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base sm:text-lg truncate">{guest.guestName}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" /> 
                        <span className="hidden sm:inline">Waiting for {getWaitTime(guest.entryTime)}</span>
                        <span className="sm:hidden">{getWaitTime(guest.entryTime)}</span>
                      </p>
                      {guest.phoneNumber && (
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                          <Phone className="w-3 h-3 shrink-0" /> {guest.phoneNumber}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(guest.status)}
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      <span className="font-medium">{guest.partySize} <span className="hidden sm:inline">Guests</span></span>
                    </div>
                    {guest.estimatedWaitMinutes !== undefined && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>~{guest.estimatedWaitMinutes}m</span>
                      </div>
                    )}
                  </div>

                  {guest.notes && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 italic line-clamp-2">"{guest.notes}"</p>
                  )}
                  
                  <div className="flex gap-2">
                    <Dialog open={isSeatDialogOpen && selectedGuest?.id === guest.id} onOpenChange={(open) => {
                      setIsSeatDialogOpen(open);
                      if (!open) {
                        setSelectedGuest(null);
                        setSelectedTableId(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 h-9 sm:h-10 text-sm" onClick={() => setSelectedGuest(guest)}>
                          <ChevronRight className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Seat Now</span>
                          <span className="sm:hidden">Seat</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl sm:text-2xl">Seat {guest.guestName}</DialogTitle>
                          <DialogDescription className="text-xs sm:text-sm">
                            Party of {guest.partySize}. Select a table or seat without assignment.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Label className="text-xs uppercase font-bold text-muted-foreground mb-3 block">
                            Available Tables ({availableTables.length})
                          </Label>
                          {availableTables.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              {availableTables.map((table: Table) => {
                                const isOptimal = table.capacity >= guest.partySize;
                                return (
                                  <button
                                    key={table.id}
                                    type="button"
                                    onClick={() => setSelectedTableId(selectedTableId === table.id ? null : table.id)}
                                    className={cn(
                                      "p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all",
                                      selectedTableId === table.id 
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                                        : "border-border hover:border-primary/50"
                                    )}
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-base sm:text-lg">T{table.tableNumber}</span>
                                      {isOptimal && (
                                        <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-green-50 text-green-700 border-green-200">
                                          Fits
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Cap: {table.capacity}</p>
                                    {table.floorSection && (
                                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{table.floorSection}</p>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6 sm:py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                              <p className="text-sm">No available tables</p>
                              <p className="text-xs">You can still seat without assignment</p>
                            </div>
                          )}
                        </div>
                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSelectedTableId(null);
                              handleSeatGuest();
                            }}
                            disabled={seatGuest.isPending}
                            className="w-full h-9 sm:h-10 text-sm"
                          >
                            <span className="hidden sm:inline">Seat Without Table</span>
                            <span className="sm:hidden">Without Table</span>
                          </Button>
                          <Button 
                            onClick={handleSeatGuest}
                            disabled={seatGuest.isPending || !selectedTableId}
                            className="w-full h-9 sm:h-10 text-sm"
                          >
                            {seatGuest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirm
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                      onClick={() => handleCancelEntry(guest.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Waiting Queue */}
      <h3 className="font-heading font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" /> 
        <span className="hidden sm:inline">Waiting Queue</span>
        <span className="sm:hidden">Queue</span>
        <Badge variant="outline" className="text-xs">{waitingGuests.length}</Badge>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {waitingGuests.map((guest: QueueEntry) => (
          <Card key={guest.id} className={cn("shadow-sm border-l-4 border-l-muted")}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base sm:text-lg truncate">{guest.guestName}</p>
                    {guest.position && (
                      <Badge variant="outline" className="text-xs shrink-0">#{guest.position}</Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" /> 
                    <span className="hidden sm:inline">Waiting for {getWaitTime(guest.entryTime)}</span>
                    <span className="sm:hidden">{getWaitTime(guest.entryTime)}</span>
                  </p>
                  {guest.phoneNumber && (
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <Phone className="w-3 h-3 shrink-0" /> {guest.phoneNumber}
                    </p>
                  )}
                </div>
                {getStatusBadge(guest.status)}
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <span className="font-medium">{guest.partySize} <span className="hidden sm:inline">Guests</span></span>
                </div>
                {guest.estimatedWaitMinutes !== undefined && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>~{guest.estimatedWaitMinutes}m</span>
                  </div>
                )}
              </div>

              {guest.notes && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 italic line-clamp-2">"{guest.notes}"</p>
              )}
              
              <div className="flex gap-2">
                <Dialog open={isSeatDialogOpen && selectedGuest?.id === guest.id} onOpenChange={(open) => {
                  setIsSeatDialogOpen(open);
                  if (!open) {
                    setSelectedGuest(null);
                    setSelectedTableId(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 h-9 sm:h-10 text-sm" onClick={() => setSelectedGuest(guest)}>
                      <span className="hidden sm:inline">Assign Table</span>
                      <span className="sm:hidden">Assign</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl sm:text-2xl">Assign Table for {guest.guestName}</DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm">Party of {guest.partySize}. Select an available table.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                        Party Size: <span className="font-bold text-foreground">{guest.partySize}</span>
                      </p>
                      {availableTables.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          {availableTables.map((table: Table) => {
                            const isOptimal = table.capacity >= guest.partySize;
                            return (
                              <button
                                key={table.id}
                                type="button"
                                onClick={() => setSelectedTableId(selectedTableId === table.id ? null : table.id)}
                                className={cn(
                                  "p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all",
                                  selectedTableId === table.id 
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-base sm:text-lg">T{table.tableNumber}</span>
                                  {isOptimal && (
                                    <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-green-50 text-green-700 border-green-200">
                                      Optimal
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Cap: {table.capacity}</p>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                          <p className="text-sm">No available tables</p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button 
                        className="w-full h-9 sm:h-10 text-sm" 
                        disabled={!selectedTableId || seatGuest.isPending} 
                        onClick={handleSeatGuest}
                      >
                        {seatGuest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                  onClick={() => handleCancelEntry(guest.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {waitingGuests.length === 0 && calledGuests.length === 0 && (
          <div className="col-span-full text-center py-12 sm:py-20 text-muted-foreground border-2 border-dashed rounded-2xl sm:rounded-3xl">
            <UsersIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-20" />
            <p className="text-base sm:text-lg font-medium">No one in queue</p>
            <p className="text-xs sm:text-sm">All guests have been seated.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}