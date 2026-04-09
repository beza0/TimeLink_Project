import { Card } from "../ui/card";
import {type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, gradient, description }: StatCardProps) {
  return (
    <Card className="rounded-2xl border-0 p-6 shadow-lg transition-shadow hover:shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-1`}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
}
