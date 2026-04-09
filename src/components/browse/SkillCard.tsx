import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { Clock, Star, MapPin } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface SkillCardProps {
  id: string;
  title: string;
  instructor: {
    name: string;
    image: string;
    rating: number;
    reviews: number;
  };
  category: string;
  duration: string;
  location: string;
  timeCredits: number;
  image: string;
  tags: string[];
}

export function SkillCard({ 
  title, 
  instructor, 
  category, 
  duration, 
  location, 
  timeCredits, 
  image, 
  tags 
}: SkillCardProps) {
  const { t } = useLanguage();
  const b = t.browse;
  const sc = t.skillCard;
  const categoryLabel = b.categoryLabels[category] ?? category;
  const durationLabel = b.durationLabels[duration] ?? duration;
  const locationLabel = b.locationLineLabels[location] ?? location;

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback 
          src={image} 
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <Badge className="absolute right-3 top-3 border-0 bg-background/95 text-foreground shadow-sm backdrop-blur-sm hover:bg-accent">
          {categoryLabel}
        </Badge>
      </div>
      
      <div className="p-5">
        <h3 className="mb-3 text-xl text-foreground">
          {title}
        </h3>
        
        <div className="mb-4 flex items-center gap-3">
          <ImageWithFallback 
            src={instructor.image}
            alt={instructor.name}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-sm text-foreground">{instructor.name}</p>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-muted-foreground">
                {instructor.rating} ({instructor.reviews})
              </span>
            </div>
          </div>
        </div>
        
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{durationLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{locationLabel}</span>
          </div>
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl text-transparent">
              {timeCredits}h
            </p>
            <p className="text-xs text-muted-foreground">{sc.timeCredits}</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            {sc.bookNow}
          </Button>
        </div>
      </div>
    </Card>
  );
}
