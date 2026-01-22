import { useState } from "react";
import { Activity, Search, Filter, Calendar, User, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { activityLogsApi } from "@/lib/api";

const actionColors: Record<string, string> = {
  login: "bg-green-500/20 text-green-600",
  logout: "bg-gray-500/20 text-gray-600",
  purchase: "bg-blue-500/20 text-blue-600",
  download: "bg-purple-500/20 text-purple-600",
  default: "bg-muted text-muted-foreground"
};

export const ActivityLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-activity-logs", actionFilter, dateFilter],
    queryFn: () => activityLogsApi.getAll({ days: parseInt(dateFilter), action: actionFilter === "all" ? undefined : actionFilter }),
  });

  const logs = data?.logs || [];
  const uniqueActions = data?.actions || [];
  const stats = data?.stats || { total: 0, logins: 0, purchases: 0, downloads: 0 };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const diffMins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Activity Logs</h2>
          <p className="text-muted-foreground">Monitor user actions</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.total}</div><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{stats.logins}</div><p className="text-sm text-muted-foreground">Logins</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{stats.purchases}</div><p className="text-sm text-muted-foreground">Purchases</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-purple-600">{stats.downloads}</div><p className="text-sm text-muted-foreground">Downloads</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24h</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No logs found</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-muted/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 mt-1 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={actionColors[log.action] || actionColors.default}>{log.action}</Badge>
                    <span className="text-sm text-muted-foreground">{log.user?.email || log.user_id}</span>
                  </div>
                  {log.details && <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(log.details)}</p>}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />{formatTimeAgo(log.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};