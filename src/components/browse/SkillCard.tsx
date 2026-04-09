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
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 rounded-2xl">
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback 
          src={image} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <Badge className="absolute top-3 right-3 bg-white/90 text-gray-900 hover:bg-white">
          {categoryLabel}
        </Badge>
      </div>
      
      <div className="p-5">
        <h3 className="text-xl text-gray-900 mb-3">
          {title}
        </h3>
        
        <div className="flex items-center gap-3 mb-4">
          <ImageWithFallback 
            src={instructor.image}
            alt={instructor.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-sm text-gray-900">{instructor.name}</p>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-600">
                {instructor.rating} ({instructor.reviews})
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{durationLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{locationLabel}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {timeCredits}h
            </p>
            <p className="text-xs text-gray-500">{sc.timeCredits}</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            {sc.bookNow}
          </Button>
        </div>
      </div>
    </Card>
  );
}
