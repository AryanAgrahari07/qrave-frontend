import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Twitter, Instagram, Linkedin, Mail } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 text-white ${isScrolled ? "bg-black/95 backdrop-blur-md border-b border-white/10 shadow-lg py-0" : "bg-transparent border-transparent py-2"}`}>
        <div className={`container mx-auto px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${isScrolled ? "h-14 sm:h-16" : "h-16 sm:h-20"}`}>
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="Orderzi Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" />
              <div className="hidden sm:block text-2xl md:text-3xl font-heading font-black tracking-tighter">
                <span className="text-white">Order</span><span className="text-primary">zi</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <Link href="/auth">
              <div className="text-xs sm:text-sm font-medium hover:text-white/80 transition-colors cursor-pointer">Log in</div>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="text-xs sm:text-sm font-semibold shadow-lg shadow-primary/20 h-8 sm:h-9 px-3 sm:px-4">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {children}
      </main>

      <footer className="bg-[#080a10] text-white pt-16 sm:pt-20 md:pt-24 pb-8 sm:pb-10 border-t border-white/[0.05] relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-veg/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16 sm:mb-20">
            {/* Brand Column */}
            <div className="md:col-span-5 lg:col-span-4 space-y-6 sm:space-y-8">
              <Link href="/">
                <div className="flex flex-col items-start gap-4 cursor-pointer hover:opacity-90 transition-opacity">
                  <div className="text-4xl sm:text-5xl font-heading font-black tracking-tighter">
                    <span className="text-white">Order</span><span className="text-primary">zi</span>
                  </div>
                </div>
              </Link>
              <p className="text-sm sm:text-base text-white/40 font-medium leading-relaxed max-w-sm">
                The all-in-one operating system built for modern Indian restaurants. Speed, power, and scale.
              </p>
              <div className="flex gap-3 pt-2">
                <a href="#" className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 hover:text-primary text-white/60 transition-all">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 hover:text-primary text-white/60 transition-all">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-primary/20 hover:border-primary/50 hover:text-primary text-white/60 transition-all">
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-10">
              <div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-white mb-6">Product</h4>
                <ul className="space-y-4 text-sm sm:text-base font-medium text-white/50">
                  <li><a href="#features" className="hover:text-white hover:translate-x-1 transition-all inline-block">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-white hover:translate-x-1 transition-all inline-block">How it Works</a></li>
                  <li><a href="#testimonials" className="hover:text-white hover:translate-x-1 transition-all inline-block">Customers</a></li>
                  <li><a href="#" className="hover:text-white hover:translate-x-1 transition-all inline-block">Pricing</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm sm:text-base text-white mb-6">Company</h4>
                <ul className="space-y-4 text-sm sm:text-base font-medium text-white/50">
                  <li><a href="#" className="hover:text-white hover:translate-x-1 transition-all inline-block">About Us</a></li>
                  <li><a href="#" className="hover:text-white hover:translate-x-1 transition-all inline-block">Careers</a></li>
                  <li><a href="#" className="hover:text-white hover:translate-x-1 transition-all inline-block">Blog</a></li>
                  <li><a href="#contact" className="hover:text-white hover:translate-x-1 transition-all inline-block">Contact</a></li>
                </ul>
              </div>
              <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 border-white/[0.05] pt-8 sm:pt-0 mt-2 sm:mt-0">
                <ul className="space-y-5 text-sm sm:text-base font-medium text-white/50 flex flex-col">
                  <li className="flex flex-col gap-2">
                    <span className="font-heading font-bold text-white text-sm sm:text-base">Support</span>
                    <a href="mailto:hello@orderzi.in" className="flex items-center gap-2 hover:text-white transition-colors">
                      <Mail className="w-4 h-4 text-white/40" />
                      hello@orderzi.in
                    </a>
                  </li>
                  <li className="flex flex-col sm:flex-col gap-4 sm:gap-4 pt-4 border-t border-white/[0.05]">
                    <a href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="text-sm hover:text-white transition-colors">Terms of Service</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 sm:pt-10 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm font-medium text-white/30">
              © {new Date().getFullYear()} Order<span className="text-primary/70">zi</span> Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.05]">
              <span className="w-2 h-2 rounded-full bg-veg animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-xs font-semibold tracking-wide text-white/50">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}