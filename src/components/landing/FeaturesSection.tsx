import { Card } from "../ui/card";
import { Handshake, Clock, Heart } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const icons = [Handshake, Clock, Heart] as const;
const gradients = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-orange-500 to-red-500",
] as const;

export function FeaturesSection() {
  const { t } = useLanguage();
  const f = t.landing.features;

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl text-gray-900 mb-4">
            {f.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {f.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {f.items.map((feature, index) => {
            const Icon = icons[index];
            const gradient = gradients[index];
            return (
              <Card 
                key={index}
                className="p-8 border-0 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl sm:text-2xl text-gray-900 mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
