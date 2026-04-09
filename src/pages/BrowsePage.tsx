import { PageLayout } from "../components/layout/PageLayout";
import { SkillCard } from "../components/browse/SkillCard";
import { FilterSidebar } from "../components/browse/FilterSidebar";
import type { Filters } from "../components/browse/FilterSidebar";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { formatTemplate } from "../i18n/messages";

interface BrowsePageProps {
  onNavigate?: (page: PageType) => void;
}

const PAGE_SIZE = 6;

type SortOption = "relevant" | "rated" | "credits" | "newest";

const mockSkills = [
  {
    id: "1",
    title: "Beginner Yoga Classes",
    instructor: {
      name: "Sarah Martinez",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      rating: 4.9,
      reviews: 127
    },
    category: "Sports",
    duration: "1 hour/session",
    location: "Online & In-Person",
    timeCredits: 2,
    image: "https://images.unsplash.com/photo-1758274535024-be3faa30f507?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b2dhJTIwaW5zdHJ1Y3RvciUyMHRlYWNoaW5nfGVufDF8fHx8MTc2MDEyMDA0N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    tags: ["Beginner", "Wellness", "Flexibility"]
  },
  {
    id: "2",
    title: "Guitar Lessons for All Levels",
    instructor: {
      name: "Marcus Johnson",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      rating: 4.8,
      reviews: 93
    },
    category: "Music",
    duration: "1.5 hours/session",
    location: "In-Person",
    timeCredits: 3,
    image: "https://images.unsplash.com/photo-1724161644178-95e09f524020?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxndWl0YXIlMjB0ZWFjaGVyJTIwbXVzaWNpYW58ZW58MXx8fHwxNzYwMTkyODI1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    tags: ["Music", "Acoustic", "Electric"]
  },
  {
    id: "3",
    title: "Web Development Fundamentals",
    instructor: {
      name: "Emily Chen",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      rating: 5.0,
      reviews: 156
    },
    category: "Programming",
    duration: "2 hours/session",
    location: "Online",
    timeCredits: 4,
    image: "https://images.unsplash.com/photo-1565229284535-2cbbe3049123?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9ncmFtbWluZyUyMGNvZGluZyUyMGxlc3NvbnxlbnwxfHx8fDE3NjAxOTI4MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    tags: ["HTML", "CSS", "JavaScript"]
  },
  {
    id: "4",
    title: "Spanish Conversation Practice",
    instructor: {
      name: "Carlos Rodriguez",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      rating: 4.7,
      reviews: 84
    },
    category: "Languages",
    duration: "1 hour/session",
    location: "Online",
    timeCredits: 2,
    image: "https://images.unsplash.com/photo-1605711285791-0219e80e43a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB0ZWFjaGluZyUyMGNsYXNzfGVufDF8fHx8MTc2MDE5MjgyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    tags: ["Intermediate", "Conversation", "Culture"]
  },
  {
    id: "5",
    title: "Digital Painting Basics",
    instructor: {
      name: "Alex Kim",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      rating: 4.9,
      reviews: 112
    },
    category: "Arts",
    duration: "2 hours/session",
    location: "Online",
    timeCredits: 3,
    image: "https://images.unsplash.com/photo-1605711285791-0219e80e43a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB0ZWFjaGluZyUyMGNsYXNzfGVufDF8fHx8MTc2MDE5MjgyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    tags: ["Digital Art", "Procreate", "Photoshop"]
  },
  {
    id: "6",
    title: "Photography Composition",
    instructor: {
      name: "David Park",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      rating: 4.8,
      reviews: 98
    },
    category: "Arts",
    duration: "1.5 hours/session",
    location: "In-Person",
    timeCredits: 3,
    image: "https://images.unsplash.com/photo-1605711285791-0219e80e43a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB0ZWFjaGluZyUyMGNsYXNzfGVufDF8fHx8MTc2MDE5MjgyM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    tags: ["Photography", "Composition", "Lighting"]
  },
  {
    id: "7",
    title: "Italian Cooking from Scratch",
    instructor: {
      name: "Maria Rossi",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080",
      rating: 4.9,
      reviews: 64
    },
    category: "Cooking",
    duration: "2 hours/session",
    location: "In-Person",
    timeCredits: 3,
    image: "https://images.unsplash.com/photo-1605711285791-0219e80e43a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB0ZWFjaGluZyUyMGNsYXNzfGVufDF8fHx8MTc2MDE5MjgyM3ww&ixlib=rb-4.1.0&q=80&w=1080",
    tags: ["Italian", "Pasta", "Home cooking"]
  },
  {
    id: "8",
    title: "Creative Writing Workshop",
    instructor: {
      name: "James Wilson",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      rating: 4.6,
      reviews: 41
    },
    category: "Writing",
    duration: "1 hour/session",
    location: "Online",
    timeCredits: 2,
    image: "https://images.unsplash.com/photo-1565229284535-2cbbe3049123?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9ncmFtbWluZyUyMGNvZGluZyUyMGxlc3NvbnxlbnwxfHx8fDE3NjAxOTI4MjV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    tags: ["Fiction", "Stories", "Editing"]
  },
  {
    id: "9",
    title: "UI/UX Design Fundamentals",
    instructor: {
      name: "Priya Sharma",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080",
      rating: 5.0,
      reviews: 203
    },
    category: "Design",
    duration: "1.5 hours/session",
    location: "Online & In-Person",
    timeCredits: 4,
    image: "https://images.unsplash.com/photo-1724161644178-95e09f524020?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxndWl0YXIlMjB0ZWFjaGVyJTIwbXVzaWNpYW58ZW58MXx8fHwxNzYwMTkyODI1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    tags: ["Figma", "Wireframes", "Prototyping"]
  },
  {
    id: "10",
    title: "Beginner Piano Lessons",
    instructor: {
      name: "Lisa Anderson",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080",
      rating: 4.8,
      reviews: 76
    },
    category: "Music",
    duration: "1 hour/session",
    location: "In-Person",
    timeCredits: 2,
    image: "https://images.unsplash.com/photo-1605711285791-0219e80e43a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjB0ZWFjaGluZyUyMGNsYXNzfGVufDF8fHx8MTc2MDE5MjgyM3ww&ixlib=rb-4.1.0&q=80&w=1080",
    tags: ["Piano", "Reading music", "Classical"]
  }
];

