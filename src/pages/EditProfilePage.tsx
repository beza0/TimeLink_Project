import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { Camera } from "lucide-react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";

interface EditProfilePageProps {
  onNavigate?: (page: PageType) => void;
}

export function EditProfilePage({ onNavigate }: EditProfilePageProps) {
  const { t } = useLanguage();
  const e = t.editProfile;

  return (
    <PageLayout onNavigate={onNavigate}>
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl text-foreground">{e.title}</h1>
            <p className="text-muted-foreground">{e.subtitle}</p>
          </div>

          <Card className="rounded-2xl border-0 p-8 shadow-lg">
            <form className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1719257751404-1dea075324bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMG1hbnxlbnwxfHx8fDE3NjAwOTMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover"
                  />
                  <button 
                    type="button"
                    className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{e.photoHint}</p>
              </div>

              <div>
                <Label htmlFor="name">{e.fullName}</Label>
                <Input 
                  id="name"
                  defaultValue="Alex Thompson"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email">{e.email}</Label>
                <Input 
                  id="email"
                  type="email"
                  defaultValue="alex.thompson@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="bio">{e.bio}</Label>
                <Textarea 
                  id="bio"
                  defaultValue="Passionate about teaching web development and learning new languages. Love connecting with people through skill exchange!"
                  className="mt-2 min-h-24"
                  placeholder={e.bioPh}
                />
              </div>

              <div>
                <Label htmlFor="location">{e.location}</Label>
                <Input 
                  id="location"
                  defaultValue="San Francisco, CA"
                  placeholder={e.locationPh}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="phone">{e.phone}</Label>
                <Input 
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="languages">{e.languages}</Label>
                <Input 
                  id="languages"
                  defaultValue="English, Spanish"
                  placeholder={e.languagesPh}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="website">{e.website}</Label>
                <Input 
                  id="website"
                  type="url"
                  placeholder={e.websitePh}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedin">{e.linkedin}</Label>
                  <Input 
                    id="linkedin"
                    placeholder={e.linkedinPh}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">{e.twitter}</Label>
                  <Input 
                    id="twitter"
                    placeholder={e.twitterPh}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button 
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onNavigate?.("profile")}
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                >
                  {t.common.saveChanges}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
      
    </PageLayout>
  );
}
