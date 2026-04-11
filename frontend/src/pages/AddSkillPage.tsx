import { PageLayout } from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import type { Messages } from "../language";
import { createSkill } from "../api/skills";
import { apiErrorDisplayMessage } from "../api/client";

interface AddSkillPageProps {
  onNavigate?: (page: PageType) => void;
}

const CATEGORY_KEYS = [
  "Sports",
  "Arts",
  "Languages",
  "Programming",
  "Music",
  "Cooking",
  "Photography",
  "Writing",
  "Design",
] as const;

/** Dropdown’da “Diğer”; API’ye gönderilmez, custom metin kullanılır */
const CATEGORY_OTHER = "Other";

const DAY_KEYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function buildDescription(
  base: string,
  a: Messages["addSkill"],
  opts: {
    locationType: string[];
    locationText: string;
    selectedDays: string[];
    dayLabels: string[];
    startTime: string;
    endTime: string;
    tags: string[];
  },
): string {
  const lines: string[] = [];
  if (opts.locationType.length > 0) {
    lines.push(
      `${a.sessionType}: ${opts.locationType.join(", ")}`,
    );
  }
  if (opts.locationText.trim()) {
    lines.push(`${a.location}: ${opts.locationText.trim()}`);
  }
  if (opts.selectedDays.length > 0) {
    const labelByDay = new Map<string, string>(
      DAY_KEYS.map((k, i) => [k, opts.dayLabels[i] ?? k]),
    );
    const dayPart = opts.selectedDays
      .map((d) => labelByDay.get(d) ?? d)
      .join(", ");
    lines.push(`${a.availableDays}: ${dayPart}`);
  }
  if (opts.startTime || opts.endTime) {
    lines.push(
      `${a.availableFrom}–${a.availableUntil}: ${opts.startTime || "—"} – ${opts.endTime || "—"}`,
    );
  }
  if (opts.tags.length > 0) {
    lines.push(`${a.tags}: ${opts.tags.join(", ")}`);
  }
  const trimmed = base.trim();
  if (lines.length === 0) return trimmed;
  return `${trimmed}\n\n———\n${lines.join("\n")}`;
}

export function AddSkillPage({ onNavigate }: AddSkillPageProps) {
  const { t } = useLanguage();
  const a = t.addSkill;
  const catLabels = t.browse.categoryLabels;
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [locationType, setLocationType] = useState<string[]>([]);
  const [locationText, setLocationText] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
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
    setLocationType((prev) =>
      prev.includes(type) ? prev.filter((ty) => ty !== type) : [...prev, type],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(a.errorNoAuth);
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError(a.validationCore);
      return;
    }
    if (!category) {
      setError(a.validationCategory);
      return;
    }
    const resolvedCategory =
      category === CATEGORY_OTHER ? customCategory.trim() : category;
    if (category === CATEGORY_OTHER) {
      if (!resolvedCategory) {
        setError(a.validationCategoryCustom);
        return;
      }
      if (resolvedCategory.length > 120) {
        setError(a.validationCategoryCustomLen);
        return;
      }
    }
    if (!level) {
      setError(a.validationLevel);
      return;
    }
    const dm = parseInt(durationMinutes, 10);
    if (!durationMinutes || Number.isNaN(dm) || dm < 30) {
      setError(a.validationDuration);
      return;
    }

    const fullDescription = buildDescription(description, a, {
      locationType,
      locationText,
      selectedDays,
      dayLabels: [...a.days],
      startTime,
      endTime,
      tags,
    });

    if (fullDescription.length > 8000) {
      setError(a.validationDescriptionMax);
      return;
    }

    setLoading(true);
    try {
      await createSkill(token, {
        title: title.trim(),
        description: fullDescription,
        durationMinutes: dm,
        category: resolvedCategory,
        level,
      });
      onNavigate?.("profile");
    } catch (err) {
      setError(apiErrorDisplayMessage(err, a.errorPublish));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl text-foreground">{a.title}</h1>
            <p className="text-muted-foreground">{a.subtitle}</p>
          </div>

          <Card className="rounded-2xl border-0 p-8 shadow-lg">
            {error ? (
              <p
                className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="title">{a.skillTitle}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  placeholder={a.skillTitlePh}
                  className="mt-2"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="category">{a.category}</Label>
                <Select
                  value={category || undefined}
                  onValueChange={(v) => {
                    setCategory(v);
                    if (v !== CATEGORY_OTHER) setCustomCategory("");
                  }}
                >
                  <SelectTrigger id="category" className="mt-2">
                    <SelectValue placeholder={a.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_KEYS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {catLabels[cat] ?? cat}
                      </SelectItem>
                    ))}
                    <SelectItem value={CATEGORY_OTHER}>
                      {a.categoryOther}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {category === CATEGORY_OTHER ? (
                  <div className="mt-3">
                    <Label htmlFor="custom-category">{a.categoryCustom}</Label>
                    <Input
                      id="custom-category"
                      value={customCategory}
                      onChange={(ev) => setCustomCategory(ev.target.value)}
                      placeholder={a.categoryCustomPh}
                      className="mt-2"
                      maxLength={120}
                      autoComplete="off"
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="description">{a.description}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(ev) => setDescription(ev.target.value)}
                  placeholder={a.descriptionPh}
                  className="mt-2 min-h-32"
                />
              </div>

              <div>
                <Label htmlFor="level">{a.level}</Label>
                <Select value={level || undefined} onValueChange={setLevel}>
                  <SelectTrigger id="level" className="mt-2">
                    <SelectValue placeholder={a.selectLevel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{a.levelBeginner}</SelectItem>
                    <SelectItem value="intermediate">
                      {a.levelIntermediate}
                    </SelectItem>
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
                    <label htmlFor="online" className="text-sm cursor-pointer">
                      {a.online}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="in-person"
                      checked={locationType.includes("in-person")}
                      onCheckedChange={() => toggleLocationType("in-person")}
                    />
                    <label
                      htmlFor="in-person"
                      className="text-sm cursor-pointer"
                    >
                      {a.inPerson}
                    </label>
                  </div>
                </div>
              </div>

              {locationType.includes("in-person") && (
                <div>
                  <Label htmlFor="location">{a.location}</Label>
                  <Input
                    id="location"
                    value={locationText}
                    onChange={(ev) => setLocationText(ev.target.value)}
                    placeholder={a.locationPh}
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="duration">{a.durationMin}</Label>
                <Select
                  value={durationMinutes || undefined}
                  onValueChange={setDurationMinutes}
                >
                  <SelectTrigger id="duration" className="mt-2">
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
                    value={startTime}
                    onChange={(ev) => setStartTime(ev.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">{a.availableUntil}</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(ev) => setEndTime(ev.target.value)}
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder={a.tagsPh}
                  />
                  <Button type="button" onClick={addTag}>
                    {a.add}
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag) => (
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
                  disabled={loading}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  disabled={loading}
                >
                  {loading ? t.common.loading : a.publish}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
