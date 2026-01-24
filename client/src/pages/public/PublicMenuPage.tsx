import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useParams } from "wouter";
import { usePublicMenu } from "@/hooks/api";
import type { MenuCategory, MenuItem } from "@/types";
import foodImg from "@assets/generated_images/exquisite_red_gourmet_dish.png";

const TRANSLATIONS: Record<string, { search: string; categories: string; soldOut: string; popular: string; available: string }> = {
  en: { search: "Search dishes...", categories: "Categories", soldOut: "Sold Out", popular: "Popular", available: "Available" },
  es: { search: "Buscar platos...", categories: "Categorías", soldOut: "Agotado", popular: "Popular", available: "Disponible" },
  hi: { search: "डिश खोजें...", categories: "श्रेणियाँ", soldOut: "खत्म", popular: "लोकप्रिय", available: "उपलब्ध" }
};

export default function PublicMenuPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<'veg' | 'non-veg' | 'any'>('any');

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const { data: menuData, isLoading, error } = usePublicMenu(slug ?? null, dietaryFilter);

  // Organize items by category
  const categoriesWithItems = useMemo(() => {
    if (!menuData?.categories || !menuData?.items) return [];
    
    return menuData.categories.map((cat: MenuCategory) => ({
      ...cat,
      items: menuData.items.filter((item: MenuItem) => item.categoryId === cat.id),
    }));
  }, [menuData]);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithItems;
    
    const query = searchQuery.toLowerCase();
    return categoriesWithItems
      .map(cat => ({
        ...cat,
        items: cat.items.filter((item: MenuItem) => 
          item.name.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query) ?? false)
        ),
      }))
      .filter(cat => cat.items.length > 0);
  }, [categoriesWithItems, searchQuery]);

  // Set initial active category and reset when filter changes
  useEffect(() => {
    if (categoriesWithItems.length > 0) {
      if (!activeCategory || !categoriesWithItems.find(cat => cat.id === activeCategory)) {
        setActiveCategory(categoriesWithItems[0].id);
      }
    }
  }, [categoriesWithItems, activeCategory, dietaryFilter]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const element = document.getElementById(catId);
    if (element) {
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.pageYOffset - 140,
        behavior: "smooth"
      });
    }
  };

  const restaurant = menuData?.restaurant;
  const currency = restaurant?.currency || "₹";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <p className="text-xl font-bold text-muted-foreground mb-2">Restaurant not found</p>
          <p className="text-muted-foreground">The menu you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 font-sans">
      {/* Hero Header */}
      <div className="h-64 relative overflow-hidden bg-primary">
        <img src={foodImg} alt="Hero" className="w-full h-full object-cover opacity-60 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-heading font-bold text-white shadow-text drop-shadow-lg">
            {restaurant?.name || "Restaurant"}
          </h1>
          <p className="text-white/80 text-sm flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Open Now • Deliciously crafted for you
          </p>
        </div>
      </div>

      {/* Sticky Controls */}
      <header className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-md transition-all border-b border-border/50",
        scrolled ? "py-2 shadow-lg" : "py-4"
      )}>
        <div className="container max-w-md mx-auto px-4">
          <div className="flex gap-2 items-center mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={t.search} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-muted/50 border-transparent rounded-2xl focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all" 
              />
            </div>
            <button 
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="w-11 h-11 rounded-2xl bg-muted/50 flex items-center justify-center text-primary"
            >
              <Globe className="w-5 h-5" />
            </button>
          </div>
          
          {showLangPicker && (
            <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2 duration-300">
              {Object.keys(TRANSLATIONS).map(l => (
                <button 
                  key={l}
                  onClick={() => { setLang(l); setShowLangPicker(false); }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border transition-all uppercase",
                    lang === l ? "bg-primary border-primary text-white" : "border-border text-muted-foreground"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Dietary Filter Buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDietaryFilter('any')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex-1",
                dietaryFilter === 'any'
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            <button
              onClick={() => setDietaryFilter('veg')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex-1",
                dietaryFilter === 'veg'
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              Veg
            </button>
            <button
              onClick={() => setDietaryFilter('non-veg')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex-1",
                dietaryFilter === 'non-veg'
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              Non-Veg
            </button>
          </div>

          {!searchQuery && categoriesWithItems.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 flex gap-2">
              {categoriesWithItems.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap",
                    activeCategory === cat.id
                      ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Menu List */}
      <main className="container max-w-md mx-auto px-4 pt-8 space-y-10">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-40">
              <h2 className="text-xl font-heading font-bold mb-6 flex items-center justify-between">
                {category.name}
                <span className="text-xs text-muted-foreground font-normal uppercase tracking-widest">
                  {category.items.length} Items
                </span>
              </h2>
              
              <div className="space-y-8">
                {category.items.map((item: MenuItem) => (
                  <div key={item.id} className={cn("flex gap-4 group", !item.isAvailable && "opacity-60")}>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                          {item.name}
                        </h3>
                        <span className="font-bold text-primary">{currency}{item.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2 italic">
                        {item.description || "Delicious dish prepared with care."}
                      </p>
                      <div className="flex items-center gap-2">
                        {item.isAvailable ? (
                          <Badge className="bg-green-50 text-green-700 border-green-100 hover:bg-green-50 px-2 py-0">
                            {t.available}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="px-2 py-0">{t.soldOut}</Badge>
                        )}
                        {item.dietaryTags?.map((tag, i) => {
                          const isVeg = tag.toLowerCase() === "veg";
                          const isNonVeg = tag.toLowerCase() === "non-veg";
                          return (
                            <Badge 
                              key={i} 
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5",
                                isVeg && "bg-green-100 text-green-800 border-green-200",
                                isNonVeg && "bg-red-100 text-red-800 border-red-200",
                                !isVeg && !isNonVeg && "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {tag}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    {item.imageUrl && (
                      <div className="w-24 h-24 rounded-3xl overflow-hidden bg-muted flex-shrink-0 shadow-2xl shadow-black/5 ring-1 ring-border/50">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 px-6 text-center pb-12">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-bold text-xl">Q</div>
        <p className="text-sm font-medium text-muted-foreground">Thank you for dining with us</p>
        <p className="text-xs text-muted-foreground mt-2">Powered by Qrave</p>
      </footer>
    </div>
  );
}
