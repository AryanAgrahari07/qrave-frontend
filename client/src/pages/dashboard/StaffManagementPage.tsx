import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Users, UserCircle, ChefHat, Trash2, Loader2, RefreshCw, ShieldCheck, Eye, Mail, Phone, Calendar, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type StaffRow = {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  role: "ADMIN" | "WAITER" | "KITCHEN";
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// Hooks for staff management
function useStaff(restaurantId: string | null) {
  return useQuery({
    queryKey: ["staff", restaurantId],
    queryFn: async () => {
      const res = await api.get<{ staff: StaffRow[] }>(`/api/restaurants/${restaurantId}/staff`);
      return res.staff ?? [];
    },
    enabled: !!restaurantId,
  });
}

function useCreateStaff(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { displayName: string; role: "admin" | "WAITER" | "KITCHEN"; email: string; phoneNumber?: string; passcode?: string }) => {
      const backendData = {
        fullName: data.displayName,
        role: data.role === "admin" ? "ADMIN" : data.role,
        email: data.email,
        phoneNumber: data.phoneNumber,
        passcode: data.passcode,
      };
      const res = await api.post<{ staff: StaffRow }>(`/api/restaurants/${restaurantId}/staff`, backendData);
      return res.staff;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", restaurantId] });
      toast.success("Staff member created successfully!");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create staff member"),
  });
}

function useDeleteStaff(restaurantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (staffId: string) => {
      await api.delete<{ deleted: boolean }>(`/api/restaurants/${restaurantId}/staff/${staffId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", restaurantId] });
      toast.success("Staff member removed");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to remove staff member"),
  });
}

export default function StaffManagementPage() {
  const { restaurantId } = useAuth();
  const { data: staff, isLoading, refetch } = useStaff(restaurantId);
  const createStaff = useCreateStaff(restaurantId);
  const deleteStaff = useDeleteStaff(restaurantId);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    role: "WAITER" as "admin" | "WAITER" | "KITCHEN",
    passcode: "",
  });

  const [selectedStaff, setSelectedStaff] = useState<StaffRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleSubmit = async () => {
    if (!formData.displayName || !formData.email) return;
    
    try {
      await createStaff.mutateAsync({
        displayName: formData.displayName,
        email: formData.email,
        phoneNumber: formData.phoneNumber || undefined,
        role: formData.role,
        passcode: formData.passcode || undefined,
      });
      setFormData({ displayName: "", email: "", phoneNumber: "", role: "WAITER", passcode: "" });
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    deleteStaff.mutate(staffId);
    setIsDetailsOpen(false);
  };

  const handleViewDetails = (staff: StaffRow) => {
    setSelectedStaff(staff);
    setIsDetailsOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "KITCHEN": return <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "WAITER": return <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "ADMIN": return <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />;
      default: return <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "KITCHEN": return "secondary";
      case "WAITER": return "outline";
      case "ADMIN": return "default";
      default: return "outline";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Staff Management</h2>
            <p className="text-sm sm:text-base text-gray-600">Manage your team members and their access.</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} className="shrink-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Add Staff Form */}
          <Card className="lg:col-span-1">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Add Staff Member
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Create credentials for team members.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Full Name</Label>
                  <Input 
                    placeholder="John Doe" 
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <Input 
                    type="email"
                    placeholder="john@restaurant.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Phone Number (Optional)</Label>
                  <Input 
                    type="tel"
                    placeholder="+1 234 567 8900" 
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Role</Label>
                  <select 
                    className="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "WAITER" | "KITCHEN" })}
                  >
                    <option value="WAITER">Waiter</option>
                    <option value="KITCHEN">Kitchen Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Passcode (Optional)</Label>
                  <Input 
                    type="password" 
                    placeholder="4-digit PIN" 
                    maxLength={4} 
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    className="h-9 sm:h-10 text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-gray-500">Used for quick terminal login</p>
                </div>
                <Button 
                  onClick={handleSubmit} 
                  className="w-full h-9 sm:h-10 text-sm" 
                  disabled={createStaff.isPending || !formData.displayName || !formData.email}
                >
                  {createStaff.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Staff Member
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Staff List */}
          <Card className="lg:col-span-2">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Team Members ({staff?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {staff && staff.length > 0 ? (
                <div className="divide-y divide-border">
                  {staff.map((s) => (
                    <div key={s.id} className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className={cn(
                          "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0",
                          s.role === "KITCHEN" ? "bg-orange-100 text-orange-600" :
                          s.role === "ADMIN" ? "bg-blue-100 text-blue-600" :
                          "bg-green-100 text-green-600"
                        )}>
                          {getRoleIcon(s.role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm sm:text-base truncate">{s.fullName}</p>
                          {s.email ? (
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">{s.email}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <Badge variant={getRoleBadgeVariant(s.role) as any} className="text-xs">
                          {s.role}
                        </Badge>
                        <Badge variant={s.isActive ? "outline" : "destructive"} className="text-xs">
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex gap-1 sm:gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={() => handleViewDetails(s)}
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 sm:h-9 sm:w-9 text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(s.id)}
                            disabled={deleteStaff.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm sm:text-base text-gray-500">No staff members yet</p>
                  <p className="text-xs sm:text-sm text-gray-400">Add your first team member using the form.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Staff Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 sm:gap-3">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0",
                  selectedStaff?.role === "KITCHEN" ? "bg-orange-100 text-orange-600" :
                  selectedStaff?.role === "ADMIN" ? "bg-blue-100 text-blue-600" :
                  "bg-green-100 text-green-600"
                )}>
                  {selectedStaff && getRoleIcon(selectedStaff.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl font-bold truncate">{selectedStaff?.fullName}</div>
                  <div className="text-xs sm:text-sm font-normal text-gray-500">Staff Details</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {selectedStaff && (
              <div className="space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Full Name</Label>
                      <p className="font-medium text-sm sm:text-base break-words">{selectedStaff.fullName}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Status</Label>
                      <div>
                        <Badge variant={selectedStaff.isActive ? "outline" : "destructive"} className="text-xs">
                          {selectedStaff.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Email
                      </Label>
                      <p className="font-medium text-sm sm:text-base break-all">{selectedStaff.email || "Not provided"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Phone Number
                      </Label>
                      <p className="font-medium text-sm sm:text-base">{selectedStaff.phoneNumber || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Role & Permissions */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    Role & Permissions
                  </h3>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Role</Label>
                    <div>
                      <Badge variant={getRoleBadgeVariant(selectedStaff.role) as any} className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                        {selectedStaff.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedStaff.role === "ADMIN" && "Full administrative access to the system"}
                      {selectedStaff.role === "WAITER" && "Can manage orders and customer interactions"}
                      {selectedStaff.role === "KITCHEN" && "Can view and update kitchen orders"}
                    </p>
                  </div>
                </div>

                {/* Activity Information */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    Activity
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Created At</Label>
                      <p className="font-medium text-xs sm:text-sm">{formatDate(selectedStaff.createdAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Last Updated</Label>
                      <p className="font-medium text-xs sm:text-sm">{formatDate(selectedStaff.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="h-9 sm:h-10 text-sm">
                    Close
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDelete(selectedStaff.id)}
                    disabled={deleteStaff.isPending}
                    className="h-9 sm:h-10 text-sm"
                  >
                    {deleteStaff.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Remove Staff
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}