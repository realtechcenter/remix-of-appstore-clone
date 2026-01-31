import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  CreditCard, ArrowLeft, Sparkles, 
  Calendar, DollarSign, CheckCircle, Clock, XCircle,
  Hash, FileText, Receipt
} from "lucide-react";

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string; bgClass: string; label: string; labelKm: string }> = {
  paid: { icon: CheckCircle, className: "text-green-500", bgClass: "bg-green-500/10", label: "Paid", labelKm: "បានបង់ប្រាក់" },
  pending: { icon: Clock, className: "text-amber-500", bgClass: "bg-amber-500/10", label: "Pending", labelKm: "រង់ចាំ" },
  failed: { icon: XCircle, className: "text-destructive", bgClass: "bg-destructive/10", label: "Failed", labelKm: "បរាជ័យ" },
  expired: { icon: XCircle, className: "text-muted-foreground", bgClass: "bg-muted", label: "Expired", labelKm: "ផុតកំណត់" },
};

interface PaymentCardProps {
  order: Order;
  language: string;
}

const PaymentCard = ({ order, language }: PaymentCardProps) => {
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const amount = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount;

  return (
    <div className={`rounded-xl border border-border/50 bg-card overflow-hidden`}>
      <div className="p-4 sm:p-5">
        {/* Header with status */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${status.bgClass} flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${status.className}`} />
            </div>
            <div>
              <Badge variant="secondary" className={`${status.className}`}>
                {language === 'km' ? status.labelKm : status.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">${amount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{order.currency}</p>
          </div>
        </div>

        {/* App info */}
        <div className="p-3 bg-muted/30 rounded-lg mb-4">
          <p className="font-medium">{order.app_name}</p>
          <p className="text-xs text-muted-foreground">
            {language === 'km' ? 'កម្មវិធី' : 'Application'}
          </p>
        </div>

        {/* Transaction details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Hash className="w-4 h-4" />
              {language === 'km' ? 'លេខបញ្ជា' : 'Order ID'}
            </span>
            <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span>
          </div>

          {order.bakong_transaction_id && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="w-4 h-4" />
                {language === 'km' ? 'លេខប្រតិបត្តិការ' : 'Transaction ID'}
              </span>
              <span className="font-mono text-xs">{order.bakong_transaction_id}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {language === 'km' ? 'កាលបរិច្ឆេទបង្កើត' : 'Created'}
            </span>
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
          </div>

          {order.paid_at && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                {language === 'km' ? 'កាលបរិច្ឆេទបង់ប្រាក់' : 'Paid at'}
              </span>
              <span>{new Date(order.paid_at).toLocaleDateString()}</span>
            </div>
          )}

          {order.expires_at && order.status === 'pending' && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {language === 'km' ? 'ផុតកំណត់' : 'Expires'}
              </span>
              <span>{new Date(order.expires_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* View app link for paid orders */}
        {order.status === 'paid' && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Link 
              to={`/${order.app_id}-${order.app_name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Button variant="outline" size="sm" className="gap-2 w-full">
                <FileText className="w-4 h-4" />
                {language === 'km' ? 'មើលកម្មវិធី' : 'View App'}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, signOut } = useAuth();
  const { data: orders, isLoading, error } = useOrders();

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === 'km' ? 'សូមចូលគណនី' : 'Please Sign In'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {language === 'km' ? 'អ្នកត្រូវចូលគណនីដើម្បីមើលប្រវត្តិបង់ប្រាក់' : 'You need to sign in to view payment history'}
          </p>
          <Link to="/auth">
            <Button className="gap-2">
              {language === 'km' ? 'ចូលគណនី' : 'Sign In'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalPaid = orders?.filter(o => o.status === 'paid').reduce((sum, o) => {
    const amount = typeof o.amount === 'string' ? parseFloat(o.amount) : o.amount;
    return sum + amount;
  }, 0) || 0;
  const paidCount = orders?.filter(o => o.status === 'paid').length || 0;
  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass py-4 px-4 sm:px-6 lg:px-8 border-b border-border/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">
                <span className="gradient-text">Mac</span>
                <span className="text-muted-foreground">sofy</span>
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              {language === 'km' ? 'ចេញ' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <CreditCard className="w-8 h-8 text-primary" />
            {language === 'km' ? 'ប្រវត្តិបង់ប្រាក់' : 'Payment History'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'km' 
              ? 'មើលប្រតិបត្តិការបង់ប្រាក់ទាំងអស់របស់អ្នក' 
              : 'View all your payment transactions'}
          </p>
        </div>

        {/* Summary Stats */}
        {!isLoading && orders && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'km' ? 'សរុបបានបង់' : 'Total Paid'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{paidCount}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'km' ? 'បានបង់ប្រាក់' : 'Completed'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'km' ? 'រង់ចាំ' : 'Pending'}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'km' ? 'មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ' : 'Failed to load payment history'}
            </h2>
            <Button onClick={() => window.location.reload()} variant="outline">
              {language === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}
            </Button>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'km' ? 'គ្មានប្រវត្តិបង់ប្រាក់ទេ' : 'No payment history'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {language === 'km' 
                ? 'អ្នកមិនទាន់បានធ្វើប្រតិបត្តិការទេ' 
                : "You haven't made any transactions yet"}
            </p>
            <Link to="/">
              <Button className="gap-2">
                <Sparkles className="w-4 h-4" />
                {language === 'km' ? 'រុករកកម្មវិធី' : 'Browse Apps'}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <PaymentCard key={order.id} order={order} language={language} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentHistory;
