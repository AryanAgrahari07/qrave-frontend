import { useState, useEffect, useMemo, useRef, useCallback, memo, useDeferredValue } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Globe,
  Loader2,
  ChevronRight,
  Plus,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  Navigation,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Input } from "@/components/ui/input";
import { useParams } from "wouter";
import { usePublicMenu } from "@/hooks/api";
import type { MenuCategory, MenuItem, RestaurantSettings } from "@/types";
import foodImg from "@assets/generated_images/exquisite_red_gourmet_dish.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TRANSLATIONS: Record<string, {
  search: string;
  categories: string;
  soldOut: string;
  popular: string;
  available: string;
  all: string;
  veg: string;
  nonVeg: string;
  variants: string;
  addOns: string;
  viewDetails: string;
  close: string;
}> = {
  en: {
    search: "Search dishes...",
    categories: "Categories",
    soldOut: "Sold Out",
    popular: "Popular",
    available: "Available",
    all: "All",
    veg: "Veg",
    nonVeg: "Non-Veg",
    variants: "Size Options",
    addOns: "Add-ons",
    viewDetails: "View Options",
    close: "Close"
  },
  hi: {
    search: "डिश खोजें...",
    categories: "श्रेणियाँ",
    soldOut: "खत्म",
    popular: "लोकप्रिय",
    available: "उपलब्ध",
    all: "सभी",
    veg: "शाकाहारी",
    nonVeg: "मांसाहारी",
    variants: "आकार विकल्प",
    addOns: "अतिरिक्त",
    viewDetails: "विकल्प देखें",
    close: "बंद करें"
  }
};

/**
 * Returns the translated string for the given language.
 * Falls back to English, then to the raw fallback value.
 */
function getTranslated(
  translations: Record<string, string> | undefined | null,
  lang: string,
  fallback: string
): string {
  if (!translations) return fallback;
  return translations[lang] || translations["en"] || fallback;
}

