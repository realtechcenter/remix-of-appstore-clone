import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, type AdminOrder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle, Clock,
  XCircle, Hash, Receipt, Calendar, CreditCard, Trash2, ThumbsUp
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

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  // Client-side search filter
  const filtered = searchQuery
    ? orders.filter(o =>
        o.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.bakong_transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  // Summary stats from current page
  const totalRevenue = filtered.filter(o => o.status === "paid").reduce((s, o) => {
    const amt = typeof o.amount === "string" ? parseFloat(o.amount) : o.amount;
    return s + amt;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Payment History</h2>
        <p className="text-sm text-muted-foreground mt-1">View and manage all payment transactions</p>
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
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
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
          <div className="border border-border rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CreditCard className="w-3.5 h-3.5" /> Total Orders
            </div>
            <p className="text-lg font-semibold">{pagination.total}</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Page Revenue
            </div>
            <p className="text-lg font-semibold">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle className="w-3.5 h-3.5" /> Paid (page)
            </div>
            <p className="text-lg font-semibold">{filtered.filter(o => o.status === "paid").length}</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" /> Pending (page)
            </div>
            <p className="text-lg font-semibold">{filtered.filter(o => o.status === "pending").length}</p>
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
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
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
                              title="Approve"
                            >
                              <ThumbsUp className="w-3.5 h-3.5 text-primary" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (confirm("Delete this order?")) deleteMutation.mutate(order.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.total_pages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
