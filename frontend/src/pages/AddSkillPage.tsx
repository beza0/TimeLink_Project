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
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { createSkill, fetchSkillById, updateSkill } from "../api/skills";
import { ApiError } from "../api/client";
import { apiErrorDisplayMessage } from "../api/client";
import { SearchableCombobox } from "../components/common/SearchableCombobox";
import { locationOptions } from "../data/profilePicklists";
import {
  SKILL_CATEGORY_KEYS,
  SKILL_CATEGORY_OTHER,
  SKILL_DAY_KEYS,
  buildSkillDescription,
  skillDtoToFormValues,
} from "../lib/skillForm";

interface AddSkillPageProps {
  onNavigate?: (page: PageType) => void;
}

export function AddSkillPage({ onNavigate }: AddSkillPageProps) {
  const { skillId } = useParams<{ skillId?: string }>();
  const isEdit = Boolean(skillId);
  const { t } = useLanguage();
  const a = t.addSkill;
  const catLabels = t.browse.categoryLabels;
  const { token } = useAuth();
  const turkeyLocationOptions = locationOptions().filter((o) =>
    o.value.endsWith(", Turkey"),
  );

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [locationType, setLocationType] = useState<string[]>([]);
  const [locationText, setLocationText] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSkill, setLoadingSkill] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !skillId || !token) {
      setLoadingSkill(false);
      return;
    }
    let cancelled = false;
    setLoadingSkill(true);
    setError(null);
    void (async () => {
      try {
        const skill = await fetchSkillById(skillId);
        if (cancelled) return;
        const values = skillDtoToFormValues(skill, a);
        setTitle(values.title);
        setCategory(values.category);
        setCustomCategory(values.customCategory);
        setDescription(values.description);
        setLevel(values.level);
        setSelectedDays(values.selectedDays);
        setTags(values.tags);
        setLocationType(values.locationType);
        setLocationText(values.locationText);
        setStartTime(values.startTime);
        setEndTime(values.endTime);
        setDurationMinutes(skill.durationMinutes > 0 ? skill.durationMinutes : 60);
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorDisplayMessage(err, a.errorLoad));
        }
      } finally {
        if (!cancelled) setLoadingSkill(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- form labels only affect legacy meta parse
  }, [isEdit, skillId, token]);

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
    if (!title.trim()) {
      setError(a.validationCore);
      return;
    }
    if (!category) {
      setError(a.validationCategory);
      return;
    }
    const resolvedCategory =
      category === SKILL_CATEGORY_OTHER ? customCategory.trim() : category;
    if (category === SKILL_CATEGORY_OTHER) {
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
    if (locationType.length === 0) {
      setError(a.validationSessionType);
      return;
    }
    if (locationType.includes("in-person") && !locationText.trim()) {
      setError(a.validationInPersonLocation);
      return;
    }
    if (selectedDays.length === 0) {
      setError(a.validationDays);
      return;
    }
    if (!startTime || !endTime) {
      setError(a.validationTimeRange);
      return;
    }
    if (startTime >= endTime) {
      setError(a.validationTimeOrder);
      return;
    }

    const fullDescription = buildSkillDescription(description, a, {
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

    const payload = {
      title: title.trim(),
      description: fullDescription,
      durationMinutes,
      category: resolvedCategory,
      level,
      sessionTypes: locationType,
      inPersonLocation: locationType.includes("in-person")
        ? locationText.trim()
        : null,
      availableDays: selectedDays.map((d) => d.toUpperCase()),
      availableFrom: startTime,
      availableUntil: endTime,
    };

    setLoading(true);
    try {
      if (isEdit && skillId) {
        await updateSkill(token, skillId, payload);
      } else {
        await createSkill(token, payload);
      }
      onNavigate?.("profile");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError(a.errorNoAuth);
        return;
      }
      setError(
        apiErrorDisplayMessage(err, isEdit ? a.errorSave : a.errorPublish),
      );
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isEdit ? a.editTitle : a.title;
  const pageSubtitle = isEdit ? a.editSubtitle : a.subtitle;
  const submitLabel = isEdit ? a.saveChanges : a.publish;
  const cancelTarget: PageType = isEdit ? "profile" : "dashboard";

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageSubtitle}</p>
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
            {loadingSkill ? (
              <p className="text-center text-muted-foreground py-12">
                {t.common.loading}
              </p>
            ) : (
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
                      if (v !== SKILL_CATEGORY_OTHER) setCustomCategory("");
                    }}
                  >
                    <SelectTrigger id="category" className="mt-2">
                      <SelectValue placeholder={a.selectCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORY_KEYS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {catLabels[cat] ?? cat}
                        </SelectItem>
                      ))}
                      <SelectItem value={SKILL_CATEGORY_OTHER}>
                        {a.categoryOther}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {category === SKILL_CATEGORY_OTHER ? (
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
                    <SearchableCombobox
                      className="mt-2"
                      value={locationText}
                      onChange={setLocationText}
                      options={turkeyLocationOptions}
                      placeholder={a.locationPh}
                      searchPlaceholder={a.locationPh}
                      emptyText={a.locationEmpty}
                    />
                  </div>
                )}

                <div>
                  <Label>{a.availableDays}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {SKILL_DAY_KEYS.map((dayKey, i) => (
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
                    onClick={() => onNavigate?.(cancelTarget)}
                    disabled={loading}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    disabled={loading || loadingSkill}
                  >
                    {loading ? t.common.loading : submitLabel}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}