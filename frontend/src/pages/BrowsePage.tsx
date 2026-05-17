import { PageLayout } from "../components/layout/PageLayout";
import { SkillCard } from "../components/browse/SkillCard";
import { FilterSidebar } from "../components/browse/FilterSidebar";
import {
  emptyFilters,
  hasActiveFilters,
  type Filters,
} from "../components/browse/FilterSidebar";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";
import { fetchPublicSkills } from "../api/skills";
import {
  mapSkillDtoToBrowseCard,
  type BrowseSkillCardModel,
} from "../lib/skillBrowseMap";

interface BrowsePageProps {
  onNavigate?: (page: PageType) => void;
  onOpenSkillDetail?: (skillId: string) => void;
  onOpenUserProfile?: (userId: string) => void;
}

const PAGE_SIZE = 6;

type SortOption = "relevant" | "rated" | "newest";

export function BrowsePage({
  onNavigate,
  onOpenSkillDetail,
  onOpenUserProfile,
}: BrowsePageProps) {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const b = t.browse;
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("relevant");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [mobileDraftFilters, setMobileDraftFilters] = useState<Filters>(filters);
  const [catalog, setCatalog] = useState<BrowseSkillCardModel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchPublicSkills()
      .then((rows) => {
        if (!cancelled) {
          setCatalog(rows.map((s) => mapSkillDtoToBrowseCard(s, t)));
        }
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  const filteredSkills = useMemo(() => {
    const myId = user?.id?.trim().toLowerCase();
    return catalog.filter((skill) => {
      if (myId && skill.ownerId) {
        if (skill.ownerId.trim().toLowerCase() === myId) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        if (q && !skill.searchBlob.includes(q)) return false;
      }

      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(skill.category)
      ) {
        return false;
      }

      if (filters.locations.length > 0) {
        const hasMatch = filters.locations.some((loc) => {
          if (loc === "Online" && skill.isOnline) return true;
          if (loc === "In-Person" && skill.isInPerson) return true;
          return false;
        });
        if (!hasMatch) return false;
      }

      if (
        filters.minRating > 0 &&
        skill.instructor.rating < filters.minRating
      ) {
        return false;
      }

      return true;
    });
  }, [searchQuery, filters, catalog, user?.id]);

  const sortedSkills = useMemo(() => {
    const list = [...filteredSkills];
    switch (sortBy) {
      case "rated":
        return list.sort((a, b) => b.instructor.rating - a.instructor.rating);
      case "newest":
        return list.sort(
          (a, b) =>
            Date.parse(b.createdAt || "0") - Date.parse(a.createdAt || "0"),
        );
      default:
        return list;
    }
  }, [filteredSkills, sortBy]);

  const totalPages =
    sortedSkills.length === 0
      ? 0
      : Math.ceil(sortedSkills.length / PAGE_SIZE);

  const activePage = useMemo(() => {
    if (totalPages === 0) return 1;
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [totalPages, currentPage]);

  const paginatedSkills = useMemo(() => {
    if (sortedSkills.length === 0) return [];
    const start = (activePage - 1) * PAGE_SIZE;
    return sortedSkills.slice(start, start + PAGE_SIZE);
  }, [sortedSkills, activePage]);

  const skipScrollOnMount = useRef(true);

  useLayoutEffect(() => {
    if (skipScrollOnMount.current) {
      skipScrollOnMount.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [activePage]);

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
  };

  const openMobileFilters = () => {
    setMobileDraftFilters(filters);
    setShowMobileFilters(true);
  };

  const resetMobileFilters = () => {
    setMobileDraftFilters(emptyFilters);
  };

  const filtersActive = hasActiveFilters(filters, searchQuery);
  const mobileDraftActive = hasActiveFilters(mobileDraftFilters);

  const applyMobileFilters = () => {
    setFilters(mobileDraftFilters);
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const clearDesktopFilters = (nextFilters: Filters) => {
    setFilters(nextFilters);
    setCurrentPage(1);
  };

  return (
    <PageLayout onNavigate={onNavigate}>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-white mb-4">
            {b.title}
          </h1>
          <p className="text-lg text-white/90 mb-8">
            {b.subtitle}
          </p>
          
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 w-5 h-5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder={b.searchPlaceholder}
                className="h-12 rounded-xl border-0 bg-input-background pl-12 text-foreground shadow-lg"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Button 
              className="h-12 bg-input-background px-4 text-primary hover:bg-accent md:hidden"
              onClick={openMobileFilters}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters - Desktop */}
          <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <FilterSidebar filters={filters} onFiltersChange={clearDesktopFilters} />
          </div>
          
          {/* Skills Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="min-w-0 flex-1 text-left text-sm text-muted-foreground sm:text-base">
                {catalogLoading
                  ? t.common.loading
                  : filteredSkills.length === 0
                    ? catalog.length === 0
                      ? b.emptyCatalog
                      : formatTemplate(b.noMatches, { total: catalog.length })
                    : formatTemplate(b.showing, {
                        from: (activePage - 1) * PAGE_SIZE + 1,
                        to: Math.min(
                          activePage * PAGE_SIZE,
                          sortedSkills.length,
                        ),
                        count: sortedSkills.length,
                      })}
              </p>
              <div className="ml-auto flex w-fit max-w-full shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
                <Label
                  htmlFor="browse-sort"
                  className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground"
                >
                  {b.sortBy}
                </Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v as SortOption);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="browse-sort"
                    className="h-9 w-[min(100%,10.5rem)] shrink-0 gap-2 rounded-lg border border-border bg-input-background py-0 pl-3.5 pr-3 text-left text-sm text-foreground shadow-sm [&_svg]:ml-0.5"
                  >
                    <SelectValue placeholder={b.sortPlaceholder} />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end" className="rounded-lg border-border bg-popover text-popover-foreground shadow-lg">
                    <SelectItem value="relevant">{b.sortRelevant}</SelectItem>
                    <SelectItem value="rated">{b.sortRated}</SelectItem>
                    <SelectItem value="newest">{b.sortNewest}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {catalogLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <Card key={i} className="rounded-2xl border border-border/70 p-4 shadow-sm">
                    <div className="h-44 w-full animate-pulse rounded-xl bg-muted" />
                    <div className="mt-4 space-y-3">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : sortedSkills.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedSkills.map((skill) => {
                  const isOwnListing =
                    Boolean(user?.id) && skill.ownerId === user?.id;
                  return (
                    <SkillCard
                      key={skill.id}
                      title={skill.title}
                      instructor={skill.instructor}
                      category={skill.category}
                      availability={skill.availability}
                      location={skill.location}
                      image={skill.image}
                      isOnline={skill.isOnline}
                      isInPerson={skill.isInPerson}
                      tags={skill.tags}
                      showBookCta={!isOwnListing}
                      onBookNow={() => onOpenSkillDetail?.(skill.id)}
                      onInstructorClick={() => onOpenUserProfile?.(skill.ownerId)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="mb-2 text-xl text-muted-foreground">
                  {catalog.length === 0 ? b.emptyCatalog : b.noSkillsTitle}
                </p>
                {catalog.length > 0 && filtersActive ? (
                  <>
                    <p className="text-muted-foreground">{b.noSkillsHint}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setFilters(emptyFilters);
                        setSearchQuery("");
                        setSortBy("relevant");
                        setCurrentPage(1);
                      }}
                    >
                      {t.filter.clearAll}
                    </Button>
                  </>
                ) : catalog.length > 0 ? (
                  <p className="text-muted-foreground">{b.noSkillsHint}</p>
                ) : null}
              </div>
            )}
            
            {/* Pagination */}
            {sortedSkills.length > 0 && totalPages > 0 && (
              <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  disabled={activePage <= 1}
                  onClick={() => handlePageChange(Math.max(1, activePage - 1))}
                >
                  {b.previous}
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    type="button"
                    variant={page === activePage ? "default" : "outline"}
                    className={
                      page === activePage
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 min-w-10"
                        : "min-w-10"
                    }
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={activePage >= totalPages}
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, activePage + 1))
                  }
                >
                  {b.next}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showMobileFilters ? (
        <div className="fixed inset-0 z-[120] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg text-foreground">{t.filter.title}</h2>
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                onClick={() => setShowMobileFilters(false)}
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(85vh-8.5rem)] overflow-y-auto pb-2">
              <FilterSidebar
                filters={mobileDraftFilters}
                onFiltersChange={setMobileDraftFilters}
                showClearButton={false}
              />
            </div>
            <div
              className={
                mobileDraftActive
                  ? "mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3"
                  : "mt-3 border-t border-border pt-3"
              }
            >
              {mobileDraftActive ? (
                <Button type="button" variant="outline" onClick={resetMobileFilters}>
                  {t.filter.clearAll}
                </Button>
              ) : null}
              <Button
                type="button"
                className={
                  mobileDraftActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    : "w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                }
                onClick={applyMobileFilters}
              >
                Uygula
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </PageLayout>
  );
}
