import { useState, useMemo } from "react";
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, 
  Calendar, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

type TimeRange = "7" | "30" | "90" | "365";

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
  const [timeRange, setTimeRange] = useState<TimeRange>("30");
  
  // Fetch analytics from Laravel API
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", timeRange],
    queryFn: () => analyticsApi.getDashboard(parseInt(timeRange)),
  });

  const stats = data?.stats;
  const revenueChartData = data?.revenue_by_date || [];
  const ordersByStatus = data?.orders_by_status?.map(s => ({ name: s.status, value: s.count })) || [];

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
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Users" 
          value={stats?.total_users?.toLocaleString() || "0"} 
          icon={Users}
          change={12}
          trend="up"
        />
        <StatCard 
          title="Total Orders" 
          value={stats?.total_orders?.toLocaleString() || "0"} 
          icon={ShoppingCart}
          change={8}
          trend="up"
        />
        <StatCard 
          title="Total Revenue" 
          value={`$${stats?.total_revenue?.toFixed(2) || "0.00"}`} 
          icon={DollarSign}
          change={15}
          trend="up"
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${stats?.conversion_rate?.toFixed(1) || "0"}%`} 
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
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
              ) : revenueChartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
              ) : (
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
              )}
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
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
              ) : ordersByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
              ) : (
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
              )}
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
            {data?.recent_orders?.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{order.app_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${parseFloat(String(order.amount)).toFixed(2)}</p>
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