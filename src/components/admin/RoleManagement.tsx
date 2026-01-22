import { useState } from "react";
import { Shield, Crown, User, Plus, Search, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi, adminUsersApi, type UserWithRoles } from "@/lib/api";
import { toast } from "sonner";

type AppRole = "admin" | "moderator" | "user";

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: "Admin", icon: Crown, color: "bg-red-500/20 text-red-600" },
  moderator: { label: "Moderator", icon: Shield, color: "bg-blue-500/20 text-blue-600" },
  user: { label: "User", icon: User, color: "bg-gray-500/20 text-gray-600" }
};

export const RoleManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRoleUserId, setNewRoleUserId] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("moderator");

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: () => rolesApi.getAll(),
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: () => adminUsersApi.getAll({ limit: 100 }),
  });

  const userRoles = rolesData?.users || [];
  const allUsers = usersData?.users || [];

  const addRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: AppRole }) => rolesApi.add(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role added successfully");
      setShowAddDialog(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to add role"),
  });

  const removeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: AppRole }) => rolesApi.remove(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role removed");
    },
    onError: () => toast.error("Failed to remove role"),
  });

  const filteredUsers = userRoles.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">Manage user permissions</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />Assign Role
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9" />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : filteredUsers.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No users with roles</CardContent></Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.user_id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{user.full_name || user.email}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.roles.map((role) => (
                    <div key={role} className="flex items-center gap-1">
                      <Badge className={roleConfig[role].color}>{roleConfig[role].label}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRole.mutate({ userId: user.user_id, role })}>
                        <X className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={newRoleUserId} onValueChange={setNewRoleUserId}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => addRole.mutate({ userId: parseInt(newRoleUserId), role: newRole })} disabled={!newRoleUserId}>
              <Check className="w-4 h-4 mr-2" />Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};