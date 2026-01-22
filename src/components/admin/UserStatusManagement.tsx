import { useState } from "react";
import { 
  Ban, UserCheck, AlertTriangle, Search, Filter, 
  Clock, Shield, User, Calendar, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UserStatusType = "active" | "suspended" | "banned";

interface UserStatus {
  id: string;
  user_id: string;
  status: UserStatusType;
  reason: string | null;
  suspended_until: string | null;
  updated_at: string;
}

interface UserWithStatus {
  user_id: string;
  full_name: string | null;
  created_at: string;
  status?: UserStatus;
}

const statusConfig: Record<UserStatusType, { label: string; icon: React.ElementType; color: string }> = {
  active: { label: "Active", icon: UserCheck, color: "bg-green-500/20 text-green-600" },
  suspended: { label: "Suspended", icon: Clock, color: "bg-yellow-500/20 text-yellow-600" },
  banned: { label: "Banned", icon: Ban, color: "bg-red-500/20 text-red-600" }
};

export const UserStatusManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatusType | "all">("all");
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<UserStatusType>("active");
  const [reason, setReason] = useState("");
  const [suspendUntil, setSuspendUntil] = useState("");

  // Fetch users with their status
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-status", statusFilter],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, created_at")
        .order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;

      // Fetch all user statuses
      const { data: statuses, error: statusesError } = await supabase
        .from("user_status")
        .select("*");
      
      if (statusesError) throw statusesError;

      // Combine data
      const usersWithStatus: UserWithStatus[] = (profiles || []).map(profile => ({
        ...profile,
        status: (statuses || []).find(s => s.user_id === profile.user_id) as UserStatus | undefined
      }));

      // Filter by status if needed
      if (statusFilter !== "all") {
        return usersWithStatus.filter(u => 
          statusFilter === "active" 
            ? !u.status || u.status.status === "active"
            : u.status?.status === statusFilter
        );
      }

      return usersWithStatus;
    }
  });

  // Update user status
  const updateStatus = useMutation({
    mutationFn: async ({ userId, status, reason, suspendUntil }: { 
      userId: string; 
      status: UserStatusType; 
      reason?: string;
      suspendUntil?: string;
    }) => {
      const { data: existing } = await supabase
        .from("user_status")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_status")
          .update({
            status,
            reason: reason || null,
            suspended_until: suspendUntil || null,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_status")
          .insert({
            user_id: userId,
            status,
            reason: reason || null,
            suspended_until: suspendUntil || null
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-status"] });
      toast.success("User status updated");
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Failed to update status");
    }
  });

  const handleOpenDialog = (user: UserWithStatus, action: UserStatusType) => {
    setSelectedUser(user);
    setActionType(action);
    setReason(user.status?.reason || "");
    setSuspendUntil(user.status?.suspended_until || "");
    setShowActionDialog(true);
  };

  const handleCloseDialog = () => {
    setShowActionDialog(false);
    setSelectedUser(null);
    setReason("");
    setSuspendUntil("");
  };

  const handleSubmit = () => {
    if (!selectedUser) return;
    
    if ((actionType === "suspended" || actionType === "banned") && !reason) {
      toast.error("Please provide a reason");
      return;
    }

    updateStatus.mutate({
      userId: selectedUser.user_id,
      status: actionType,
      reason,
      suspendUntil: actionType === "suspended" ? suspendUntil : undefined
    });
  };

  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserStatus = (user: UserWithStatus): UserStatusType => {
    return user.status?.status || "active";
  };

  const activeCount = users?.filter(u => getUserStatus(u) === "active").length || 0;
  const suspendedCount = users?.filter(u => getUserStatus(u) === "suspended").length || 0;
  const bannedCount = users?.filter(u => getUserStatus(u) === "banned").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Status Management</h2>
          <p className="text-muted-foreground">Suspend or ban users who violate policies</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{suspendedCount}</div>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{bannedCount}</div>
              <p className="text-sm text-muted-foreground">Banned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or user ID..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatusType | "all")}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading users...
            </CardContent>
          </Card>
        ) : filteredUsers?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No users found
            </CardContent>
          </Card>
        ) : (
          filteredUsers?.map((user) => {
            const userStatus = getUserStatus(user);
            const statusInfo = statusConfig[userStatus];
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card key={user.user_id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{user.full_name || "Unknown User"}</h3>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{user.user_id.slice(0, 8)}...</p>
                        {user.status?.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {user.status.reason}
                          </p>
                        )}
                        {user.status?.suspended_until && (
                          <p className="text-xs text-muted-foreground">
                            Until: {new Date(user.status.suspended_until).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {userStatus !== "active" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenDialog(user, "active")}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                      )}
                      {userStatus !== "suspended" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenDialog(user, "suspended")}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Suspend
                        </Button>
                      )}
                      {userStatus !== "banned" && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleOpenDialog(user, "banned")}
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Ban
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "active" ? "Restore User" : 
               actionType === "suspended" ? "Suspend User" : "Ban User"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedUser.full_name || "Unknown User"}</p>
                <p className="text-sm text-muted-foreground font-mono">{selectedUser.user_id}</p>
              </div>

              {actionType !== "active" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Reason *</label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why this action is being taken..."
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>

                  {actionType === "suspended" && (
                    <div>
                      <label className="text-sm font-medium">Suspend Until (optional)</label>
                      <Input
                        type="datetime-local"
                        value={suspendUntil}
                        onChange={(e) => setSuspendUntil(e.target.value)}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for indefinite suspension
                      </p>
                    </div>
                  )}
                </>
              )}

              {actionType === "active" && (
                <p className="text-muted-foreground">
                  This will restore the user's access to the platform.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={updateStatus.isPending}
              variant={actionType === "banned" ? "destructive" : "default"}
            >
              {actionType === "active" ? "Restore Access" : 
               actionType === "suspended" ? "Suspend User" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};