import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, type AdminOrder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle, Clock,
  XCircle, Hash, Receipt, Calendar, CreditCard, Trash2, ThumbsUp, Loader2
} from "lucide-react";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  paid:    { variant: "default",     label: "Paid" },
  pending: { variant: "secondary",   label: "Pending" },
  failed:  { variant: "destructive", label: "Failed" },
  expired: { variant: "outline",     label: "Expired" },
};

export const PaymentHistoryAdmin = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-all-orders", statusFilter, currentPage],
    queryFn: () => adminUsersApi.getAllOrders({
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: perPage,
    }),
  });

  const approveMutation = useMutation({
    mutationFn: (orderId: string) => adminUsersApi.approveOrder(orderId),
    onSuccess: () => {
      toast.success("Order approved");
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    },
    onError: () => toast.error("Failed to approve order"),
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => adminUsersApi.deleteOrder(orderId),
    onSuccess: () => {
      toast.success("Order deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    },
    onError: () => toast.error("Failed to delete order"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (orderIds: string[]) => adminUsersApi.bulkDeleteOrders(orderIds),
    onSuccess: (data) => {
      toast.success(data.message || "Orders deleted");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    },
    onError: () => toast.error("Failed to delete orders"),
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  const filtered = searchQuery
    ? orders.filter(o =>
        o.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.bakong_transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  const totalRevenue = filtered.filter(o => o.status === "paid").reduce((s, o) => {
    const amt = typeof o.amount === "string" ? parseFloat(o.amount) : o.amount;
    return s + amt;
  }, 0);

  const allFilteredIds = filtered.map(o => o.id);
  const allSelected = filtered.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
  const someSelected = allFilteredIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
    setShowBulkDeleteDialog(false);
  };

  const confirmSingleDelete = () => {
    if (singleDeleteId) {
      deleteMutation.mutate(singleDeleteId);
      setSingleDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Payment History</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage all payment transactions</p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
            className="gap-1.5"
          >
            {bulkDeleteMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete {selectedIds.size} selected
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by app, user, order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); setSelectedIds(new Set()); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-blue-200 dark:border-blue-500/20 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-600/5 p-3">
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
              <CreditCard className="w-3.5 h-3.5" /> Total Orders
            </div>
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{pagination.total}</p>
          </div>
          <div className="border border-emerald-200 dark:border-emerald-500/20 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-600/5 p-3">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Page Revenue
            </div>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="border border-violet-200 dark:border-violet-500/20 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-600/5 p-3">
            <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 mb-1">
              <CheckCircle className="w-3.5 h-3.5" /> Paid (page)
            </div>
            <p className="text-lg font-semibold text-violet-700 dark:text-violet-300">{filtered.filter(o => o.status === "paid").length}</p>
          </div>
          <div className="border border-amber-200 dark:border-amber-500/20 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-600/5 p-3">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-1">
              <Clock className="w-3.5 h-3.5" /> Pending (page)
            </div>
            <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{filtered.filter(o => o.status === "pending").length}</p>
          </div>
        </div>
      )}

      {/* Orders table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <CreditCard className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                      className={someSelected && !allSelected ? "data-[state=unchecked]:bg-primary/20" : ""}
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">App</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Transaction</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const amount = typeof order.amount === "string" ? parseFloat(order.amount) : order.amount;
                  const isSelected = selectedIds.has(order.id);
                  return (
                    <tr key={order.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(order.id)}
                          aria-label={`Select order ${order.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{order.user?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{order.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{order.app_name}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">${amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {order.bakong_transaction_id ? order.bakong_transaction_id.slice(0, 15) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}{" "}
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(order.status === "pending" || order.status === "expired") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => approveMutation.mutate(order.id)}
                              disabled={approveMutation.isPending}
                              title="Approve"
                            >
                              {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5 text-primary" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSingleDeleteId(order.id)}
                            disabled={deleteMutation.isPending}
                            title="Delete"
                          >
                            {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} orders)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => { setCurrentPage(p => p - 1); setSelectedIds(new Set()); }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.total_pages}
              onClick={() => { setCurrentPage(p => p + 1); setSelectedIds(new Set()); }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} order(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected orders. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!singleDeleteId} onOpenChange={(open) => { if (!open) setSingleDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSingleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};