import { Card } from "../ui/card";
import { Dumbbell, Palette, Languages, Code, Music } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const icons = [Dumbbell, Palette, Languages, Code, Music] as const;
const colors = [
  "from-green-400 to-emerald-600",
  "from-pink-400 to-rose-600",
  "from-blue-400 to-indigo-600",
  "from-purple-400 to-violet-600",
  "from-orange-400 to-amber-600",
] as const;
const bgColors = [
  "bg-green-50",
  "bg-pink-50",
  "bg-blue-50",
  "bg-purple-50",
  "bg-orange-50",
] as const;

export function CategoriesSection() {
  const { t } = useLanguage();
  const c = t.landing.categories;

  return (
    <section id="categories" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl text-gray-900 mb-4">
            {c.title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {c.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {c.items.map((category, index) => {
            const Icon = icons[index];
            return (
              <Card 
                key={index}
                className={`p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 rounded-2xl ${bgColors[index]} group`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors[index]} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="text-lg text-gray-900 mb-1">
                  {category.name}
                </h3>
                
                <p className="text-sm text-gray-600">
                  {category.count}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
