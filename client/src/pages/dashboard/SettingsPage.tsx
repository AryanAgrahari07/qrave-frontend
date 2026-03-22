import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Bell,
  Store,
  Languages,
  Utensils,
  Coffee,
  LayoutDashboard,
  Cloud,
  IceCream,
  Croissant,
  Beer,
  Pizza,
  Layers,
  Check,
  ChevronsUpDown,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRestaurant, useUpdateRestaurant, useCountries, useStates, useCities, useCurrencies } from "@/hooks/api";
import type { RestaurantSettings, LocationOption, CurrencyOption } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { MenuBackgroundSelector } from "@/components/menu-background/MenuBackgroundSelector";

const SHOP_TYPES = [
  { id: "fine-dine", label: "Fine Dine", icon: Utensils, desc: "Premium dining experience with table service." },
  { id: "qsr", label: "QSR", icon: Store, desc: "Quick Service Restaurant / Fast Food." },
  { id: "cafe", label: "Cafe", icon: Coffee, desc: "Coffee, snacks, and casual seating." },
  { id: "food-court", label: "Food Court", icon: LayoutDashboard, desc: "Counter service in a shared dining area." },
  { id: "cloud-kitchen", label: "Cloud Kitchen", icon: Cloud, desc: "Delivery-only kitchen model." },
  { id: "ice-cream", label: "Ice Cream & Dessert", icon: IceCream, desc: "Sweet treats and frozen desserts." },
  { id: "bakery", label: "Bakery", icon: Croissant, desc: "Fresh bread, cakes, and pastries." },
  { id: "bar", label: "Bar & Brewery", icon: Beer, desc: "Drinks and brewery focus." },
  { id: "pizzeria", label: "Pizzeria", icon: Pizza, desc: "Specialized pizza restaurant." },
  { id: "large-chain", label: "Large Chain", icon: Layers, desc: "Multi-outlet corporate structure." },
];

