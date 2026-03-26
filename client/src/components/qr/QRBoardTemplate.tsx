import React, { forwardRef } from 'react';
import { QrCode as QrIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QRBoardTemplateProps {
  restaurantName: string;
  qrCodeDataUrl?: string;
  tableNumber?: string | null;
  punchline?: string;
  className?: string;
}

export const QRBoardTemplate = forwardRef<HTMLDivElement, QRBoardTemplateProps>(
  ({ restaurantName, qrCodeDataUrl, tableNumber, punchline = "Scan to View Menu & Order", className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-[800px] h-[1200px] bg-white relative overflow-hidden flex flex-col font-sans",
          className
        )}
        style={{
          // A subtle elegant background gradient pattern
          background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
        }}
      >
        {/* Top Decorative Elements */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-primary/5 -skew-y-3 transform origin-top-left z-0"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 z-0"></div>

        <div className="z-10 flex flex-col h-full p-16">
          {/* Header */}
          <div className="text-center space-y-6 mt-12 mb-auto flex-1 flex flex-col justify-center">
            <h1 className="text-6xl font-black tracking-tight text-gray-900 drop-shadow-sm uppercase">
              {restaurantName}
            </h1>
            <p className="text-3xl text-gray-600 font-medium tracking-wide">
              {punchline}
            </p>
          </div>

          {/* QR Code Section */}
          <div className="flex-none flex flex-col items-center justify-center my-12">
            <div className="bg-white p-8 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-gray-900/5 relative">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl -translate-x-2 -translate-y-2"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl translate-x-2 -translate-y-2"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl -translate-x-2 translate-y-2"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl translate-x-2 translate-y-2"></div>

              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="w-[450px] h-[450px] object-contain"
                />
              ) : (
                <div className="w-[450px] h-[450px] flex items-center justify-center bg-gray-50 border-4 border-dashed border-gray-200 rounded-xl">
                  <QrIcon className="w-48 h-48 text-gray-300" strokeWidth={1} />
                </div>
              )}
            </div>

            {/* Table Number Badge */}
            {tableNumber && (
              <div className="mt-16 bg-gray-900 text-white px-12 py-4 rounded-full shadow-xl flex items-center space-x-4 border-4 border-white">
                <span className="text-2xl font-bold tracking-widest uppercase opacity-80">Table</span>
                <span className="text-5xl font-black">{tableNumber}</span>
              </div>
            )}
          </div>

          {/* Footer / Branding */}
          <div className="mt-auto pt-12 flex flex-col items-center justify-end text-center space-y-3 pb-8">
            <div className="h-px w-32 bg-gray-300 mb-4 rounded-full"></div>
            <div className="flex items-center space-x-3 opacity-80">
              <span className="text-lg font-medium text-gray-500">Powered by</span>
              <div className="flex items-center space-x-2">
                <img src="/logo.png" alt="Orderzi" className="h-8 w-auto object-contain" />
                <span className="text-gray-800 font-bold text-2xl tracking-tighter">Orderzi</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 font-medium">Fast, seamless ordering & payments</p>
          </div>
        </div>

        {/* Outer Border Frame */}
        <div className="absolute inset-0 border-[16px] border-white z-20 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute inset-0 border-8 border-gray-900/5 z-20 pointer-events-none"></div>
      </div>
    );
  }
);

QRBoardTemplate.displayName = 'QRBoardTemplate';

export default QRBoardTemplate;
