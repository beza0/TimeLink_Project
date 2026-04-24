package com.timebank.timebank.skill;

import com.timebank.timebank.skill.dto.CreateSkillRequest;
import com.timebank.timebank.skill.dto.SkillResponse;
import com.timebank.timebank.skill.dto.UpdateSkillRequest;
import com.timebank.timebank.user.User;
import com.timebank.timebank.user.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class SkillService {
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
    private static final int DEFAULT_BOOK_MINUTES = 60;
    private static final Pattern META_LINE = Pattern.compile("(?m)^\\s*([^:]+):\\s*(.+?)\\s*$");

    private final SkillRepository skillRepository;
    private final UserRepository userRepository;

    public SkillService(SkillRepository skillRepository, UserRepository userRepository) {
        this.skillRepository = skillRepository;
        this.userRepository = userRepository;
    }

    public SkillResponse createSkill(CreateSkillRequest req, String userEmail) {
        User owner = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));

        Skill skill = new Skill();
        skill.setTitle(req.getTitle().trim());
        skill.setDescription(req.getDescription() == null ? "" : req.getDescription().trim());
        Integer requestedDuration = req.getDurationMinutes();
        skill.setDurationMinutes(
                (requestedDuration == null || requestedDuration < 30) ? DEFAULT_BOOK_MINUTES : requestedDuration
        );
        skill.setCategory(blankToNull(req.getCategory()));
        String level = blankToNull(req.getLevel());
        skill.setLevel(level != null ? level : "intermediate");
        skill.setSessionTypes(normalizeSessionTypes(req.getSessionTypes()));
        skill.setInPersonLocation(blankToNull(req.getInPersonLocation()));
        skill.setAvailableDays(normalizeAvailableDays(req.getAvailableDays()));
        skill.setAvailableFrom(normalizeTime(req.getAvailableFrom()));
        skill.setAvailableUntil(normalizeTime(req.getAvailableUntil()));
        validateAvailabilityRules(skill);
        skill.setOwner(owner);
        skill.setCoverImageUrl(
                SkillCoverImageUrlBuilder.fromSkillContent(
                        skill.getTitle(),
                        skill.getDescription(),
                        skill.getCategory(),
                        owner.getId()
                )
        );

        Skill saved = skillRepository.save(skill);

        return mapToResponse(saved);
    }

    public List<SkillResponse> getAllSkills() {
        return skillRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public SkillResponse getSkillById(UUID skillId) {
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException("Skill bulunamadı"));

        return mapToResponse(skill);
    }

    public List<SkillResponse> getMySkills(String userEmail) {
        return skillRepository.findByOwnerEmailIgnoreCase(userEmail)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public SkillResponse updateSkill(UUID skillId, UpdateSkillRequest req, String userEmail) {
        Skill skill = skillRepository.findByIdAndOwnerEmail(skillId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Skill bulunamadı veya bu skill size ait değil"));

        skill.setTitle(req.getTitle().trim());
        skill.setDescription(req.getDescription() == null ? "" : req.getDescription().trim());
        skill.setDurationMinutes(req.getDurationMinutes());
        if (req.getCategory() != null) {
            skill.setCategory(blankToNull(req.getCategory()));
        }
        String level = blankToNull(req.getLevel());
        if (level != null) {
            skill.setLevel(level);
        }
        skill.setCoverImageUrl(
                SkillCoverImageUrlBuilder.fromSkillContent(
                        skill.getTitle(),
                        skill.getDescription(),
                        skill.getCategory(),
                        skill.getId()
                )
        );
        Skill updated = skillRepository.save(skill);
        return mapToResponse(updated);
    }

    public void deleteSkill(UUID skillId, String userEmail) {
        Skill skill = skillRepository.findByIdAndOwnerEmail(skillId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Skill bulunamadı veya bu skill size ait değil"));

        skillRepository.delete(skill);
    }

    private SkillResponse mapToResponse(Skill skill) {
        AvailabilityFallback fallback = parseFallback(skill.getDescription());
        List<String> sessionTypes = splitCsv(skill.getSessionTypes());
        if (sessionTypes.isEmpty()) sessionTypes = fallback.sessionTypes;
        List<String> availableDays = splitCsv(skill.getAvailableDays());
        if (availableDays.isEmpty()) availableDays = fallback.availableDays;
        String inPersonLocation = blankToNull(skill.getInPersonLocation());
        if (inPersonLocation == null) inPersonLocation = fallback.inPersonLocation;
        String availableFrom = blankToNull(skill.getAvailableFrom());
        if (availableFrom == null) availableFrom = fallback.availableFrom;
        String availableUntil = blankToNull(skill.getAvailableUntil());
        if (availableUntil == null) availableUntil = fallback.availableUntil;
        return new SkillResponse(
                skill.getId(),
                skill.getTitle(),
                skill.getDescription(),
                skill.getDurationMinutes(),
                skill.getCategory(),
                skill.getLevel(),
                sessionTypes,
                inPersonLocation,
                availableDays,
                availableFrom,
                availableUntil,
                skill.getOwner().getId(),
                skill.getOwner().getFullName(),
                skill.getCreatedAt(),
                skill.getCoverImageUrl()
        );
    }

    private static AvailabilityFallback parseFallback(String description) {
        if (description == null || description.isBlank()) {
            return AvailabilityFallback.empty();
        }
        List<String> sessionTypes = List.of();
        List<String> availableDays = List.of();
        String inPersonLocation = null;
        String availableFrom = null;
        String availableUntil = null;
        Matcher matcher = META_LINE.matcher(description);
        while (matcher.find()) {
            String key = matcher.group(1).trim().toLowerCase(Locale.ROOT);
            String value = matcher.group(2).trim();
            if (key.contains("session type") || key.contains("oturum türü")) {
                String v = value.toLowerCase(Locale.ROOT);
                boolean online = v.contains("online") || v.contains("çevrim");
                boolean inPerson = v.contains("in-person") || v.contains("yüz");
                if (online && inPerson) sessionTypes = List.of("online", "in-person");
                else if (online) sessionTypes = List.of("online");
                else if (inPerson) sessionTypes = List.of("in-person");
            } else if (key.equals("location") || key.equals("konum")) {
                inPersonLocation = blankToNull(value);
            } else if (key.contains("available days") || key.contains("müsait günler")) {
                availableDays = Arrays.stream(value.split(","))
                        .map(String::trim)
                        .map(SkillService::normalizeDayName)
                        .filter(s -> s != null && !s.isBlank())
                        .toList();
            } else if (key.contains("available from") || key.contains("başlangıç")) {
                String[] parts = value.split("[–-]");
                if (parts.length >= 2) {
                    availableFrom = normalizeTimeSafe(parts[0].trim());
                    availableUntil = normalizeTimeSafe(parts[1].trim());
                }
            }
        }
        return new AvailabilityFallback(
                sessionTypes,
                inPersonLocation,
                availableDays,
                availableFrom,
                availableUntil
        );
    }

    private static String normalizeDayName(String raw) {
        String t = raw.trim().toUpperCase(Locale.ROOT);
        return switch (t) {
            case "MONDAY", "PAZARTESI", "PAZARTESİ" -> "MONDAY";
            case "TUESDAY", "SALI" -> "TUESDAY";
            case "WEDNESDAY", "ÇARŞAMBA", "CARSAMBA" -> "WEDNESDAY";
            case "THURSDAY", "PERŞEMBE", "PERSEMBE" -> "THURSDAY";
            case "FRIDAY", "CUMA" -> "FRIDAY";
            case "SATURDAY", "CUMARTESI", "CUMARTESİ" -> "SATURDAY";
            case "SUNDAY", "PAZAR" -> "SUNDAY";
            default -> null;
        };
    }

    private static String normalizeTimeSafe(String v) {
        try {
            return normalizeTime(v);
        } catch (Exception e) {
            return null;
        }
    }

    private record AvailabilityFallback(
            List<String> sessionTypes,
            String inPersonLocation,
            List<String> availableDays,
            String availableFrom,
            String availableUntil
    ) {
        static AvailabilityFallback empty() {
            return new AvailabilityFallback(List.of(), null, List.of(), null, null);
        }
    }

    private static String normalizeSessionTypes(List<String> sessionTypes) {
        if (sessionTypes == null || sessionTypes.isEmpty()) {
            return null;
        }
        List<String> normalized = sessionTypes.stream()
                .map(s -> s == null ? "" : s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> s.equals("online") || s.equals("in-person"))
                .distinct()
                .toList();
        return normalized.isEmpty() ? null : String.join(",", normalized);
    }

    private static String normalizeAvailableDays(List<String> availableDays) {
        if (availableDays == null || availableDays.isEmpty()) {
            return null;
        }
        List<String> normalized = availableDays.stream()
                .map(s -> s == null ? "" : s.trim().toUpperCase(Locale.ROOT))
                .filter(s -> {
                    try {
                        DayOfWeek.valueOf(s);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .distinct()
                .toList();
        return normalized.isEmpty() ? null : String.join(",", normalized);
    }

    private static String normalizeTime(String v) {
        String t = blankToNull(v);
        if (t == null) return null;
        return LocalTime.parse(t, HH_MM).format(HH_MM);
    }

    private static List<String> splitCsv(String v) {
        if (v == null || v.isBlank()) return List.of();
        return Arrays.stream(v.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private static void validateAvailabilityRules(Skill skill) {
        List<String> sessionTypes = splitCsv(skill.getSessionTypes());
        if (sessionTypes.isEmpty()) {
            throw new IllegalArgumentException("En az bir oturum türü seçilmelidir");
        }
        if (sessionTypes.contains("in-person") && blankToNull(skill.getInPersonLocation()) == null) {
            throw new IllegalArgumentException("Yüz yüze oturum için konum zorunludur");
        }
        List<String> days = splitCsv(skill.getAvailableDays());
        if (days.isEmpty()) {
            throw new IllegalArgumentException("En az bir uygun gün seçilmelidir");
        }
        if (blankToNull(skill.getAvailableFrom()) == null || blankToNull(skill.getAvailableUntil()) == null) {
            throw new IllegalArgumentException("Uygun saat aralığı zorunludur");
        }
        LocalTime from = LocalTime.parse(skill.getAvailableFrom(), HH_MM);
        LocalTime until = LocalTime.parse(skill.getAvailableUntil(), HH_MM);
        if (!from.isBefore(until)) {
            throw new IllegalArgumentException("Uygun başlangıç saati, bitiş saatinden önce olmalıdır");
        }
    }

    private static String blankToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}