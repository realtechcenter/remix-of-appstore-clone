import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppCard } from "./AppCard";
import { useTranslations } from "@/contexts/LanguageContext";
import { usePaginatedApps } from "@/hooks/useApps";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AppGridProps {
  title?: string;
  showViewAll?: boolean;
  searchQuery?: string;
  itemsPerPage?: number;
}

const AppGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
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

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-muted-foreground">
    <p>{message}</p>
  </div>
);

export const AppGrid = ({ title, showViewAll = true, searchQuery = "", itemsPerPage = 10 }: AppGridProps) => {
  const t = useTranslations();
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data, isLoading, error, isFetching } = usePaginatedApps({
    category: "programs",
    search: searchQuery || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const apps = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages || 1;
  const total = pagination?.total || 0;

  const displayTitle = title || t.programs;

  // Hide section if searching and no results
  if (searchQuery && total === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          {displayTitle}
          {total > 0 && (
            <span className="text-muted-foreground text-sm font-normal ml-2">
              ({total})
            </span>
          )}
        </h2>
        {showViewAll && !searchQuery && (
          <a href="#" className="section-link">{t.viewAll}</a>
        )}
      </div>

      {isLoading && !data ? (
        <AppGridSkeleton />
      ) : error ? (
        <EmptyState message="Failed to load apps. Please try again." />
      ) : apps.length > 0 ? (
        <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isFetching}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const showPage = page === 1 || page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  const showEllipsis = page === currentPage - 2 || page === currentPage + 2;
                  
                  if (showEllipsis && totalPages > 5) {
                    return <span key={page} className="px-1 text-muted-foreground">...</span>;
                  }
                  
                  if (!showPage && totalPages > 5) return null;
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      disabled={isFetching}
                      className="h-9 w-9 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || isFetching}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState message="No programs available yet." />
      )}
    </section>
  );
};
