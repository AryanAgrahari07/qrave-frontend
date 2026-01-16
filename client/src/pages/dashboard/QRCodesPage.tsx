
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_RESTAURANT } from "@/lib/mockData";
import { Download, Printer, Copy, ExternalLink, QrCode as QrIcon } from "lucide-react";
import { Link } from "wouter";

export default function QRCodesPage() {
  const qrUrl = `https://qrave.app/r/${MOCK_RESTAURANT.slug}`;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-bold">QR Management</h2>
        <p className="text-muted-foreground">Download and print codes for your tables.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Main QR Preview */}
        <Card className="overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-8 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
            <div className="bg-white p-4 rounded-2xl shadow-xl">
               {/* This is a mock QR code visual */}
               <div className="w-64 h-64 bg-white flex items-center justify-center relative border-4 border-black rounded-xl">
                  <div className="absolute inset-4 border-4 border-black rounded-lg opacity-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <QrIcon className="w-48 h-48 text-black" strokeWidth={1.5} />
                  </div>
                  {/* Logo Overlay */}
                  <div className="absolute bg-white p-2 rounded-full shadow-lg">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">Q</div>
                  </div>
               </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold font-heading">{MOCK_RESTAURANT.name}</h3>
              <p className="text-muted-foreground font-mono bg-muted px-3 py-1 rounded text-sm">
                {qrUrl}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button className="shadow-lg shadow-primary/20">
                <Download className="w-4 h-4 mr-2" /> Download PNG
              </Button>
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" /> Print Templates
              </Button>
              <Link href={`/r/${MOCK_RESTAURANT.slug}`}>
                <Button variant="ghost">
                    <ExternalLink className="w-4 h-4 mr-2" /> Test Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Table Specific QRs */}
        <div className="space-y-6">
          <div className="bg-background border border-border p-6 rounded-xl shadow-sm">
             <h3 className="font-bold text-lg mb-4">Table Specific Codes</h3>
             <p className="text-sm text-muted-foreground mb-6">Generate unique codes for each table to track occupancy and ordering.</p>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
               {[1, 2, 3, 4, 5, 6].map(num => (
                 <div key={num} className="border rounded-lg p-4 text-center hover:border-primary cursor-pointer transition-colors group">
                    <div className="w-16 h-16 mx-auto bg-muted mb-3 rounded flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <QrIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <p className="font-bold">Table {num}</p>
                    <p className="text-xs text-muted-foreground">Click to download</p>
                 </div>
               ))}
               <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer">
                  <Plus className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Add Tables</span>
               </div>
             </div>
          </div>
          
           <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-xl">
             <h3 className="font-bold text-lg text-blue-800 dark:text-blue-300 mb-2">Pro Tip</h3>
             <p className="text-sm text-blue-600 dark:text-blue-400">
               Printing standees? Use our high-resolution vector PDF export for the best quality on physical marketing materials.
             </p>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
import { Plus } from "lucide-react";
