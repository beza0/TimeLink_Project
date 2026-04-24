package com.timebank.timebank.exchange;

import com.timebank.timebank.skill.Skill;
import com.timebank.timebank.user.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exchange_requests")
public class ExchangeRequest {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExchangeRequestStatus status;

    @Column(nullable = false, length = 1000)
    private String message;

    /** Talep oluşturulurken seçilen süre (dakika). Tamamlanınca bu süre kadar bakiyeden düşülür (1 saat = 60 dk). */
    @Column(name = "booked_minutes", nullable = false)
    private int bookedMinutes;

    /** Kullanıcının seçtiği oturum başlangıç zamanı (UTC). */
    @Column(name = "scheduled_start_at")
    private Instant scheduledStartAt;

    /** Oturumdan ~1 saat önce hatırlatıcı bildirimi gönderildi mi */
    @Column(name = "reminder_sent", nullable = false)
    private boolean reminderSent;

    /** Bekleyen isteğin son teklifini eğitmen tarafı mı başlattı? */
    @Column(name = "pending_from_owner", nullable = false)
    private boolean pendingFromOwner;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /** Eğitmen/organizatör: Zoom, Meet vb. (kabulden sonra) */
    @Column(name = "session_meeting_url", length = 2000)
    private String sessionMeetingUrl;

    /** İsteğe bağlı: öğrenci (talep sahibi) oturuma katıldığını işaretledi */
    @Column(name = "requester_attendance_ack_at")
    private Instant requesterAttendanceAckAt;

    /** İsteğe bağlı: eğitmen (beceri sahibi) oturumun başladığını işaretledi */
    @Column(name = "owner_attendance_ack_at")
    private Instant ownerAttendanceAckAt;

    /** Talep oluşturulurken öğrenciden düşülen ve askıda tutulan kredi */
    @Column(name = "requester_credit_held", nullable = false)
    private boolean requesterCreditHeld;

    /** Oturum başlangıcında "başladı mı?" bildirimi gönderildi mi */
    @Column(name = "started_prompt_sent", nullable = false)
    private boolean startedPromptSent;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = ExchangeRequestStatus.PENDING;
        }
    }

    public UUID getId() {
        return id;
    }

    public Skill getSkill() {
        return skill;
    }

    public User getRequester() {
        return requester;
    }

    public ExchangeRequestStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setSkill(Skill skill) {
        this.skill = skill;
    }

    public void setRequester(User requester) {
        this.requester = requester;
    }

    public void setStatus(ExchangeRequestStatus status) {
        this.status = status;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getBookedMinutes() {
        return bookedMinutes;
    }

    public void setBookedMinutes(int bookedMinutes) {
        this.bookedMinutes = bookedMinutes;
    }

    public Instant getScheduledStartAt() {
        return scheduledStartAt;
    }

    public void setScheduledStartAt(Instant scheduledStartAt) {
        this.scheduledStartAt = scheduledStartAt;
    }

    public boolean isReminderSent() {
        return reminderSent;
    }

    public void setReminderSent(boolean reminderSent) {
        this.reminderSent = reminderSent;
    }

    public boolean isPendingFromOwner() {
        return pendingFromOwner;
    }

    public void setPendingFromOwner(boolean pendingFromOwner) {
        this.pendingFromOwner = pendingFromOwner;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getSessionMeetingUrl() {
        return sessionMeetingUrl;
    }

    public void setSessionMeetingUrl(String sessionMeetingUrl) {
        this.sessionMeetingUrl = sessionMeetingUrl;
    }

    public Instant getRequesterAttendanceAckAt() {
        return requesterAttendanceAckAt;
    }

    public void setRequesterAttendanceAckAt(Instant requesterAttendanceAckAt) {
        this.requesterAttendanceAckAt = requesterAttendanceAckAt;
    }

    public Instant getOwnerAttendanceAckAt() {
        return ownerAttendanceAckAt;
    }

    public void setOwnerAttendanceAckAt(Instant ownerAttendanceAckAt) {
        this.ownerAttendanceAckAt = ownerAttendanceAckAt;
    }

    public boolean isRequesterCreditHeld() {
        return requesterCreditHeld;
    }

    public void setRequesterCreditHeld(boolean requesterCreditHeld) {
        this.requesterCreditHeld = requesterCreditHeld;
    }

    public boolean isStartedPromptSent() {
        return startedPromptSent;
    }

    public void setStartedPromptSent(boolean startedPromptSent) {
        this.startedPromptSent = startedPromptSent;
    }
}