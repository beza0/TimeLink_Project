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
/* Açık pastel yüzey: koyu temada da aynı (metin her zaman koyu mürekkep) */
const bgColors = [
  "bg-emerald-50",
  "bg-rose-50",
  "bg-sky-50",
  "bg-violet-50",
  "bg-amber-50",
] as const;

export function CategoriesSection() {
  const { t } = useLanguage();
  const c = t.landing.categories;

  return (
    <section id="categories" className="bg-background px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl text-foreground sm:text-4xl md:text-5xl">
            {c.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {c.subtitle}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
          {c.items.map((category, index) => {
            const Icon = icons[index];
            return (
              <Card
                key={index}
                className={`group cursor-pointer rounded-2xl border border-slate-200/90 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:ring-1 dark:ring-white/5 ${bgColors[index]}`}
              >
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${colors[index]} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                <h3 className="mb-1 text-lg font-medium text-slate-900">
                  {category.name}
                </h3>

                <p className="text-sm text-slate-600">
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
