import { useState } from "react";
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, 
  Calendar, ArrowUpRight, ArrowDownRight, Download, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

type TimeRange = "7" | "30" | "90" | "365";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  color?: string;
}

const StatCard = ({ title, value, change, icon: Icon, trend, subtitle, color = "primary" }: StatCardProps) => (
  <Card className="overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1.5 truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : 
               trend === "down" ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
              <span>{change > 0 ? "+" : ""}{change}% vs last period</span>
            </div>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ml-3">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
];

const STATUS_COLORS: Record<string, string> = {
  paid: '#10b981',
  pending: '#f59e0b',
  failed: '#ef4444',
  expired: '#94a3b8',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{typeof entry.value === 'number' && entry.name?.toLowerCase().includes('revenue') ? `$${entry.value.toFixed(2)}` : entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30");
  
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", timeRange],
    queryFn: () => analyticsApi.getDashboard(parseInt(timeRange)),
  });

  const stats = data?.stats;
  const revenueChartData = data?.revenue_by_date || [];
  const ordersByStatus = data?.orders_by_status?.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    color: STATUS_COLORS[s.status] || '#94a3b8',
  })) || [];

  const downloadsData = revenueChartData.map((d: any) => ({
    date: d.date,
    orders: d.orders || 0,
    revenue: typeof d.revenue === 'string' ? parseFloat(d.revenue) : (d.revenue || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Overview</h2>
          <p className="text-sm text-muted-foreground">App store performance at a glance</p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="w-3.5 h-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard title="Total Users" value={stats?.total_users?.toLocaleString() ?? "0"} icon={Users} change={12} trend="up" subtitle="Registered accounts" />
            <StatCard title="Total Orders" value={stats?.total_orders?.toLocaleString() ?? "0"} icon={ShoppingCart} change={8} trend="up" subtitle="All time" />
            <StatCard title="Total Revenue" value={`$${stats?.total_revenue?.toFixed(2) ?? "0.00"}`} icon={DollarSign} change={15} trend="up" subtitle="USD collected" />
            <StatCard title="Conversion" value={`${stats?.conversion_rate?.toFixed(1) ?? "0"}%`} icon={TrendingUp} change={-2} trend="down" subtitle="Orders / Users" />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart - wider */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Revenue Over Time</CardTitle>
              <Badge variant="secondary" className="text-xs">USD</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {isLoading ? (
                <div className="h-full bg-muted animate-pulse rounded-lg" />
              ) : revenueChartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={downloadsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {isLoading ? (
                <div className="h-full bg-muted animate-pulse rounded-lg" />
              ) : ordersByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ordersByStatus} cx="50%" cy="45%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{value}</span>} />
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Orders Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {isLoading ? (
                <div className="h-full bg-muted animate-pulse rounded-lg" />
              ) : downloadsData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={downloadsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" name="Orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)
              ) : data?.recent_orders?.length ? (
                data.recent_orders.slice(0, 8).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{order.app_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-sm font-semibold">${parseFloat(String(order.amount)).toFixed(2)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        order.status === "paid" ? "bg-green-500/15 text-green-600" : 
                        order.status === "pending" ? "bg-amber-500/15 text-amber-600" : 
                        "bg-muted text-muted-foreground"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">No orders yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
