import { useState } from "react";
import { 
  Shield, Crown, User, Plus, Trash2, Search, 
  ChevronDown, Check, X 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = "admin" | "moderator" | "user";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  roles: AppRole[];
}

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
  admin: { 
    label: "Admin", 
    icon: Crown, 
    color: "bg-red-500/20 text-red-600", 
    description: "Full access to all features" 
  },
  moderator: { 
    label: "Moderator", 
    icon: Shield, 
    color: "bg-blue-500/20 text-blue-600", 
    description: "Can manage apps and users" 
  },
  user: { 
    label: "User", 
    icon: User, 
    color: "bg-gray-500/20 text-gray-600", 
    description: "Standard user access" 
  }
};

export const RoleManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRoleUserId, setNewRoleUserId] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("moderator");

  // Fetch user roles with profiles
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (rolesError) throw rolesError;

      // Get unique user IDs
      const userIds = [...new Set((roles || []).map(r => r.user_id))];
      
      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      if (profilesError) throw profilesError;

      // Combine data
      const usersMap = new Map<string, UserWithRole>();
      
      (roles || []).forEach(role => {
        const existing = usersMap.get(role.user_id);
        if (existing) {
          existing.roles.push(role.role as AppRole);
        } else {
          const profile = profiles?.find(p => p.user_id === role.user_id);
          usersMap.set(role.user_id, {
            user_id: role.user_id,
            full_name: profile?.full_name || null,
            roles: [role.role as AppRole]
          });
        }
      });

      return Array.from(usersMap.values());
    }
  });

  // Fetch all profiles for adding new roles
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data || [];
    }
  });

  // Add role
  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role added successfully");
      setShowAddDialog(false);
      setNewRoleUserId("");
      setNewRole("moderator");
    },
    onError: (error: any) => {
      if (error.message?.includes("unique")) {
        toast.error("User already has this role");
      } else {
        toast.error("Failed to add role");
      }
    }
  });

  // Remove role
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role removed");
    },
    onError: () => {
      toast.error("Failed to remove role");
    }
  });

  const filteredUsers = userRoles?.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = userRoles?.filter(u => u.roles.includes("admin")).length || 0;
  const moderatorCount = userRoles?.filter(u => u.roles.includes("moderator")).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">Manage user permissions and access levels</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Role
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{adminCount}</div>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{moderatorCount}</div>
              <p className="text-sm text-muted-foreground">Moderators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{userRoles?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Users with roles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or user ID..."
          className="pl-9"
        />
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
              No users with special roles found
            </CardContent>
          </Card>
        ) : (
          filteredUsers?.map((user) => (
            <Card key={user.user_id} className="hover:border-primary/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{user.full_name || "Unknown User"}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{user.user_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {user.roles.map((role) => {
                      const roleInfo = roleConfig[role];
                      const RoleIcon = roleInfo.icon;
                      
                      return (
                        <div key={role} className="flex items-center gap-1">
                          <Badge className={roleInfo.color}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              if (confirm(`Remove ${roleInfo.label} role from this user?`)) {
                                removeRole.mutate({ userId: user.user_id, role });
                              }
                            }}
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Role Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select User</label>
              <Select value={newRoleUserId} onValueChange={setNewRoleUserId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {allProfiles?.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || profile.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {roleConfig[newRole].description}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!newRoleUserId) {
                  toast.error("Please select a user");
                  return;
                }
                addRole.mutate({ userId: newRoleUserId, role: newRole });
              }}
              disabled={addRole.isPending}
            >
              <Check className="w-4 h-4 mr-2" />
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};