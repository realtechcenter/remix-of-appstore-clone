import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { AppCard } from "./AppCard";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { usePaginatedApps } from "@/hooks/useApps";
import { useOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";

const PopularAppsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="app-card">
        <div className="flex flex-col items-center text-center">
          <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-4" />
          <Skeleton className="h-4 w-20 sm:w-24 mb-2" />
          <Skeleton className="h-3 w-14 sm:w-16 mb-2" />
          <Skeleton className="h-3 w-28 sm:w-32" />
        </div>
      </div>
    ))}
  </div>
);

export const PopularApps = () => {
  const { language } = useLanguage();
  
  const { data, isLoading } = usePaginatedApps({
    popular: true,
    limit: 10,
    page: 1,
  });

  // Get user's purchased orders
  const { data: orders } = useOrders();
  
  // Create a Set of purchased app IDs for quick lookup
  const purchasedAppIds = useMemo(() => {
    if (!orders) return new Set<number>();
    return new Set(
      orders
        .filter(order => order.status === 'paid')
        .map(order => order.app_id)
    );
  }, [orders]);

  const apps = data?.data || [];

  // Don't render if no popular apps
  if (!isLoading && apps.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-orange-500" />
        <h2 className="text-xl font-semibold text-foreground">
          {language === 'km' ? 'កម្មវិធីពេញនិយម' : 'Popular Apps'}
        </h2>
        {apps.length > 0 && (
          <span className="text-muted-foreground text-sm font-normal">
            ({apps.length})
          </span>
        )}
      </div>

      {isLoading ? (
        <PopularAppsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} purchased={purchasedAppIds.has(app.id)} />
          ))}
        </div>
      )}
    </section>
  );
};
