import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";

interface AddSkillPageProps {
  onNavigate?: (page: PageType) => void;
}

const CATEGORY_KEYS = [
  "Sports", "Arts", "Languages", "Programming", "Music",
  "Cooking", "Photography", "Writing", "Design",
] as const;

const DAY_KEYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

export function AddSkillPage({ onNavigate }: AddSkillPageProps) {
  const { t } = useLanguage();
  const a = t.addSkill;
  const catLabels = t.browse.categoryLabels;

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [locationType, setLocationType] = useState<string[]>([]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((x) => x !== tag));
  };

  const toggleLocationType = (type: string) => {
    setLocationType(prev =>
      prev.includes(type) ? prev.filter(ty => ty !== type) : [...prev, type]
    );
  };

  return (
    <PageLayout onNavigate={onNavigate} className="min-h-screen bg-gray-50">
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl text-gray-900 mb-2">{a.title}</h1>
            <p className="text-gray-600">{a.subtitle}</p>
          </div>

          <Card className="p-8 rounded-2xl border-0 shadow-lg">
            <form className="space-y-6">
              <div>
                <Label htmlFor="title">{a.skillTitle}</Label>
                <Input 
                  id="title"
                  placeholder={a.skillTitlePh}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="category">{a.category}</Label>
                <Select>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={a.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_KEYS.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {catLabels[cat] ?? cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">{a.description}</Label>
                <Textarea 
                  id="description"
                  placeholder={a.descriptionPh}
                  className="mt-2 min-h-32"
                />
              </div>

              <div>
                <Label htmlFor="level">{a.level}</Label>
                <Select>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={a.selectLevel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{a.levelBeginner}</SelectItem>
                    <SelectItem value="intermediate">{a.levelIntermediate}</SelectItem>
                    <SelectItem value="advanced">{a.levelAdvanced}</SelectItem>
                    <SelectItem value="expert">{a.levelExpert}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{a.sessionType}</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="online"
                      checked={locationType.includes("online")}
                      onCheckedChange={() => toggleLocationType("online")}
                    />
                    <label htmlFor="online" className="text-sm cursor-pointer">{a.online}</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="in-person"
                      checked={locationType.includes("in-person")}
                      onCheckedChange={() => toggleLocationType("in-person")}
                    />
                    <label htmlFor="in-person" className="text-sm cursor-pointer">{a.inPerson}</label>
                  </div>
                </div>
              </div>

              {locationType.includes("in-person") && (
                <div>
                  <Label htmlFor="location">{a.location}</Label>
                  <Input 
                    id="location"
                    placeholder={a.locationPh}
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="credits">{a.creditsPerHour}</Label>
                <Input 
                  id="credits"
                  type="number"
                  min="1"
                  max="10"
                  placeholder={a.creditsPh}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">{a.creditsHint}</p>
              </div>

              <div>
                <Label htmlFor="duration">{a.durationMin}</Label>
                <Select>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={a.selectDuration} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">{a.dur30}</SelectItem>
                    <SelectItem value="60">{a.dur60}</SelectItem>
                    <SelectItem value="90">{a.dur90}</SelectItem>
                    <SelectItem value="120">{a.dur120}</SelectItem>
                    <SelectItem value="180">{a.dur180}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{a.availableDays}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  {DAY_KEYS.map((dayKey, i) => (
                    <div key={dayKey} className="flex items-center gap-2">
                      <Checkbox 
                        id={dayKey}
                        checked={selectedDays.includes(dayKey)}
                        onCheckedChange={() => toggleDay(dayKey)}
                      />
                      <label htmlFor={dayKey} className="text-sm cursor-pointer">
                        {a.days[i]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">{a.availableFrom}</Label>
                  <Input 
                    id="start-time"
                    type="time"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">{a.availableUntil}</Label>
                  <Input 
                    id="end-time"
                    type="time"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tags">{a.tags}</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    id="tags"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder={a.tagsPh}
                  />
                  <Button type="button" onClick={addTag}>{a.add}</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <Button 
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onNavigate?.("dashboard")}
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                >
                  {a.publish}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
      
    </PageLayout>
  );
}