export function BrowsePage({ onNavigate }: BrowsePageProps) {
  const { t } = useLanguage();
  const b = t.browse;
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("relevant");
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    locations: [],
    minRating: 0,
    timeCreditsRange: [1, 20]
  });

  // Filter skills based on search and filters
  const filteredSkills = useMemo(() => {
    return mockSkills.filter(skill => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          skill.title.toLowerCase().includes(query) ||
          skill.instructor.name.toLowerCase().includes(query) ||
          skill.category.toLowerCase().includes(query) ||
          skill.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(skill.category)) {
        return false;
      }

      // Location filter
      if (filters.locations.length > 0) {
        const skillLocation = skill.location.toLowerCase();
        const hasMatch = filters.locations.some(loc => {
          if (loc === "Online" && skillLocation.includes("online")) return true;
          if (loc === "In-Person" && !skillLocation.includes("online")) return true;
          return false;
        });
        if (!hasMatch) return false;
      }

      // Rating filter
      if (skill.instructor.rating < filters.minRating) {
        return false;
      }

      // Time credits filter
      if (skill.timeCredits < filters.timeCreditsRange[0] || skill.timeCredits > filters.timeCreditsRange[1]) {
        return false;
      }

      return true;
    });
  }, [searchQuery, filters]);

  const sortedSkills = useMemo(() => {
    const list = [...filteredSkills];
    switch (sortBy) {
      case "rated":
        return list.sort((a, b) => b.instructor.rating - a.instructor.rating);
      case "credits":
        return list.sort((a, b) => a.timeCredits - b.timeCredits);
      case "newest":
        return list.sort((a, b) => Number(b.id) - Number(a.id));
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortBy]);

  useEffect(() => {
    if (totalPages === 0) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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

  return (
    <PageLayout onNavigate={onNavigate} className="min-h-screen bg-gray-50">
      
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input 
                placeholder={b.searchPlaceholder}
                className="pl-12 h-12 bg-white border-0 rounded-xl shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              className="md:hidden bg-white text-purple-600 hover:bg-gray-100 h-12 px-4"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
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
            <FilterSidebar filters={filters} onFiltersChange={setFilters} />
          </div>
          
          {/* Filters - Mobile */}
          {showMobileFilters && (
            <div className="lg:hidden col-span-1 mb-6">
              <FilterSidebar filters={filters} onFiltersChange={setFilters} />
            </div>
          )}
          
          {/* Skills Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="min-w-0 flex-1 text-left text-sm text-gray-600 sm:text-base">
                {filteredSkills.length === 0
                  ? formatTemplate(b.noMatches, { total: mockSkills.length })
                  : formatTemplate(b.showing, {
                      from: (activePage - 1) * PAGE_SIZE + 1,
                      to: Math.min(activePage * PAGE_SIZE, sortedSkills.length),
                      count: sortedSkills.length,
                    })}
              </p>
              <div className="ml-auto flex w-fit max-w-full shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
                <Label
                  htmlFor="browse-sort"
                  className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-600"
                >
                  {b.sortBy}
                </Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                >
                  <SelectTrigger
                    id="browse-sort"
                    className="h-9 w-[min(100%,10.5rem)] shrink-0 gap-2 rounded-lg border border-gray-200 bg-white py-0 pl-3.5 pr-3 text-left text-sm shadow-sm [&_svg]:ml-0.5"
                  >
                    <SelectValue placeholder={b.sortPlaceholder} />
                  </SelectTrigger>
                  <SelectContent position="popper" align="end" className="rounded-lg border-gray-200 shadow-lg">
                    <SelectItem value="relevant">{b.sortRelevant}</SelectItem>
                    <SelectItem value="rated">{b.sortRated}</SelectItem>
                    <SelectItem value="credits">{b.sortCredits}</SelectItem>
                    <SelectItem value="newest">{b.sortNewest}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {sortedSkills.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedSkills.map((skill) => (
                  <SkillCard key={skill.id} {...skill} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600 mb-2">{b.noSkillsTitle}</p>
                <p className="text-gray-500">{b.noSkillsHint}</p>
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
      
    </PageLayout>
  );
}
