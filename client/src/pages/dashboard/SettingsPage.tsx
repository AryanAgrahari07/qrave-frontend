
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, Bell, Lock, Store, Languages } from "lucide-react";
import { MOCK_RESTAURANT } from "@/lib/mockData";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Store, 
  Utensils, 
  Coffee, 
  LayoutDashboard, 
  Cloud, 
  IceCream, 
  Croissant, 
  Beer, 
  Pizza, 
  Layers,
  Globe,
  Bell,
  Lock,
  Languages
} from "lucide-react";
import { toast } from "sonner";

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
  const [shopType, setShopType] = useState("cafe");

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Store Settings</h2>
          <p className="text-muted-foreground">Configure your restaurant profile and operations.</p>
        </div>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <CardTitle>Business Profile</CardTitle>
              </div>
              <CardDescription>Update your restaurant details and business category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input defaultValue={MOCK_RESTAURANT.name} />
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal h-10">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const TypeIcon = SHOP_TYPES.find(t => t.id === shopType)?.icon || Store;
                            return <TypeIcon className="w-4 h-4 text-primary" />;
                          })()}
                          {SHOP_TYPES.find(t => t.id === shopType)?.label || "Select Type..."}
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Select Business Type</DialogTitle>
                        <DialogDescription>Choose the category that best describes your establishment.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <RadioGroup value={shopType} onValueChange={setShopType} className="grid grid-cols-2 gap-3">
                          {SHOP_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                              <div key={type.id}>
                                <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                                <Label
                                  htmlFor={type.id}
                                  className="flex flex-col h-full rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                                >
                                  <Icon className="mb-2 h-5 w-5 text-primary" />
                                  <span className="font-bold text-sm">{type.label}</span>
                                  <span className="text-[10px] text-muted-foreground leading-tight mt-1">{type.desc}</span>
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                      <DialogFooter>
                        <Button className="w-full" onClick={() => toast.success("Business type updated!")}>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input defaultValue="123 Culinary Ave, Food City" />
              </div>
              <Button>Save Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-primary" />
                <CardTitle>Language Support</CardTitle>
              </div>
              <CardDescription>Enable multiple languages for your digital menu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium">English (Default)</p>
                  <p className="text-sm text-muted-foreground">Main language for your menu</p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium">Spanish</p>
                  <p className="text-sm text-muted-foreground">Enable Spanish translations</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium">Hindi</p>
                  <p className="text-sm text-muted-foreground">Enable Hindi translations</p>
                </div>
                <Switch />
              </div>
              <Button variant="outline" className="w-full">Add New Language</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Email reports</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>Table occupancy alerts</Label>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
