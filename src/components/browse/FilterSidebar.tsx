import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Slider } from "../ui/slider";
import { Label } from "../ui/label";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatTemplate } from "../../language";

const FILTER_CATEGORIES = [
  "Sports",
  "Arts",
  "Languages",
  "Programming",
  "Music",
  "Cooking",
  "Photography",
  "Writing",
  "Design",
] as const;

const LOCATION_KEYS = ["Online", "In-Person"] as const;

export interface Filters {
  categories: string[];
  locations: string[];
  minRating: number;
  timeCreditsRange: [number, number];
}

interface FilterSidebarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const { t } = useLanguage();
  const fi = t.filter;
  const catLabels = t.browse.categoryLabels;
  const locLabels = t.browse.locationLabels;

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleLocation = (location: string) => {
    const newLocations = filters.locations.includes(location)
      ? filters.locations.filter((l) => l !== location)
      : [...filters.locations, location];
    onFiltersChange({ ...filters, locations: newLocations });
  };

  const setMinRating = (rating: number) => {
    onFiltersChange({ ...filters, minRating: rating });
  };

  const clearFilters = () => {
    onFiltersChange({
      categories: [],
      locations: [],
      minRating: 0,
      timeCreditsRange: [1, 20],
    });
  };

  return (
    <Card className="w-full rounded-2xl border border-border/80 p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg text-foreground">{fi.title}</h3>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          {fi.clearAll}
        </Button>
      </div>
      
      <div className="mb-6">
        <Label className="mb-3 block text-sm text-foreground">{fi.categories}</Label>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {FILTER_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center gap-2">
              <Checkbox 
                id={category} 
                checked={filters.categories.includes(category)}
                onCheckedChange={() => toggleCategory(category)}
              />
              <label 
                htmlFor={category} 
                className="cursor-pointer text-sm text-muted-foreground"
              >
                {catLabels[category] ?? category}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <Label className="mb-3 block text-sm text-foreground">{fi.location}</Label>
        <div className="space-y-3">
          {LOCATION_KEYS.map((location) => (
            <div key={location} className="flex items-center gap-2">
              <Checkbox 
                id={location}
                checked={filters.locations.includes(location)}
                onCheckedChange={() => toggleLocation(location)}
              />
              <label 
                htmlFor={location} 
                className="cursor-pointer text-sm text-muted-foreground"
              >
                {locLabels[location] ?? location}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <Label className="mb-3 block text-sm text-foreground">
          {formatTemplate(fi.timeCreditsRange, {
            min: filters.timeCreditsRange[0],
            max: filters.timeCreditsRange[1],
          })}
        </Label>
        <Slider 
          value={filters.timeCreditsRange} 
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              timeCreditsRange: value as [number, number],
            })
          }
          max={20} 
          step={1} 
          className="mb-2" 
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fi.h1}</span>
          <span>{fi.h20}</span>
        </div>
      </div>
      
      <div className="mb-6">
        <Label className="mb-3 block text-sm text-foreground">{fi.minRating}</Label>
        <div className="space-y-3">
          {[4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-2">
              <Checkbox 
                id={`rating-${rating}`}
                checked={filters.minRating === rating}
                onCheckedChange={() =>
                  setMinRating(filters.minRating === rating ? 0 : rating)
                }
              />
              <label 
                htmlFor={`rating-${rating}`} 
                className="cursor-pointer text-sm text-muted-foreground"
              >
                {rating}
                {fi.starsSuffix}
              </label>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
