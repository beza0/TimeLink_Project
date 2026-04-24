import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { Star } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

interface SkillCardProps {
  title: string;
  instructor: {
    name: string;
    image: string;
    rating: number;
    reviews: number;
  };
  category: string;
  availability: string;
  location: string | null;
  image: string;
  isOnline: boolean;
  isInPerson: boolean;
  tags: string[];
  /** Kendi ilanın; Book gösterilmez */
  showBookCta?: boolean;
  onBookNow?: () => void;
}

export function SkillCard({
  title,
  instructor,
  category,
  availability,
  location,
  image,
  isOnline,
  isInPerson,
  tags,
  showBookCta = true,
  onBookNow,
}: SkillCardProps) {
  const { t } = useLanguage();
  const b = t.browse;
  const sc = t.skillCard;
  const categoryLabel = b.categoryLabels[category] ?? category;
  const sessionTypeLabel =
    isOnline && isInPerson
      ? b.locationLineLabels["Online & In-Person"]
      : isInPerson
        ? b.locationLineLabels["In-Person"]
        : b.locationLineLabels.Online;
  const locationLabel = location;
  const hasAvatar = Boolean(instructor.image?.trim());
  const hasCover = Boolean(image?.trim());

  return (
    <Card className="group overflow-hidden rounded-2xl border border-border/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden">
        {hasCover ? (
          <ImageWithFallback
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div
            className="h-full w-full bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 opacity-90 transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
            aria-hidden
          />
        )}
        <Badge className="absolute right-3 top-3 border-0 bg-background/95 text-foreground shadow-sm backdrop-blur-sm hover:bg-accent">
          {categoryLabel}
        </Badge>
      </div>

      <div className="p-5">
        <h3 className="mb-3 text-xl text-foreground">{title}</h3>

        <div className="mb-4 flex items-center gap-3">
          {hasAvatar ? (
            <ImageWithFallback
              src={instructor.image}
              alt={instructor.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              aria-hidden
            >
              {initials(instructor.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{instructor.name}</p>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
              <span className="text-xs text-muted-foreground">
                {instructor.reviews > 0
                  ? `${instructor.rating} (${instructor.reviews})`
                  : sc.noRatingsYet}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {sessionTypeLabel}
          </Badge>
          {isInPerson && locationLabel ? (
            <Badge variant="outline" className="text-xs">
              {locationLabel}
            </Badge>
          ) : null}
          {availability ? (
            <Badge variant="outline" className="text-xs">
              {availability}
            </Badge>
          ) : null}
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className={`flex items-center border-t border-border pt-4 ${showBookCta ? "justify-end" : ""}`}>
          {showBookCta ? (
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              onClick={onBookNow}
            >
              {sc.bookNow}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