export default function SettingsPage() {
  const { restaurantId } = useAuth();
  const { subscription } = useSubscription();
  const { data: restaurant } = useRestaurant(restaurantId);
  const updateRestaurant = useUpdateRestaurant();

  let daysRemaining = null;
  if (subscription?.subscriptionValidUntil) {
    const diff = new Date(subscription.subscriptionValidUntil).getTime() - new Date().getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }

  // An active subscription is one where:
  // (a) daysRemaining > 0 (validUntil is set and in the future), OR
  // (b) subscriptionStatus is ACTIVE and validUntil is null (trial with old bug)
  const isActiveSubscription =
    (daysRemaining !== null && daysRemaining > 0) ||
    (daysRemaining === null && subscription?.subscriptionStatus === "ACTIVE");

  const [shopType, setShopType] = useState("cafe");
  const [shopTypeOpen, setShopTypeOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showMenuBg, setShowMenuBg] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [taxRateGst, setTaxRateGst] = useState("5.00");
  const [taxRateService, setTaxRateService] = useState("10.00");
  const [gstNumber, setGstNumber] = useState("");
  const [fssaiNumber, setFssaiNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [spanishEnabled, setSpanishEnabled] = useState(false);
  const [hindiEnabled, setHindiEnabled] = useState(false);
  const [emailReports, setEmailReports] = useState(true);
  const [tableAlerts, setTableAlerts] = useState(false);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");

  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");

  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);

  // Popover open states
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const { data: countryOptions, isLoading: loadingCountries } = useCountries(countrySearch);
  const { data: stateOptions, isLoading: loadingStates } = useStates(selectedCountryCode, stateSearch);
  const { data: cityOptions, isLoading: loadingCities } = useCities(
    selectedCountryCode,
    selectedStateCode,
    citySearch
  );
  const { data: currencyOptions, isLoading: loadingCurrencies } = useCurrencies(currencySearch);

  useEffect(() => {
    if (!restaurant) return;

    setRestaurantName(restaurant.name ?? "");
    setSlug(restaurant.slug ?? "");
    setAddressLine1(restaurant.addressLine1 ?? "");
    
    const savedType = restaurant.type;
    let matchedTypeId = "cafe";
    if (savedType) {
      const match = SHOP_TYPES.find(
        t => t.id === savedType || t.label.toLowerCase() === savedType.toLowerCase()
      );
      if (match) {
        matchedTypeId = match.id;
      } else if (savedType.toLowerCase().includes("restaurant") || savedType.toLowerCase().includes("fine")) {
        matchedTypeId = "fine-dine";
      } else if (savedType.toLowerCase().includes("fast food") || savedType.toLowerCase().includes("truck")) {
        matchedTypeId = "qsr";
      } else if (savedType.toLowerCase().includes("bar")) {
        matchedTypeId = "bar";
      }
    }
    setShopType(matchedTypeId);

    setCity(restaurant.city ?? "");
    setState(restaurant.state ?? "");
    setPostalCode(restaurant.postalCode ?? "");
    setCountry(restaurant.country ?? "India");
    setCurrency(restaurant.currency ?? "₹");
    setTaxRateGst(restaurant.taxRateGst ?? "5.00");
    setTaxRateService(restaurant.taxRateService ?? "10.00");
    setGstNumber(restaurant.gstNumber ?? "");
    setFssaiNumber(restaurant.fssaiNumber ?? "");
    setEmail(restaurant.email ?? "");
    setPhoneNumber(restaurant.phoneNumber ?? "");
    setGoogleMapsLink(restaurant.googleMapsLink ?? "");

    const settings = (restaurant as { settings?: RestaurantSettings }).settings;
    const languages = settings?.languages;
    const notifications = settings?.notifications;
    const timings = settings?.timings;

    setSpanishEnabled(!!languages?.es);
    setHindiEnabled(!!languages?.hi);
    setEmailReports(notifications?.emailReports ?? true);
    setTableAlerts(notifications?.tableAlerts ?? false);
    setOpenTime(timings?.openTime || "");
    setCloseTime(timings?.closeTime || "");
  }, [restaurant]);

  // Auto-load countries on mount (search with empty string to get all)
  useEffect(() => {
    if (!selectedCountryCode && country && countryOptions) {
      // Try to find country code from initial country name
      const foundCountry = countryOptions?.find(c => c.name === country);
      if (foundCountry) {
        setSelectedCountryCode(foundCountry.code);
      }
    }
  }, [countryOptions, country, selectedCountryCode]);

  // Auto-load states when country is selected
  useEffect(() => {
    if (!selectedStateCode && state && selectedCountryCode && stateOptions) {
      // Try to find state code from initial state name
      const foundState = stateOptions?.find(s => s.name === state);
      if (foundState) {
        setSelectedStateCode(foundState.code);
      }
    }
  }, [stateOptions, state, selectedStateCode, selectedCountryCode]);

  async function handleSaveProfile() {
    if (!restaurantId) {
      toast.error("No restaurant selected");
      return;
    }

    try {
      const selectedType = SHOP_TYPES.find((t) => t.id === shopType)?.label;
      const updated = await updateRestaurant.mutateAsync({
        id: restaurantId,
        data: {
          name: restaurantName,
          slug,
          type: selectedType,
          addressLine1,
          city,
          state,
          postalCode,
          country: country || "India",
          currency: currency || "₹",
          taxRateGst,
          taxRateService,
          gstNumber: gstNumber || undefined,
          fssaiNumber: fssaiNumber || undefined,
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
          googleMapsLink: googleMapsLink || undefined,
          settings: {
            ...((restaurant as { settings?: RestaurantSettings })?.settings || {}),
            timings: { openTime, closeTime },
          },
        },
      });
      // Keep local state in sync with saved value
      if (updated?.slug) setSlug(updated.slug);
      toast.success("Profile saved!");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save profile");
      }
    }
  }

  async function handleSavePreferences() {
    if (!restaurantId) {
      toast.error("No restaurant selected");
      return;
    }

    try {
      const existingSettings = (restaurant as { settings?: RestaurantSettings } | undefined)?.settings ?? {};
      const nextSettings: RestaurantSettings = {
        ...existingSettings,
        languages: {
          ...(existingSettings.languages ?? {}),
          es: spanishEnabled,
          hi: hindiEnabled,
        },
        notifications: {
          ...(existingSettings.notifications ?? {}),
          emailReports,
          tableAlerts,
        },
      };

      await updateRestaurant.mutateAsync({
        id: restaurantId,
        data: {
          settings: nextSettings,
        },
      });
      toast.success("Settings saved!");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to save settings");
      }
    }
  }

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl px-4 sm:px-0">
          <h2 className="text-xl sm:text-2xl font-heading font-bold mb-2">Store Settings</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            No restaurant is selected. Please log in or complete onboarding to configure settings.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl w-full mx-auto px-2 sm:px-0 pb-6 sm:pb-8">
        <div className="grid gap-4 sm:gap-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-transparent overflow-hidden relative shadow-sm">
            <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] pointer-events-none">
              <Crown className="w-48 h-48" />
            </div>
            <CardHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-2 sm:pb-4 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                  Subscription Plan
                </CardTitle>
              </div>
              <CardDescription className="text-sm font-medium text-muted-foreground">
                Manage your Order<span className="text-primary">zi</span> plan, billing features, and renewals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6 pb-5 sm:pb-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 bg-card/80 backdrop-blur-sm rounded-xl border border-primary/10 shadow-sm gap-4 transition-all hover:shadow-md">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <p className="font-extrabold text-lg sm:text-xl text-foreground tracking-tight">
                      {subscription?.plan || "Trial"} Plan
                    </p>
                    {isActiveSubscription ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                    {isActiveSubscription
                      ? daysRemaining !== null && daysRemaining > 0
                        ? <><Check className="w-4 h-4 text-green-500" /> {daysRemaining} days remaining in your billing cycle</>
                        : <><Check className="w-4 h-4 text-green-500" /> Trial active — expiry date loading&hellip;</>
                      : daysRemaining === 0
                        ? "Your subscription has expired."
                        : "No active subscription found"}
                  </p>
                </div>
                <Link href="/admin/subscription-expired">
                  <Button
                    className={cn(
                      "w-full sm:w-auto shadow-sm hover:shadow-md transition-all font-semibold",
                      !isActiveSubscription ? "animate-pulse" : ""
                    )}
                    size="lg"
                  >
                    {isActiveSubscription ? "Upgrade / Renew" : "Subscribe Now"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
              <CardTitle>Business Profile</CardTitle>
              {/* <CardDescription>
                Update your restaurant details.
              </CardDescription> */}
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              <div>
                <Label>Restaurant Name</Label>
                <Input
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <Label>Public Menu Link (Slug)</Label>
                <Input
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, ""),
                    )
                  }
                  placeholder="e.g. my-restaurant"
                  className="text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {/* Your menu URL: <span className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}/r/{slug || '—'}</span> */}
                </p>
                <p className="text-xs text-muted-foreground">
                  Slug must be unique. Use only lowercase letters, numbers and hyphens.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Business Type</Label>
                <Dialog open={shopTypeOpen} onOpenChange={setShopTypeOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal h-10 text-sm">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const selected = SHOP_TYPES.find(t => t.id === shopType);
                          const TypeIcon = selected?.icon || Store;
                          return <TypeIcon className="w-4 h-4 text-primary flex-shrink-0" />;
                        })()}
                        <span className="truncate">{SHOP_TYPES.find(t => t.id === shopType)?.label || "Select Type..."}</span>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl">Select Business Type</DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm">Choose the category that best describes your establishment.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <RadioGroup value={shopType} onValueChange={setShopType} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SHOP_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <div key={type.id}>
                              <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                              <Label
                                htmlFor={type.id}
                                className="flex flex-col h-full rounded-xl border-2 border-muted bg-popover p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                              >
                                <Icon className="mb-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                <span className="font-bold text-xs sm:text-sm">{type.label}</span>
                                <span className="text-[10px] text-muted-foreground leading-tight mt-1">{type.desc}</span>
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                    <DialogFooter>
                      <Button className="w-full text-sm" onClick={() => {
                        setShopTypeOpen(false);
                        toast.success("Business type updated!");
                      }}>Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street, building, locality"
                  className="text-sm"
                />
              </div>



              {/* State Selector */}
              <div>
                <Label>State</Label>
                <Popover open={stateOpen} onOpenChange={setStateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={!selectedCountryCode}
                      className="w-full justify-between text-sm"
                    >
                      {state || "Select state"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search state..."
                        value={stateSearch}
                        onValueChange={setStateSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {loadingStates ? "Loading..." : "No states found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {(stateOptions || []).map((s) => (
                            <CommandItem
                              key={s.code}
                              value={s.name}
                              onSelect={() => {
                                setState(s.name);
                                setSelectedStateCode(s.code);
                                setCity("");
                                setStateOpen(false);
                              }}
                              className="text-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  state === s.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {s.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* City Selector */}
              <div>
                <Label>City</Label>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={!selectedStateCode}
                      className="w-full justify-between text-sm"
                    >
                      {city || "Select city"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search city..."
                        value={citySearch}
                        onValueChange={setCitySearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {loadingCities ? "Loading..." : "No cities found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {(cityOptions || []).map((c) => (
                            <CommandItem
                              key={c.code}
                              value={c.name}
                              onSelect={() => {
                                setCity(c.name);
                                setCityOpen(false);
                              }}
                              className="text-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  city === c.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Postal Code</Label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="text-sm"
                />
              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label>GST %</Label>
                  <Input
                    type="number"
                    value={taxRateGst}
                    onChange={(e) => setTaxRateGst(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label>Service Tax %</Label>
                  <Input
                    type="number"
                    value={taxRateService}
                    onChange={(e) => setTaxRateService(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t mt-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Operating Hours</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label>Opening Time</Label>
                    <Input
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label>Closing Time</Label>
                    <Input
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t mt-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Contact & Regulatory Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="restaurant@example.com"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label>GST Number</Label>
                    <Input
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="22AAAAA0000A1Z5"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label>FSSAI Number</Label>
                    <Input
                      value={fssaiNumber}
                      onChange={(e) => setFssaiNumber(e.target.value)}
                      placeholder="12345678901234"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label>Google Maps Link</Label>
                  <Input
                    type="url"
                    value={googleMapsLink}
                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Share link for directions to your restaurant
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={updateRestaurant.isPending}
                className="w-full"
              >
                {updateRestaurant.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>

          {restaurantId && (
            <div className="space-y-4">
              {!showMenuBg ? (
                <Card 
                  className="cursor-pointer hover:border-primary/50 transition-colors" 
                  onClick={() => setShowMenuBg(true)}
                >
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image w-4 h-4 sm:w-5 sm:h-5 text-primary"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                      <div>
                        <CardTitle className="text-lg sm:text-xl">Menu Background</CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-1">
                          Customize your public menu's hero background and overlay filter.
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </CardHeader>
                </Card>
              ) : (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                  <MenuBackgroundSelector restaurantId={restaurantId} />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 hidden sm:flex gap-1"
                    onClick={() => setShowMenuBg(false)}
                  >
                    Close
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full sm:hidden mt-2"
                    onClick={() => setShowMenuBg(false)}
                  >
                    Close Background Settings
                    <ChevronUp className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* <Card>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Language Support</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">Enable multiple languages for your digital menu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm sm:text-base">English (Default)</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Main language for your menu</p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm sm:text-base">Spanish</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Enable Spanish translations</p>
                </div>
                <Switch
                  checked={spanishEnabled}
                  onCheckedChange={setSpanishEnabled}
                />
              </div>
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm sm:text-base">Hindi</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Enable Hindi translations</p>
                </div>
                <Switch
                  checked={hindiEnabled}
                  onCheckedChange={setHindiEnabled}
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                <Button variant="outline" className="flex-1 text-sm">Add New Language</Button>
                <Button onClick={handleSavePreferences} disabled={updateRestaurant.isPending} className="flex-1 sm:flex-none text-sm">
                  {updateRestaurant.isPending ? "Saving..." : "Save Language Settings"}
                </Button>
              </div>
            </CardContent>
          </Card> */}

          {/* <Card>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <CardTitle className="text-lg sm:text-xl">Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm sm:text-base">Email reports</Label>
                <Switch
                  checked={emailReports}
                  onCheckedChange={setEmailReports}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm sm:text-base">Table occupancy alerts</Label>
                <Switch
                  checked={tableAlerts}
                  onCheckedChange={setTableAlerts}
                />
              </div>
              <Button onClick={handleSavePreferences} disabled={updateRestaurant.isPending} className="w-full sm:w-auto text-sm">
                {updateRestaurant.isPending ? "Saving..." : "Save Notification Settings"}
              </Button>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </DashboardLayout>
  );
}