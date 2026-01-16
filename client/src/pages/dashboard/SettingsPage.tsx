
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, Bell, Lock, Store, Languages } from "lucide-react";
import { MOCK_RESTAURANT } from "@/lib/mockData";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        <div>
          <h2 className="text-3xl font-heading font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your platform configuration and preferences.</p>
        </div>

        <div className="grid gap-8">
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
                <Store className="w-5 h-5 text-primary" />
                <CardTitle>Restaurant Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input defaultValue={MOCK_RESTAURANT.name} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input defaultValue="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input defaultValue="123 Culinary Ave, Food City" />
              </div>
              <Button>Save Changes</Button>
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
