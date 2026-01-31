import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/">
            <div className="text-lg sm:text-xl md:text-2xl font-heading font-bold tracking-tighter flex items-center gap-1.5 sm:gap-2 cursor-pointer">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white text-sm sm:text-base md:text-lg">Q</span>
              </div>
              Qrave.
            </div>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <Link href="/auth">
              <div className="text-xs sm:text-sm font-medium hover:text-primary transition-colors cursor-pointer">Log in</div>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="text-xs sm:text-sm font-semibold shadow-lg shadow-primary/20 h-8 sm:h-9 px-3 sm:px-4">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="pt-14 sm:pt-16">
        {children}
      </main>

        <footer className="bg-black text-white py-8 sm:py-10 md:py-12 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-heading font-bold text-base sm:text-lg">Qrave.</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">The operating system for modern restaurants.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Features</a></li>
                <li><a href="#" className="hover:text-primary">Pricing</a></li>
                <li><a href="#" className="hover:text-primary">Showcase</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacy</a></li>
                <li><a href="#" className="hover:text-primary">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 border-t border-border/50 text-center text-xs sm:text-sm text-muted-foreground">
            © {new Date().getFullYear()} Qrave Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}