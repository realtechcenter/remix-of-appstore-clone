import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  CreditCard, ArrowLeft,
  Calendar, DollarSign, CheckCircle, Clock, XCircle,
  Hash, FileText, Receipt
} from "lucide-react";

const statusConfig: Record<string, { dotClass: string; label: string; labelKm: string }> = {
  paid:    { dotClass: "bg-green-500",           label: "Paid",    labelKm: "បានបង់ប្រាក់" },
  pending: { dotClass: "bg-amber-400",           label: "Pending", labelKm: "រង់ចាំ" },
  failed:  { dotClass: "bg-destructive",         label: "Failed",  labelKm: "បរាជ័យ" },
  expired: { dotClass: "bg-muted-foreground/40", label: "Expired", labelKm: "ផុតកំណត់" },
};

interface PaymentCardProps {
  order: Order;
  language: string;
}

const PaymentCard = ({ order, language }: PaymentCardProps) => {
  const status = statusConfig[order.status] || statusConfig.pending;
  const amount = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount;

  return (
    <div className="border border-border rounded-md bg-card">
      {/* Top row */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} flex-shrink-0`} />
          <span className="text-sm font-medium">{order.app_name}</span>
          <span className="text-xs text-muted-foreground">
            · {language === 'km' ? status.labelKm : status.label}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">${amount.toFixed(2)}</span>
      </div>

      {/* Details grid */}
      <div className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Hash className="w-3 h-3" />
            {language === 'km' ? 'លេខបញ្ជា' : 'Order ID'}
          </span>
          <span className="font-mono text-foreground">{order.id.slice(0, 12)}…</span>
        </div>

        {order.bakong_transaction_id && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3 h-3" />
              {language === 'km' ? 'លេខប្រតិបត្តិការ' : 'Transaction ID'}
            </span>
            <span className="font-mono text-foreground">{order.bakong_transaction_id}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {language === 'km' ? 'កាលបរិច្ឆេទ' : 'Created'}
          </span>
          <span className="text-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
        </div>

        {order.paid_at && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" />
              {language === 'km' ? 'បានបង់នៅ' : 'Paid at'}
            </span>
            <span className="text-foreground">{new Date(order.paid_at).toLocaleDateString()}</span>
          </div>
        )}

        {order.expires_at && order.status === 'pending' && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {language === 'km' ? 'ផុតកំណត់' : 'Expires'}
            </span>
            <span className="text-foreground">{new Date(order.expires_at).toLocaleString()}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" />
            {language === 'km' ? 'រូបិយប័ណ្ណ' : 'Currency'}
          </span>
          <span className="text-foreground">{order.currency}</span>
        </div>
      </div>

      {/* Footer action */}
      {order.status === 'paid' && (
        <div className="px-4 py-2.5 border-t border-border">
          <Link to={`/${order.app_id}-${order.app_name.toLowerCase().replace(/\s+/g, '-')}`}>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <FileText className="w-3.5 h-3.5" />
              {language === 'km' ? 'មើលកម្មវិធី' : 'View App'}
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, signOut } = useAuth();
  const { data: orders, isLoading, error } = useOrders();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-xs">
          <CreditCard className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-1">{language === 'km' ? 'សូមចូលគណនី' : 'Sign in required'}</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'km' ? 'អ្នកត្រូវចូលគណនីដើម្បីមើលប្រវត្តិបង់ប្រាក់' : 'You need to sign in to view payment history'}
          </p>
          <Link to="/auth"><Button size="sm">{language === 'km' ? 'ចូលគណនី' : 'Sign In'}</Button></Link>
        </div>
      </div>
    );
  }

  const totalPaid = orders?.filter(o => o.status === 'paid').reduce((sum, o) => {
    const amount = typeof o.amount === 'string' ? parseFloat(o.amount) : o.amount;
    return sum + amount;
  }, 0) || 0;
  const paidCount   = orders?.filter(o => o.status === 'paid').length || 0;
  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Notion-style top bar */}
      <header className="sticky top-0 z-40 glass px-4 sm:px-8 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm hover:bg-accent"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'km' ? 'ត្រឡប់' : 'Back'}
            </button>
            <span className="text-muted-foreground/40 text-sm">/</span>
            <span className="text-sm font-medium text-foreground">
              {language === 'km' ? 'ប្រវត្តិបង់ប្រាក់' : 'Payment History'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
            <Button variant="outline" size="sm" onClick={signOut} className="h-7 text-xs">
              {language === 'km' ? 'ចេញ' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {language === 'km' ? 'ប្រវត្តិបង់ប្រាក់' : 'Payment History'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'km' ? 'មើលប្រតិបត្តិការបង់ប្រាក់ទាំងអស់របស់អ្នក' : 'View all your payment transactions'}
          </p>
        </div>

        {/* Summary — Notion-style property row */}
        {!isLoading && orders && orders.length > 0 && (
          <div className="border border-border rounded-md bg-card mb-6 divide-y divide-border">
            <div className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                {language === 'km' ? 'សរុបបានបង់' : 'Total Paid'}
              </span>
              <span className="font-semibold tabular-nums">${totalPaid.toFixed(2)}</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                {language === 'km' ? 'ប្រតិបត្តិការបានបញ្ចប់' : 'Completed'}
              </span>
              <span className="font-medium">{paidCount}</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {language === 'km' ? 'រង់ចាំ' : 'Pending'}
              </span>
              <span className="font-medium">{pendingCount}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-3 opacity-70" />
            <h2 className="text-sm font-medium mb-3">{language === 'km' ? 'មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ' : 'Failed to load payment history'}</h2>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              {language === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}
            </Button>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-md bg-card">
            <CreditCard className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-sm font-medium mb-1">{language === 'km' ? 'គ្មានប្រវត្តិបង់ប្រាក់ទេ' : 'No transactions yet'}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {language === 'km' ? 'អ្នកមិនទាន់បានធ្វើប្រតិបត្តិការទេ' : "You haven't made any transactions yet"}
            </p>
            <Link to="/"><Button size="sm" variant="outline">{language === 'km' ? 'រុករកកម្មវិធី' : 'Browse Apps'}</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
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
