
import { MOCK_MENU_CATEGORIES, MOCK_RESTAURANT } from "@/lib/mockData";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PublicMenuPage() {
  const [activeCategory, setActiveCategory] = useState(MOCK_MENU_CATEGORIES[0].id);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const element = document.getElementById(catId);
    if (element) {
      const headerOffset = 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-40 bg-background transition-all duration-300",
        scrolled ? "shadow-md py-2" : "py-4"
      )}>
        <div className="container max-w-md mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-heading font-bold tracking-tight">{MOCK_RESTAURANT.name}</h1>
              <p className="text-xs text-muted-foreground">Open until 10:00 PM • $$$</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              GH
            </div>
          </div>
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search for dishes..." 
              className="pl-9 h-10 bg-muted/50 border-transparent focus:bg-background transition-all" 
            />
          </div>
        </div>

        {/* Category Scroll */}
        <div className="overflow-x-auto scrollbar-hide border-b border-border/50 pb-2">
          <div className="flex gap-2 px-4 min-w-max">
            {MOCK_MENU_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <main className="container max-w-md mx-auto px-4 pt-44 space-y-8">
        {MOCK_MENU_CATEGORIES.map((category) => (
          <div key={category.id} id={category.id} className="scroll-mt-44 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
              {category.name}
              <div className="h-px bg-border flex-1" />
            </h2>
            
            <div className="space-y-6">
              {category.items.map((item) => (
                <div key={item.id} className="group flex gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{item.name}</h3>
                      <span className="font-medium text-foreground">{MOCK_RESTAURANT.currency}{item.price}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
                    {item.available ? (
                      <Badge variant="secondary" className="mt-2 text-[10px] uppercase tracking-wider font-semibold">Popular</Badge>
                    ) : (
                      <Badge variant="destructive" className="mt-2">Sold Out</Badge>
                    )}
                  </div>
                  {item.image && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy" 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Floating Action Button (for future ordering) */}
      <div className="fixed bottom-6 right-6 z-50">
         {/* Placeholder for cart or call waiter button */}
      </div>
    </div>
  );
}