// Customization Dialog Component
function ItemCustomizationDialog({
  item,
  currency,
  t,
  lang,
  open,
  onOpenChange
}: {
  item: MenuItem | null;
  currency: string;
  t: typeof TRANSLATIONS.en;
  lang: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  const hasVariants = item.variants && item.variants.length > 0;
  const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;

  const displayName = getTranslated(item.nameTranslations, lang, item.name);
  const displayDescription = item.description
    ? getTranslated(item.descriptionTranslations, lang, item.description)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8">
            {displayName}
          </DialogTitle>
          {displayDescription && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {displayDescription}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Variants Section */}
          {hasVariants && (
            <div>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center">
                {t.variants}
              </h3>
              <div className="space-y-2">
                {item.variants?.map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">
                        {getTranslated(
                          (variant as any).nameTranslations ?? variant.variantNameTranslations,
                          lang,
                          variant.variantName
                        )}
                      </span>
                      {variant.isDefault && (
                        <Badge className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <span className="text-base font-bold text-primary">
                      {currency}{variant.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modifiers Section */}
          {hasModifiers && (
            <div className="space-y-4">
              {item.modifierGroups?.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-1">
                      {getTranslated((group as any).nameTranslations, lang, group.name)}
                      {group.isRequired && (
                        <span className="text-red-500 text-base">*</span>
                      )}
                    </h3>
                    {(group.minSelections || group.maxSelections) && (
                      <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                        {group.minSelections && `Min ${group.minSelections}`}
                        {group.minSelections && group.maxSelections && " • "}
                        {group.maxSelections && `Max ${group.maxSelections}`}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.modifiers?.map((modifier) => (
                      <div
                        key={modifier.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">{getTranslated(modifier.nameTranslations, lang, modifier.name)}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          +{currency}{modifier.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Item Card Component
const MenuItemCard = memo(function MenuItemCard({
  item,
  currency,
  lang,
  t,
  onOpenCustomization
}: {
  item: MenuItem;
  currency: string;
  lang: string;
  t: typeof TRANSLATIONS.en;
  onOpenCustomization: (item: MenuItem) => void;
}) {
  const hasVariants = item.variants && item.variants.length > 0;
  const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;
  const hasCustomizations = hasVariants || hasModifiers;

  const displayName = getTranslated(item.nameTranslations, lang, item.name);
  const displayDesc = item.description
    ? getTranslated(item.descriptionTranslations, lang, item.description)
    : null;

  return (
    <div className={cn(
      "group relative",
      !item.isAvailable && "opacity-50"
    )}>
      <div className="flex gap-3 sm:gap-4">
        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-sm sm:text-base leading-snug group-hover:text-primary transition-colors">
              {displayName}
            </h3>
            {!hasVariants && (
              <span className="text-sm sm:text-base font-semibold text-primary whitespace-nowrap">
                {currency}{item.price}
              </span>
            )}
          </div>

          {displayDesc && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2 line-clamp-2">
              {displayDesc}
            </p>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {!item.isAvailable && (
              <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 py-0 h-5">
                {t.soldOut}
              </Badge>
            )}
            {item.dietaryTags?.map((tag, i) => {
              const isVeg = tag.toLowerCase() === "veg";
              const isNonVeg = tag.toLowerCase() === "non-veg";
              return (
                <Badge
                  key={i}
                  className={cn(
                    "text-[10px] sm:text-xs px-1.5 py-0 h-5 font-medium",
                    isVeg && "bg-green-50 text-green-700 border-green-200",
                    isNonVeg && "bg-red-50 text-red-700 border-red-200",
                    !isVeg && !isNonVeg && "bg-muted text-muted-foreground"
                  )}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>

          {/* View Customization Button */}
          {hasCustomizations && (
            <button
              onClick={() => onOpenCustomization(item)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <span>{t.viewDetails}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Item Image */}
        {item.imageUrl && (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-muted flex-shrink-0 shadow-sm ring-1 ring-border/30">
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default function PublicMenuPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<'veg' | 'non-veg' | 'any'>('any');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [customizationDialogOpen, setCustomizationDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const hasInitializedExpansion = useRef(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const { data: menuData, isLoading, error } = usePublicMenu(slug ?? null, dietaryFilter);

  // Organize items by category
  const categoriesWithItems = useMemo(() => {
    if (!menuData?.categories || !menuData?.items) return [];

    return menuData.categories
      .map((cat: MenuCategory) => ({
        ...cat,
        items: menuData.items.filter((item: MenuItem) => item.categoryId === cat.id),
      }))
      .filter(cat => cat.items.length > 0); // Only show categories with items
  }, [menuData]);

  // Initialize all categories as expanded by default (only once on mount)
  useEffect(() => {
    if (categoriesWithItems.length > 0 && !hasInitializedExpansion.current) {
      setExpandedCategories(new Set(categoriesWithItems.map(cat => cat.id)));
      hasInitializedExpansion.current = true;
    }
  }, [categoriesWithItems]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!deferredSearchQuery.trim()) return categoriesWithItems;

    const query = deferredSearchQuery.toLowerCase();
    return categoriesWithItems
      .map(cat => ({
        ...cat,
        items: cat.items.filter((item: MenuItem) =>
          item.name.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query) ?? false)
        ),
      }))
      .filter(cat => cat.items.length > 0);
  }, [categoriesWithItems, deferredSearchQuery]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleOpenCustomization = useCallback((item: MenuItem) => {
    setSelectedItem(item);
    setCustomizationDialogOpen(true);
  }, []);

  const toggleCategoryExpand = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const restaurant = menuData?.restaurant;
  const currency = restaurant?.currency || "₹";

  // Calculate if restaurant is currently open based on settings
  const isOpen = useMemo(() => {
    if (!restaurant) return true; // Default to true if not loaded
    const settings = restaurant.settings as RestaurantSettings | undefined;
    const openTime = settings?.timings?.openTime;
    const closeTime = settings?.timings?.closeTime;

    if (!openTime || !closeTime) return true; // If no timings set, assume always open

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;

    const [openH, openM] = openTime.split(':').map(Number);
    const openTimeMinutes = openH * 60 + openM;

    const [closeH, closeM] = closeTime.split(':').map(Number);
    const closeTimeMinutes = closeH * 60 + closeM;

    if (closeTimeMinutes >= openTimeMinutes) {
      // Normal case: e.g. 09:00 to 22:00
      return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
    } else {
      // Overnight case: e.g. 18:00 to 02:00 next day
      return currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
    }
  }, [restaurant]);

  const addressParts = [
    restaurant?.addressLine1,
    restaurant?.addressLine2,
    restaurant?.city,
    restaurant?.state,
    restaurant?.postalCode,
    restaurant?.country,
  ].filter(Boolean) as string[];

  const addressText = addressParts.join(", ");

  // Prefer explicitly saved googleMapsLink; fall back to a query-based directions URL.
  const directionsUrl = restaurant?.googleMapsLink
    ? restaurant.googleMapsLink
    : addressText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`
      : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 font-sans animate-pulse">
        {/* Hero Skeleton */}
        <div className="h-48 sm:h-56 bg-muted relative">
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-8 w-1/2 bg-muted-foreground/20 rounded-lg mb-2" />
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-muted-foreground/20 rounded-md" />
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-full bg-muted-foreground/20" />
                <div className="h-8 w-8 rounded-full bg-muted-foreground/20" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls Skeleton */}
        <div className="container max-w-lg mx-auto px-4 py-3 border-b border-border/40">
          <div className="flex gap-2 mb-2">
            <div className="h-10 flex-1 bg-muted rounded-xl" />
            <div className="h-10 w-10 bg-muted rounded-xl" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 flex-1 bg-muted rounded-lg" />
            <div className="h-8 flex-1 bg-muted rounded-lg" />
            <div className="h-8 flex-1 bg-muted rounded-lg" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="container max-w-lg mx-auto px-4 mt-6 space-y-8">
          {[1, 2, 3].map((cat) => (
            <div key={cat} className="space-y-4">
              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                <div className="h-5 w-1/3 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
              <div className="space-y-4 px-2">
                {[1, 2].map((item) => (
                  <div key={item} className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 w-2/3 bg-muted rounded" />
                        <div className="h-4 w-12 bg-muted rounded" />
                      </div>
                      <div className="h-3 w-full bg-muted rounded" />
                      <div className="h-3 w-4/5 bg-muted rounded" />
                    </div>
                    <div className="h-20 w-20 sm:h-24 sm:w-24 bg-muted rounded-2xl flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <p className="text-lg font-semibold text-muted-foreground mb-1">Restaurant not found</p>
          <p className="text-sm text-muted-foreground">The menu you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 font-sans">
      {/* Hero Header */}
      <div className="h-48 sm:h-56 relative overflow-hidden bg-primary">
        <img src={foodImg} alt="Hero" loading="eager" className="w-full h-full object-cover opacity-50 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/10" />
        <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white drop-shadow-lg">
            {restaurant?.name || "Restaurant"}
          </h1>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            {isOpen ? (
              <p className="text-white/70 text-xs sm:text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Open Now
              </p>
            ) : (
              <p className="text-white/70 text-xs sm:text-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Closed
              </p>
            )}

            <div className="flex items-center gap-1">
              {/* Address action */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center",
                      "h-8 w-8 rounded-full",
                      "bg-white/10 text-white hover:bg-white/15",
                      "transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      "disabled:opacity-50 disabled:pointer-events-none"
                    )}
                    disabled={!addressText}
                    aria-label="Address"
                    title="Address"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Address</DialogTitle>
                  </DialogHeader>
                  {addressText ? (
                    <div className="space-y-3">
                      <p className="text-sm text-foreground leading-relaxed">{addressText}</p>
                      {directionsUrl && (
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2",
                            "bg-primary text-primary-foreground text-sm font-semibold",
                            "hover:bg-primary/90 transition-colors"
                          )}
                        >
                          <Navigation className="w-4 h-4" />
                          Open in Google Maps
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Address not available.</p>
                  )}
                </DialogContent>
              </Dialog>

              {/* Contact action */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center",
                      "h-8 w-8 rounded-full",
                      "bg-white/10 text-white hover:bg-white/15",
                      "transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      "disabled:opacity-50 disabled:pointer-events-none"
                    )}
                    disabled={!restaurant?.phoneNumber && !restaurant?.email}
                    aria-label="Contact"
                    title="Contact"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Contact</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {restaurant?.phoneNumber ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{restaurant.phoneNumber}</span>
                        </div>
                        <a
                          className="text-sm font-semibold text-primary hover:underline"
                          href={`tel:${restaurant.phoneNumber}`}
                        >
                          Call
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Phone number not available.</p>
                    )}

                    {restaurant?.email && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{restaurant.email}</span>
                        </div>
                        <a
                          className="text-sm font-semibold text-primary hover:underline"
                          href={`mailto:${restaurant.email}`}
                        >
                          Email
                        </a>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Controls */}
      <header className={cn(
        "sticky top-0 z-40 bg-background backdrop-blur-md transition-all border-b border-border/40",
        scrolled ? "py-2 pb-2" : "py-3 pb-3"
      )}>
        <div className="container max-w-lg mx-auto px-4">
          <div className="flex gap-2 items-center mb-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-9 h-9 sm:h-10 text-xs sm:text-sm bg-muted/30 border-transparent rounded-xl focus:bg-background focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted/30 flex items-center justify-center text-primary hover:bg-muted/50 transition-colors"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted/30 flex items-center justify-center text-primary hover:bg-muted/50 transition-colors"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>

          {showLangPicker && (
            <div className="flex gap-1.5 mb-2.5 animate-in slide-in-from-top-2 duration-300">
              {Object.keys(TRANSLATIONS).map(l => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setShowLangPicker(false); }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border transition-all uppercase",
                    lang === l
                      ? "bg-primary border-primary text-white"
                      : "border-border/50 text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Dietary Filter Buttons */}
          <div className="flex gap-1.5 sm:gap-2 mb-0">
            <button
              onClick={() => setDietaryFilter('any')}
              className={cn(
                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex-1",
                dietaryFilter === 'any'
                  ? "bg-primary/90 text-white shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {t.all}
            </button>
            <button
              onClick={() => setDietaryFilter('veg')}
              className={cn(
                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex-1",
                dietaryFilter === 'veg'
                  ? "bg-green-500 text-white shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {t.veg}
            </button>
            <button
              onClick={() => setDietaryFilter('non-veg')}
              className={cn(
                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex-1",
                dietaryFilter === 'non-veg'
                  ? "bg-red-500 text-white shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {t.nonVeg}
            </button>
          </div>
        </div>
      </header>

      {/* Menu List */}
      <main className="container max-w-lg mx-auto px-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No items found</p>
          </div>
        ) : (
          filteredCategories.map((category, index) => {
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id}>
                {/* Category header - Collapsible */}
                <button
                  onClick={() => toggleCategoryExpand(category.id)}
                  className={cn(
                    "w-[calc(100%+2rem)] flex items-center justify-between sticky z-30 -mx-4 px-4 py-3",
                    "bg-background border-b border-border/40 hover:bg-muted/20 transition-colors",
                    scrolled ? "top-[85px]" : "top-[97px]"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground transition-transform flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground transition-transform flex-shrink-0" />
                    )}
                    <h2 className="text-sm sm:text-base font-bold truncate">
                      {getTranslated(category.nameTranslations, lang, category.name)}
                    </h2>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium whitespace-nowrap ml-2">
                    {category.items.length} items
                  </span>
                </button>

                {/* Items - Only shown when expanded */}
                {isExpanded && (
                  <div className="py-4 space-y-5 sm:space-y-6">
                    {category.items.map((item: MenuItem) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        currency={currency}
                        lang={lang}
                        t={t}
                        onOpenCustomization={handleOpenCustomization}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Customization Dialog */}
      <ItemCustomizationDialog
        item={selectedItem}
        currency={currency}
        t={t}
        lang={lang}
        open={customizationDialogOpen}
        onOpenChange={setCustomizationDialogOpen}
      />

      {/* Footer */}
      <footer className="mt-16 px-4 text-center pb-8">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2.5 text-primary font-bold text-lg">
          Q
        </div>
        <p className="text-xs font-medium text-muted-foreground">Thank you for dining with us</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">Powered by Order<span className="text-primary">zi</span></p>
      </footer>
    </div>
  );
}