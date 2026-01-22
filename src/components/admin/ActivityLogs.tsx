import { useState } from "react";
import { 
  Activity, Search, Filter, Calendar, User, 
  Download, RefreshCw, Eye, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  login: "bg-green-500/20 text-green-600",
  logout: "bg-gray-500/20 text-gray-600",
  purchase: "bg-blue-500/20 text-blue-600",
  download: "bg-purple-500/20 text-purple-600",
  profile_update: "bg-yellow-500/20 text-yellow-600",
  app_view: "bg-cyan-500/20 text-cyan-600",
  default: "bg-muted text-muted-foreground"
};

export const ActivityLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7d");

  // Fetch activity logs
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["admin-activity-logs", actionFilter, dateFilter],
    queryFn: async () => {
      const daysMap: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[dateFilter] || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from("user_activity_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ActivityLog[];
    }
  });

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs?.map(l => l.action) || [])];

  const filteredLogs = logs?.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Activity Logs</h2>
          <p className="text-muted-foreground">Monitor user actions and system events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {logs?.filter(l => l.action === "login").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Logins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {logs?.filter(l => l.action === "purchase").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {logs?.filter(l => l.action === "download").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Downloads</p>
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
            placeholder="Search logs..."
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>
                {action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading activity logs...
            </CardContent>
          </Card>
        ) : filteredLogs?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No activity logs found for the selected period
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg divide-y">
            {filteredLogs?.map((log) => {
              const actionColor = actionColors[log.action] || actionColors.default;
              
              return (
                <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={actionColor}>
                            {log.action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.user_id.slice(0, 8)}...
                          </span>
                        </div>
                        
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(log.created_at)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};