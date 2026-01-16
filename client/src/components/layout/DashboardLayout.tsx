
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  QrCode, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  Store
} from "lucide-react";
import { NAV_LINKS, MOCK_RESTAURANT } from "@/lib/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-muted/20 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border fixed h-full z-40 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard">
            <div className="text-xl font-heading font-bold tracking-tight flex items-center gap-2 cursor-pointer">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">Q</span>
              </div>
              Qrave.
            </div>
          </Link>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6 px-2">
            <div className="p-3 bg-muted/50 rounded-lg border border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                <Store className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{MOCK_RESTAURANT.name}</p>
                <p className="text-xs text-muted-foreground">{MOCK_RESTAURANT.plan} Plan</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all cursor-pointer",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <Link href="/auth">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <header className="h-16 bg-background border-b border-border sticky top-0 z-30 px-6 flex items-center justify-between">
          <h1 className="font-heading font-semibold text-lg capitalize">
            {location.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
             <Link href={`/r/${MOCK_RESTAURANT.slug}`}>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                    View Live Menu
                </Button>
             </Link>
            <Avatar className="w-8 h-8 border border-border">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
