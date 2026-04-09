import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Star,
  Clock,
  Calendar,
  Users,
  Award,
  Video,
  MessageCircle,
} from "lucide-react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { formatTemplate } from "../i18n/messages";

interface SkillDetailPageProps {
  onNavigate?: (page: PageType) => void;
}

const reviews = [
  {
    id: "1",
    student: {
      name: "John Doe",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    rating: 5,
    comment: "Amazing teacher! Very patient and explains concepts clearly. I learned so much in just a few sessions.",
    date: "2 weeks ago"
  },
  {
    id: "2",
    student: {
      name: "Jane Smith",
      image: "https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    rating: 5,
    comment: "Excellent teaching style! Makes complex topics easy to understand.",
    date: "1 month ago"
  },
  {
    id: "3",
    student: {
      name: "Mike Johnson",
      image: "https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080"
    },
    rating: 4,
    comment: "Great experience! Would recommend to anyone wanting to learn web development.",
    date: "2 months ago"
  }
];

export function SkillDetailPage({ onNavigate }: SkillDetailPageProps) {
  const { t } = useLanguage();
  const s = t.skillDetail;

  return (
    <PageLayout onNavigate={onNavigate} className="min-h-screen bg-gray-50">
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-8 rounded-2xl border-0 shadow-lg">
                <Badge className="mb-4">{s.categoryProgramming}</Badge>
                <h1 className="text-3xl text-gray-900 mb-4">{s.courseTitle}</h1>
                
                <div className="flex items-center gap-6 mb-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span>
                      {formatTemplate(s.reviewsCount, { rating: "5.0", count: "156" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span>{formatTemplate(s.studentsCount, { n: "234" })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <span>{s.perSession}</span>
                  </div>
                </div>

                <Tabs defaultValue="about" className="mt-6">
                  <TabsList>
                    <TabsTrigger value="about">{s.tabAbout}</TabsTrigger>
                    <TabsTrigger value="curriculum">{s.tabCurriculum}</TabsTrigger>
                    <TabsTrigger value="reviews">{s.tabReviews}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-lg text-gray-900 mb-2">{s.whatYouLearn}</h3>
                      <ul className="space-y-2 text-gray-600">
                        {s.learnItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg text-gray-900 mb-2">{s.descriptionTitle}</h3>
                      <p className="text-gray-600">
                        {s.descriptionBody}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg text-gray-900 mb-2">{s.prerequisitesTitle}</h3>
                      <p className="text-gray-600">
                        {s.prerequisitesBody}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="curriculum" className="mt-6 space-y-3">
                    {s.curriculum.map((week, i) => (
                      <Card key={i} className="p-4 border border-gray-200 rounded-xl">
                        <h4 className="text-gray-900 mb-1">{week.title}</h4>
                        <p className="text-sm text-gray-600">{week.desc}</p>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-6 space-y-4">
                    {reviews.map(review => (
                      <Card key={review.id} className="p-5 border border-gray-200 rounded-xl">
                        <div className="flex items-start gap-4">
                          <ImageWithFallback 
                            src={review.student.image}
                            alt={review.student.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-gray-900">{review.student.name}</h4>
                              <div className="flex items-center gap-1">
                                {[...Array(review.rating)].map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-700 mb-2">{review.comment}</p>
                            <p className="text-xs text-gray-500">{review.date}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="p-6 rounded-2xl border-0 shadow-lg sticky top-24">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1655249481446-25d575f1c054?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHdvbWFufGVufDF8fHx8MTc2MDE2NzQxMnww&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Emily Chen"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{s.instructor}</p>
                    <h3 className="text-gray-900">Emily Chen</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">
                        {formatTemplate(s.reviewsCount, { rating: "5.0", count: "156" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-3xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {s.creditsTitle}
                  </p>
                  <p className="text-sm text-gray-600">{s.perSessionLabel}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">{s.detailOnline}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">{s.detailSchedule}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">{s.detailCert}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-6">
                    {s.bookSession}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onNavigate?.("messages")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {s.messageInstructor}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
    </PageLayout>
  );
}
