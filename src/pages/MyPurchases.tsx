import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, Order } from "@/hooks/useOrders";
import { useQuery } from "@tanstack/react-query";
import { versionsApi, AppVersion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Download, Package, ShoppingBag, ArrowLeft, Sparkles, 
  Calendar, DollarSign, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, FileText, HardDrive, Cpu, Monitor,
  ExternalLink
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

interface PurchasedAppCardProps {
  order: Order;
  language: string;
}

const PurchasedAppCard = ({ order, language }: PurchasedAppCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  // Fetch versions for this app
  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['versions', order.app_id],
    queryFn: () => versionsApi.getByAppId(order.app_id),
    enabled: isExpanded, // Only fetch when expanded
  });

  const versions = versionsData || [];

  return (
    <div className="rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-4 sm:p-6 cursor-pointer">
            <div className="flex items-start gap-4">
              {/* App Icon */}
              <div className={`w-16 h-16 rounded-xl ${getGradientFromName(order.app_name)} flex items-center justify-center shrink-0`}>
                <Package className="w-8 h-8 text-white/80" />
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {order.app_name}
                      </span>
                      <Badge variant="secondary" className={`flex items-center gap-1 ${status.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {language === 'km' ? status.labelKm : status.label}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(order.paid_at || order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Button */}
                  <Button variant="ghost" size="sm" className="gap-2">
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {language === 'km' ? 'បង្រួម' : 'Collapse'}
                        </span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {language === 'km' ? 'មើលកំណែ' : 'View Versions'}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/50 bg-muted/30">
            {versionsLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{language === 'km' ? 'គ្មានកំណែទេ' : 'No versions available'}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {versions.map((version: AppVersion) => (
                  <VersionItem key={version.id} version={version} language={language} />
                ))}
              </div>
            )}

            {/* Link to full app detail page */}
            <div className="p-4 border-t border-border/50">
              <Link 
                to={`/${order.app_id}-${order.app_name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4" />
                  {language === 'km' ? 'មើលព័ត៌មានលម្អិត' : 'View Full Details'}
                </Button>
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

interface VersionItemProps {
  version: AppVersion;
  language: string;
}

const VersionItem = ({ version, language }: VersionItemProps) => {
  // Filter out links with null URLs
  const downloadLinks = (version.download_links || []).filter(link => link.url !== null);
  const hasDownloadUrl = version.download_url !== null;
  const hasAnyDownloads = hasDownloadUrl || downloadLinks.length > 0;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={version.is_latest ? "default" : "secondary"}>
              v{version.version}
            </Badge>
            {version.is_latest && (
              <Badge variant="outline" className="text-green-600 border-green-600/30">
                {language === 'km' ? 'ចុងក្រោយ' : 'Latest'}
              </Badge>
            )}
          </div>
          
          {/* Version metadata */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {version.release_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(version.release_date).toLocaleDateString()}
              </span>
            )}
            {version.file_size && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {version.file_size}
              </span>
            )}
            {version.min_os_version && (
              <span className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                {version.min_os_version}
              </span>
            )}
            {version.architecture && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {version.architecture}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Changelog */}
      {(version.changelog || version.changelog_km) && (
        <div className="mb-3 p-2 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="line-clamp-2">
            {language === 'km' && version.changelog_km ? version.changelog_km : version.changelog}
          </p>
        </div>
      )}

      {/* Download Links */}
      {hasAnyDownloads ? (
        <div className="space-y-2">
          {/* Legacy single download URL */}
          {hasDownloadUrl && (
            <a
              href={version.download_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button size="sm" className="gap-2 w-full sm:w-auto bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4" />
                {language === 'km' ? 'ទាញយក' : 'Download'}
              </Button>
            </a>
          )}
          
          {/* Multiple download links */}
          {downloadLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {downloadLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    {link.title}
                  </Button>
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          {language === 'km' ? 'គ្មានតំណទាញយកទេ' : 'No download links available'}
        </p>
      )}
    </div>
  );
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
            {paidOrders.map((order) => (
              <PurchasedAppCard key={order.id} order={order} language={language} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPurchases;
