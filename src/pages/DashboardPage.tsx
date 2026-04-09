import { PageLayout } from "../components/layout/PageLayout";
import type { PageType } from "../App";
import { StatCard } from "../components/dashboard/StatCard";
import { UpcomingSession } from "../components/dashboard/UpcomingSession";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Clock, TrendingUp, BookOpen, Award, Plus } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { formatTemplate } from "../language";

interface DashboardPageProps {
  onNavigate?: (page: PageType) => void;
}

const statIcons = [
  Clock,
  BookOpen,
  TrendingUp,
  Award,
] as const;
const statGradients = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-orange-500 to-red-500",
  "from-green-500 to-emerald-500",
] as const;
const statValues = ["24h", "5", "3", "8"] as const;

const upcomingSessions = [
  {
    id: "1",
    title: "Yoga for Beginners",
    instructor: {
      name: "Sarah Martinez",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    },
    date: "Oct 12, 2025",
    time: "10:00 AM",
    duration: "1h",
    location: "Zoom Meeting",
    type: "online" as const
  },
  {
    id: "2",
    title: "Guitar Advanced Techniques",
    instructor: {
      name: "Marcus Johnson",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    },
    date: "Oct 13, 2025",
    time: "2:00 PM",
    duration: "1.5h",
    location: "Music Studio, Downtown",
    type: "in-person" as const
  },
  {
    id: "3",
    title: "Web Development Q&A",
    instructor: {
      name: "Emily Chen",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    },
    date: "Oct 14, 2025",
    time: "6:00 PM",
    duration: "2h",
    location: "Google Meet",
    type: "online" as const
  }
];

const learningProgress = [
  { skill: "Spanish Conversation", progress: 75, instructor: "Carlos R." },
  { skill: "Digital Painting", progress: 45, instructor: "Alex K." },
  { skill: "Photography Basics", progress: 60, instructor: "David P." }
];

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { t } = useLanguage();
  const d = t.dashboard;
  const { user } = useAuth();
  const displayName = user?.name ?? "Alex";

  return (
    <PageLayout onNavigate={onNavigate}>
      
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl text-white mb-2">
            {formatTemplate(d.welcome, { name: displayName })}
          </h1>
          <p className="text-lg text-white/90">
            {d.subtitle}
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {d.stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={statValues[index]}
              icon={statIcons[index]}
              gradient={statGradients[index]}
              description={stat.description}
            />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border-0 p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl text-foreground">{d.upcomingTitle}</h2>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  onClick={() => onNavigate?.("browse")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {d.bookNew}
                </Button>
              </div>
              
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <UpcomingSession key={session.id} {...session} />
                ))}
              </div>
              
              <Button 
                variant="ghost" 
                className="w-full mt-4"
                onClick={() => onNavigate?.("past-sessions")}
              >
                {d.viewAllSessions}
              </Button>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="rounded-2xl border-0 p-6 shadow-lg">
              <h3 className="mb-4 text-lg text-foreground">{d.quickActions}</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  onClick={() => onNavigate?.("add-skill")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {d.offerSkill}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onNavigate?.("browse")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {d.browseSkills}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onNavigate?.("past-sessions")}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {d.viewPastSessions}
                </Button>
              </div>
            </Card>
            
            <Card className="rounded-2xl border-0 p-6 shadow-lg">
              <h3 className="mb-4 text-lg text-foreground">{d.learningProgress}</h3>
              <div className="space-y-4">
                {learningProgress.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm text-foreground">{item.skill}</p>
                        <p className="text-xs text-muted-foreground">{item.instructor}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
      
    </PageLayout>
  );
}
