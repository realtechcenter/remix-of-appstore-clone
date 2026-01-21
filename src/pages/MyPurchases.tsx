import { Link, useNavigate } from "react-router-dom";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Download, Package, ShoppingBag, ArrowLeft, Sparkles, 
  Calendar, DollarSign, CheckCircle, Clock, XCircle 
} from "lucide-react";

const getGradientFromName = (name: string): string => {
  const gradients = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-green-500 to-emerald-600",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-600",
    "bg-gradient-to-br from-amber-500 to-yellow-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string; label: string; labelKm: string }> = {
  paid: { icon: CheckCircle, className: "text-green-500", label: "Paid", labelKm: "បានបង់ប្រាក់" },
  pending: { icon: Clock, className: "text-amber-500", label: "Pending", labelKm: "រង់ចាំ" },
  failed: { icon: XCircle, className: "text-destructive", label: "Failed", labelKm: "បរាជ័យ" },
  expired: { icon: XCircle, className: "text-muted-foreground", label: "Expired", labelKm: "ផុតកំណត់" },
};

const MyPurchases = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const translations = useTranslations();
  const { user, signOut } = useAuth();
  const { data: orders, isLoading, error } = useOrders();

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === 'km' ? 'សូមចូលគណនី' : 'Please Sign In'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {language === 'km' ? 'អ្នកត្រូវចូលគណនីដើម្បីមើលការទិញ' : 'You need to sign in to view your purchases'}
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

  const paidOrders = orders?.filter(order => order.status === 'paid') || [];

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
                <span className="gradient-text">apps</span>
                <span className="text-muted-foreground">torrent</span>
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
            <ShoppingBag className="w-8 h-8 text-primary" />
            {language === 'km' ? 'កម្មវិធីដែលបានទិញ' : 'My Purchases'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'km' 
              ? 'មើលកម្មវិធីដែលអ្នកបានទិញ និងទាញយក' 
              : 'View and download your purchased apps'}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'km' ? 'មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ' : 'Failed to load purchases'}
            </h2>
            <Button onClick={() => window.location.reload()} variant="outline">
              {language === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}
            </Button>
          </div>
        ) : paidOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'km' ? 'គ្មានការទិញទេ' : 'No purchases yet'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {language === 'km' 
                ? 'អ្នកមិនទាន់បានទិញកម្មវិធីណាមួយទេ' 
                : "You haven't purchased any apps yet"}
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
            {paidOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <div 
                  key={order.id}
                  className="p-4 sm:p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* App Icon */}
                    <div className={`w-16 h-16 rounded-xl ${getGradientFromName(order.app_name)} flex items-center justify-center shrink-0`}>
                      <Package className="w-8 h-8 text-white/80" />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link 
                            to={`/${order.app_id}-${order.app_name.toLowerCase().replace(/\s+/g, '-')}`}
                            className="text-lg font-semibold hover:text-primary transition-colors"
                          >
                            {order.app_name}
                          </Link>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(order.paid_at || order.created_at).toLocaleDateString()}
                            </span>
                            <Badge variant="secondary" className={`flex items-center gap-1 ${status.className}`}>
                              <StatusIcon className="w-3 h-3" />
                              {language === 'km' ? status.labelKm : status.label}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Download Button - Link to app detail page */}
                        <Link 
                          to={`/${order.app_id}-${order.app_name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              {language === 'km' ? 'ទាញយក' : 'Download'}
                            </span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPurchases;
