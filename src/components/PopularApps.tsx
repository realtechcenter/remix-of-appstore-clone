import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { AppCard } from "./AppCard";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { usePaginatedApps } from "@/hooks/useApps";
import { useOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";

const PopularAppsSkeleton = () => (
  <div className="launchpad-grid">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-2">
        <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-[22%]" />
        <Skeleton className="h-3 w-16" />
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
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
          <TrendingUp className="w-4 h-4 text-orange-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {language === 'km' ? 'កម្មវិធីពេញនិយម' : 'Popular Apps'}
        </h2>
        {apps.length > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {apps.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <PopularAppsSkeleton />
      ) : (
        <div className="launchpad-grid">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} purchased={purchasedAppIds.has(app.id)} />
          ))}
        </div>
      )}
    </section>
  );
};
