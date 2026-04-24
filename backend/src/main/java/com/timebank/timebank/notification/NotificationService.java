package com.timebank.timebank.notification;

import com.timebank.timebank.exchange.ExchangeRequest;
import com.timebank.timebank.notification.dto.NotificationResponse;
import com.timebank.timebank.user.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Europe/Istanbul");
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("d MMM yyyy HH:mm").withZone(DISPLAY_ZONE);

    private final UserNotificationRepository userNotificationRepository;
    private final JdbcTemplate jdbcTemplate;

    public NotificationService(
            UserNotificationRepository userNotificationRepository, JdbcTemplate jdbcTemplate) {
        this.userNotificationRepository = userNotificationRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void notifyRequestAccepted(ExchangeRequest ex) {
        User requester = ex.getRequester();
        String when = formatWhen(ex.getScheduledStartAt());
        String title = "Talep kabul edildi";
        String body = String.format(
                "\"%s\" için %s başlangıçlı oturum talebiniz kabul edildi.",
                ex.getSkill().getTitle(),
                when
        );
        userNotificationRepository.save(new UserNotification(requester, title, body, ex));
    }

    @Transactional
    public void notifyCounterOffer(ExchangeRequest ex) {
        User requester = ex.getRequester();
        String when = formatWhen(ex.getScheduledStartAt());
        String title = "Yeni tarih önerisi";
        String body = String.format(
                "\"%s\" için %s başlangıçlı yeni bir zaman önerildi.",
                ex.getSkill().getTitle(),
                when
        );
        userNotificationRepository.save(new UserNotification(requester, title, body, ex));
    }

    @Transactional
    public void notifyNewBookingRequest(ExchangeRequest ex) {
        User owner = ex.getSkill().getOwner();
        User requester = ex.getRequester();
        String when = formatWhen(ex.getScheduledStartAt());
        String title = "Yeni rezervasyon talebi";
        String body = String.format(
                "%s — \"%s\" için %s başlangıçlı oturum talep etti.",
                requester.getFullName(),
                ex.getSkill().getTitle(),
                when
        );
        UserNotification n = new UserNotification(owner, title, body, ex);
        userNotificationRepository.save(n);
    }

    /**
     * İptal anında taraftan sadece karşı tarafa gider. actorEmail iptal butonuna basan kullanıcının e-postasıdır.
     */
    @Transactional
    public void notifyExchangeCancelled(ExchangeRequest ex, String actorEmail) {
        if (ex.getRequester() == null || ex.getSkill() == null || ex.getSkill().getOwner() == null) {
            return;
        }
        String e = actorEmail == null ? "" : actorEmail.trim();
        if (e.isEmpty()) {
            return;
        }
        User requester = ex.getRequester();
        User owner = ex.getSkill().getOwner();
        String actorName;
        User notifyUser;
        if (requester.getEmail().equalsIgnoreCase(e)) {
            actorName = requester.getFullName();
            notifyUser = owner;
        } else if (owner.getEmail().equalsIgnoreCase(e)) {
            actorName = owner.getFullName();
            notifyUser = requester;
        } else {
            return;
        }
        String when = formatWhen(ex.getScheduledStartAt());
        String title = "Rezervasyon iptal edildi";
        String body = String.format(
                "%s, \"%s\" (%s) için bu rezervasyonu iptal etti.",
                actorName,
                ex.getSkill().getTitle(),
                when
        );
        userNotificationRepository.save(new UserNotification(notifyUser, title, body, ex));
    }

    @Transactional
    public void sendSessionReminder(ExchangeRequest ex) {
        User owner = ex.getSkill().getOwner();
        User requester = ex.getRequester();
        String when = formatWhen(ex.getScheduledStartAt());
        String title = "Oturum yaklaşıyor";
        String body = String.format(
                "\"%s\" oturumunuz yaklaşık 1 saat sonra (%s).",
                ex.getSkill().getTitle(),
                when
        );
        userNotificationRepository.save(new UserNotification(owner, title, body, ex));
        userNotificationRepository.save(new UserNotification(requester, title, body, ex));
    }

    @Transactional
    public void sendSessionStartPrompt(ExchangeRequest ex) {
        User owner = ex.getSkill().getOwner();
        User requester = ex.getRequester();
        String when = formatWhen(ex.getScheduledStartAt());
        String title = "Oturum başladı mı?";
        String body = String.format(
                "\"%s\" oturumu için başlangıç zamanı geldi (%s). Lütfen sohbette \"başladı\" onayı verin.",
                ex.getSkill().getTitle(),
                when
        );
        userNotificationRepository.save(new UserNotification(owner, title, body, ex));
        userNotificationRepository.save(new UserNotification(requester, title, body, ex));
    }

    private static String formatWhen(Instant scheduledStartAt) {
        if (scheduledStartAt == null) {
            return "(tarih seçilmedi)";
        }
        return FMT.format(scheduledStartAt);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listForUser(String email) {
        String e = normalizeEmail(email);
        if (e.isEmpty()) {
            return List.of();
        }
        return userNotificationRepository.findByUserEmailOrderByCreatedAtDesc(e).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnread(String email) {
        String e = normalizeEmail(email);
        if (e.isEmpty()) {
            return 0;
        }
        return userNotificationRepository.countUnreadByUserEmail(e);
    }

    @Transactional
    public void markRead(String email, UUID notificationId) {
        String e = normalizeEmail(email);
        UserNotification n = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Bildirim bulunamadı"));
        if (!n.getUser().getEmail().equalsIgnoreCase(e)) {
            throw new IllegalArgumentException("Bu bildirime erişim yok");
        }
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            userNotificationRepository.save(n);
        }
    }

    @Transactional
    public void markUnread(String email, UUID notificationId) {
        String e = normalizeEmail(email);
        UserNotification n = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Bildirim bulunamadı"));
        if (!n.getUser().getEmail().equalsIgnoreCase(e)) {
            throw new IllegalArgumentException("Bu bildirime erişim yok");
        }
        n.setReadAt(null);
        userNotificationRepository.save(n);
    }

    @Transactional
    public void deleteSelected(String email, List<UUID> notificationIds) {
        String e = normalizeEmail(email);
        if (e.isEmpty() || notificationIds == null || notificationIds.isEmpty()) {
            return;
        }
        List<UserNotification> toDelete = userNotificationRepository.findAllById(notificationIds);
        if (toDelete.isEmpty()) {
            return;
        }
        for (UserNotification n : toDelete) {
            if (n.getUser() == null || !n.getUser().getEmail().equalsIgnoreCase(e)) {
                throw new IllegalArgumentException("Bu bildirime erişim yok");
            }
        }
        userNotificationRepository.deleteAllInBatch(toDelete);
    }

    /**
     * Direct SQL so the DB always updates; JPA dirty-checking alone was unreliable here.
     * Falls back to per-entity save if zero rows matched (e.g. schema drift).
     */
    @Transactional
    public void markAllRead(String email) {
        String e = normalizeEmail(email);
        if (e.isEmpty()) {
            return;
        }
        Timestamp ts = Timestamp.from(Instant.now());
        int updated =
                jdbcTemplate.update(
                        "UPDATE user_notifications AS un SET read_at = ? FROM users AS u "
                                + "WHERE un.user_id = u.id AND lower(trim(u.email)) = lower(trim(?)) AND un.read_at IS NULL",
                        ts,
                        e);
        if (updated == 0) {
            Instant now = Instant.now();
            for (UserNotification n : userNotificationRepository.findByUserEmailOrderByCreatedAtDesc(e)) {
                if (n.getReadAt() == null) {
                    n.setReadAt(now);
                    userNotificationRepository.save(n);
                }
            }
        }
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim();
    }

    private NotificationResponse toResponse(UserNotification n) {
        UUID exId = n.getExchangeRequest() != null ? n.getExchangeRequest().getId() : null;
        String skillTitle = n.getExchangeRequest() != null && n.getExchangeRequest().getSkill() != null
                ? n.getExchangeRequest().getSkill().getTitle()
                : null;
        return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getBody(),
                n.getCreatedAt(),
                n.getReadAt(),
                exId,
                skillTitle
        );
    }
}
