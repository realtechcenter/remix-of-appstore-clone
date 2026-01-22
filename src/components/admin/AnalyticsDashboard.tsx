import { useState, useMemo } from "react";
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, Download, 
  Calendar, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

type TimeRange = "7d" | "30d" | "90d" | "1y";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}

const StatCard = ({ title, value, change, icon: Icon, trend }: StatCardProps) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : 
               trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
              <span>{change > 0 ? "+" : ""}{change}% from last period</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  
  // Fetch orders data for analytics
  const { data: ordersData } = useQuery({
    queryKey: ["admin-analytics", timeRange],
    queryFn: async () => {
      const daysMap: Record<TimeRange, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
      const days = daysMap[timeRange];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate.toISOString());
      
      if (error) throw error;
      return orders || [];
    }
  });

  // Fetch profiles for user count
  const { data: profilesData } = useQuery({
    queryKey: ["admin-profiles-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!ordersData) return null;
    
    const paidOrders = ordersData.filter(o => o.status === "paid");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    
    return {
      totalUsers: profilesData || 0,
      totalOrders: ordersData.length,
      paidOrders: paidOrders.length,
      totalRevenue,
      avgOrderValue,
      conversionRate: ordersData.length > 0 ? (paidOrders.length / ordersData.length) * 100 : 0
    };
  }, [ordersData, profilesData]);

  // Prepare chart data
  const revenueChartData = useMemo(() => {
    if (!ordersData) return [];
    
    const groupedByDate: Record<string, number> = {};
    ordersData
      .filter(o => o.status === "paid")
      .forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        groupedByDate[date] = (groupedByDate[date] || 0) + Number(order.amount);
      });
    
    return Object.entries(groupedByDate).map(([date, revenue]) => ({ date, revenue }));
  }, [ordersData]);

  const ordersByStatus = useMemo(() => {
    if (!ordersData) return [];
    
    const statusCounts: Record<string, number> = {};
    ordersData.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [ordersData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Overview of your app store performance</p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Users" 
          value={stats?.totalUsers.toLocaleString() || "0"} 
          icon={Users}
          change={12}
          trend="up"
        />
        <StatCard 
          title="Total Orders" 
          value={stats?.totalOrders.toLocaleString() || "0"} 
          icon={ShoppingCart}
          change={8}
          trend="up"
        />
        <StatCard 
          title="Total Revenue" 
          value={`$${stats?.totalRevenue.toFixed(2) || "0.00"}`} 
          icon={DollarSign}
          change={15}
          trend="up"
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${stats?.conversionRate.toFixed(1) || "0"}%`} 
          icon={TrendingUp}
          change={-2}
          trend="down"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {ordersByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ordersData?.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{order.app_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${Number(order.amount).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    order.status === "paid" ? "bg-green-500/20 text-green-600" : 
                    order.status === "pending" ? "bg-yellow-500/20 text-yellow-600" : 
                    "bg-red-500/20 text-red-600"
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-center text-muted-foreground py-4">No orders yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};