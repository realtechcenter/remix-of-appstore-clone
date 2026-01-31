import { useState, useEffect } from "react";
import { 
  Users, Search, Package, Plus, Trash2, ChevronLeft, ChevronRight,
  Mail, DollarSign, CheckCircle, Clock, XCircle, ShoppingBag, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { adminUsersApi, appsApi, type AdminUser, type AdminOrder, type App } from "@/lib/api";

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  paid: { icon: CheckCircle, className: "text-green-500", label: "Paid" },
  pending: { icon: Clock, className: "text-amber-500", label: "Pending" },
  failed: { icon: XCircle, className: "text-destructive", label: "Failed" },
  expired: { icon: XCircle, className: "text-muted-foreground", label: "Expired" },
};

export const UserManagement = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Selected user details
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userOrders, setUserOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Grant app dialog
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [grantAmount, setGrantAmount] = useState("0");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (showGrantDialog && apps.length === 0) {
      loadApps();
    }
  }, [showGrantDialog]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminUsersApi.getAll({
        search: searchQuery || undefined,
        page: currentPage,
        limit: 15,
      });
      setUsers(response.users);
      setTotalPages(response.pagination.total_pages);
      setTotalUsers(response.pagination.total);
    } catch (error) {
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadApps = async () => {
    try {
      const response = await appsApi.getAll({ limit: 100 });
      setApps(response.data.filter(app => app.price && (typeof app.price === 'string' ? parseFloat(app.price) : app.price) > 0));
    } catch (error) {
      console.error("Failed to load apps:", error);
    }
  };

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setLoadingOrders(true);
    try {
      const response = await adminUsersApi.getOrders(user.id);
      setUserOrders(response.orders);
    } catch (error) {
      toast.error("Failed to load user orders");
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleGrantApp = async () => {
    if (!selectedUser || !selectedAppId) return;
    
    const app = apps.find(a => a.id.toString() === selectedAppId);
    if (!app) return;

    setGranting(true);
    try {
      await adminUsersApi.grantApp(selectedUser.id, {
        app_id: app.id,
        app_name: app.name,
        amount: parseFloat(grantAmount) || 0,
      });
      toast.success(`Granted "${app.name}" to ${selectedUser.email}`);
      setShowGrantDialog(false);
      setSelectedAppId("");
      setGrantAmount("0");
      // Reload orders
      handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to grant app");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeApp = async (order: AdminOrder) => {
    if (!selectedUser) return;
    if (!confirm(`Revoke "${order.app_name}" access from ${selectedUser.email}?`)) return;

    try {
      await adminUsersApi.revokeApp(selectedUser.id, order.app_id);
      toast.success(`Revoked "${order.app_name}" from ${selectedUser.email}`);
      // Reload orders
      handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke app");
    }
  };

  const handleApproveOrder = async (order: AdminOrder) => {
    if (!confirm(`Approve payment for "${order.app_name}"? This will grant access to the user.`)) return;

    try {
      await adminUsersApi.approveOrder(order.id);
      toast.success(`Order approved - "${order.app_name}" access granted`);
      if (selectedUser) {
        handleSelectUser(selectedUser);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to approve order");
    }
  };

  const handleDeleteOrder = async (order: AdminOrder) => {
    if (!confirm(`Delete this order for "${order.app_name}"? This action cannot be undone.`)) return;

    try {
      await adminUsersApi.deleteOrder(order.id);
      toast.success(`Order deleted`);
      if (selectedUser) {
        handleSelectUser(selectedUser);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete order");
    }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paidOrders = userOrders.filter(o => o.status === 'paid');
  const otherOrders = userOrders.filter(o => o.status !== 'paid');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Users List */}
      <div className="lg:col-span-1 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({totalUsers})
          </h2>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or name..."
            className="pl-9"
          />
        </div>

        <div className="space-y-2 max-h-[40vh] lg:max-h-[calc(100vh-280px)] overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedUser?.id === user.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-sm sm:text-base">{user.email}</h3>
                    {user.full_name && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.full_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] sm:text-xs bg-accent px-2 py-0.5 rounded flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        {user.paid_orders_count || 0} purchases
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* User Details */}
      <div className="lg:col-span-2">
        {selectedUser ? (
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-6">
            {/* User Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{selectedUser.email}</h2>
                  {selectedUser.full_name && (
                    <p className="text-muted-foreground">{selectedUser.full_name}</p>
                  )}
                  {selectedUser.phone && (
                    <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                  )}
                </div>
              </div>
              <Button onClick={() => setShowGrantDialog(true)} size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Grant App
              </Button>
            </div>

            {/* Purchased Apps */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Purchased Apps ({paidOrders.length})
              </h3>
              
              {loadingOrders ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : paidOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center bg-muted/50 rounded-lg">
                  No purchased apps
                </p>
              ) : (
                <div className="space-y-2">
                  {paidOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">{order.app_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}</span>
                            <span>•</span>
                            <span>{new Date(order.paid_at || order.created_at).toLocaleDateString()}</span>
                            {order.bakong_transaction_id?.startsWith('ADMIN_GRANTED') && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-[10px] px-1">Admin Granted</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevokeApp(order)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment History */}
            {otherOrders.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment History ({otherOrders.length})
                </h3>
                <div className="space-y-2">
                  {otherOrders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    const canApprove = order.status === 'pending' || order.status === 'expired';
                    return (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{order.app_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}</span>
                              <span>•</span>
                              <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`flex items-center gap-1 ${status.className}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {canApprove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => handleApproveOrder(order)}
                              title="Approve payment"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteOrder(order)}
                            title="Delete order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Select a User</h3>
            <p className="text-muted-foreground text-sm">
              Choose a user from the list to view their purchases and manage app access
            </p>
          </div>
        )}
      </div>

      {/* Grant App Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Grant App Access
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>User</Label>
              <p className="text-sm text-muted-foreground mt-1">{selectedUser?.email}</p>
            </div>
            
            <div>
              <Label>Select App</Label>
              <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a paid app..." />
                </SelectTrigger>
                <SelectContent>
                  {apps.map(app => (
                    <SelectItem key={app.id} value={app.id.toString()}>
                      {app.name} - ${(typeof app.price === 'string' ? parseFloat(app.price) : app.price)?.toFixed(2) || '0.00'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="mt-1.5"
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set to 0 for free grant, or enter the paid amount
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGrantApp} disabled={!selectedAppId || granting}>
              {granting ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
