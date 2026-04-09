import { Card } from "../ui/card";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { Star } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const images = [
  "https://images.unsplash.com/photo-1745434159123-af6142c7862f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwd29tYW4lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzYwMTQ4MzIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1746813629105-3c4a26b09936?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2MDE2OTMyN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1656582117510-3a177bf866c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHBlcnNvbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDE3NDIwNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
] as const;

export function TestimonialsSection() {
  const { t } = useLanguage();
  const tm = t.landing.testimonials;

  return (
    <section id="testimonials" className="bg-gradient-to-br from-muted/60 to-muted px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl text-foreground sm:text-4xl md:text-5xl">
            {tm.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {tm.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {tm.items.map((testimonial, index) => (
            <Card 
              key={index}
              className="rounded-3xl border border-border/80 bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="mb-6 italic text-foreground/90">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              
              <div className="flex items-center gap-4">
                <ImageWithFallback 
                  src={images[index]}
                  alt={testimonial.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-foreground">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
