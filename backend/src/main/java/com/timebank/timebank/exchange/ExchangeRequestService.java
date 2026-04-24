package com.timebank.timebank.exchange;

import com.timebank.timebank.exchange.dto.CreateExchangeMessageRequest;
import com.timebank.timebank.exchange.dto.CreateExchangeRequestRequest;
import com.timebank.timebank.exchange.dto.ExchangeMessageResponse;
import com.timebank.timebank.exchange.dto.ExchangeRequestResponse;
import com.timebank.timebank.exchange.dto.UpdateSessionMeetingRequest;
import com.timebank.timebank.skill.Skill;
import com.timebank.timebank.skill.SkillRepository;
import com.timebank.timebank.transaction.TimeTransaction;
import com.timebank.timebank.transaction.TimeTransactionRepository;
import com.timebank.timebank.transaction.TransactionType;
import com.timebank.timebank.notification.NotificationService;
import com.timebank.timebank.user.User;
import com.timebank.timebank.user.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ExchangeRequestService {
    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Europe/Istanbul");

    private final ExchangeRequestRepository exchangeRequestRepository;
    private final ExchangeMessageRepository exchangeMessageRepository;
    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final TimeTransactionRepository timeTransactionRepository;
    private final NotificationService notificationService;

    public ExchangeRequestService(
            ExchangeRequestRepository exchangeRequestRepository,
            ExchangeMessageRepository exchangeMessageRepository,
            SkillRepository skillRepository,
            UserRepository userRepository,
            TimeTransactionRepository timeTransactionRepository,
            NotificationService notificationService
    ) {
        this.exchangeRequestRepository = exchangeRequestRepository;
        this.exchangeMessageRepository = exchangeMessageRepository;
        this.skillRepository = skillRepository;
        this.userRepository = userRepository;
        this.timeTransactionRepository = timeTransactionRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public ExchangeRequestResponse createRequest(UUID skillId, CreateExchangeRequestRequest req, String requesterEmail) {
        User requester = userRepository.findByEmailIgnoreCase(requesterEmail)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException("Skill bulunamadı"));

        if (skill.getOwner().getEmail().equalsIgnoreCase(requesterEmail)) {
            throw new IllegalArgumentException("Kendi skill'inize talep gönderemezsiniz");
        }

        int booked = req.getBookedMinutes();
        if (booked < 30) {
            throw new IllegalArgumentException("Rezervasyon süresi en az 30 dakika olmalıdır");
        }
        if (requester.getTimeCreditMinutes() < booked) {
            throw new IllegalArgumentException("Saat bakiyeniz bu süre için yetersiz");
        }

        Instant scheduled = req.getScheduledStartAt();
        Instant minStart = Instant.now().plus(1, ChronoUnit.HOURS);
        if (scheduled.isBefore(minStart)) {
            throw new IllegalArgumentException("Oturum başlangıcı en az 1 saat sonrası için seçilmelidir");
        }
        validateScheduleAgainstSkillAvailability(skill, scheduled);
        assertNoAcceptScheduleConflict(
                requester,
                skill.getOwner(),
                scheduled,
                booked,
                null
        );

        ExchangeRequest exchangeRequest = new ExchangeRequest();
        exchangeRequest.setSkill(skill);
        exchangeRequest.setRequester(requester);
        exchangeRequest.setMessage(req.getMessage().trim());
        exchangeRequest.setBookedMinutes(booked);
        exchangeRequest.setScheduledStartAt(scheduled);
        exchangeRequest.setReminderSent(false);
        exchangeRequest.setStartedPromptSent(false);
        exchangeRequest.setPendingFromOwner(false);
        exchangeRequest.setRequesterCreditHeld(true);
        exchangeRequest.setStatus(ExchangeRequestStatus.PENDING);

        // Rezervasyon anında kredi askıya alınır: kullanıcı bu krediyi ikinci kez harcayamaz.
        requester.setTimeCreditMinutes(requester.getTimeCreditMinutes() - booked);

        ExchangeRequest saved = exchangeRequestRepository.save(exchangeRequest);
        userRepository.save(requester);
        notificationService.notifyNewBookingRequest(saved);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ExchangeRequestResponse> getMySentRequests(String userEmail) {
        return exchangeRequestRepository.findByRequesterEmailOrderByCreatedAtDesc(userEmail)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExchangeRequestResponse> getMyReceivedRequests(String userEmail) {
        return exchangeRequestRepository.findBySkillOwnerEmailOrderByCreatedAtDesc(userEmail)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public ExchangeRequestResponse acceptRequest(UUID requestId, String ownerEmail) {
        ExchangeRequest exchangeRequest = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));

        if (!exchangeRequest.getSkill().getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new IllegalArgumentException("Bu talebi kabul etme yetkiniz yok");
        }

        if (exchangeRequest.getStatus() != ExchangeRequestStatus.PENDING) {
            throw new IllegalArgumentException("Sadece bekleyen talepler kabul edilebilir");
        }

        assertNoAcceptScheduleConflict(
                exchangeRequest.getRequester(),
                exchangeRequest.getSkill().getOwner(),
                exchangeRequest.getScheduledStartAt(),
                exchangeRequest.getBookedMinutes(),
                exchangeRequest.getId()
        );
        exchangeRequest.setStatus(ExchangeRequestStatus.ACCEPTED);
        ExchangeRequest updated = exchangeRequestRepository.save(exchangeRequest);
        notificationService.notifyRequestAccepted(updated);

        return mapToResponse(updated);
    }

    @Transactional
    public ExchangeRequestResponse rejectRequest(UUID requestId, String ownerEmail) {
        ExchangeRequest exchangeRequest = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));

        if (!exchangeRequest.getSkill().getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new IllegalArgumentException("Bu talebi reddetme yetkiniz yok");
        }

        if (exchangeRequest.getStatus() != ExchangeRequestStatus.PENDING) {
            throw new IllegalArgumentException("Sadece bekleyen talepler reddedilebilir");
        }

        exchangeRequest.setStatus(ExchangeRequestStatus.REJECTED);
        releaseHeldCreditIfAny(exchangeRequest);
        ExchangeRequest updated = exchangeRequestRepository.save(exchangeRequest);

        return mapToResponse(updated);
    }

    /**
     * PENDING: yalnızca talep sahibi (geri çek). ACCEPTED: dersi veren veya alan, planlanan başlangıç anından önce.
     */
    @Transactional
    public ExchangeRequestResponse cancelRequest(UUID requestId, String userEmail) {
        String email = userEmail == null ? "" : userEmail.trim();
        if (email.isEmpty()) {
            throw new IllegalArgumentException("Kullanıcı e-postası gerekli");
        }
        ExchangeRequest ex = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));

        boolean isRequester = ex.getRequester().getEmail().equalsIgnoreCase(email);
        boolean isOwner = ex.getSkill().getOwner().getEmail().equalsIgnoreCase(email);
        if (!isRequester && !isOwner) {
            throw new IllegalArgumentException("Bu talebi iptal etme yetkiniz yok");
        }

        ExchangeRequestStatus st = ex.getStatus();
        if (st == ExchangeRequestStatus.CANCELLED) {
            return mapToResponse(ex);
        }
        if (st == ExchangeRequestStatus.COMPLETED) {
            throw new IllegalArgumentException("Tamamlanmış oturumlar iptal edilemez");
        }
        if (st == ExchangeRequestStatus.REJECTED) {
            throw new IllegalArgumentException("Bu talep zaten reddedildi");
        }

        if (st == ExchangeRequestStatus.PENDING) {
            if (!isRequester) {
                throw new IllegalArgumentException("Bekleyen talebi yalnızca talep sahibi iptal edebilir (eğitmen red veya yanıt verebilir)");
            }
        } else if (st == ExchangeRequestStatus.ACCEPTED) {
            Instant start = ex.getScheduledStartAt();
            if (start != null && !Instant.now().isBefore(start)) {
                throw new IllegalArgumentException("Oturum başlangıç zamanı geçti; iptal edilemez");
            }
        } else {
            throw new IllegalArgumentException("Bu durumdaki talep iptal edilemez");
        }

        ex.setStatus(ExchangeRequestStatus.CANCELLED);
        releaseHeldCreditIfAny(ex);
        exchangeRequestRepository.save(ex);
        notificationService.notifyExchangeCancelled(ex, userEmail);
        return mapToResponse(ex);
    }

    @Transactional
    public ExchangeRequestResponse counterOfferRequest(
            UUID requestId,
            CreateExchangeRequestRequest req,
            String ownerEmail
    ) {
        ExchangeRequest original = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));

        if (!original.getSkill().getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new IllegalArgumentException("Bu talep için yeni tarih önerme yetkiniz yok");
        }
        if (original.getStatus() != ExchangeRequestStatus.REJECTED) {
            throw new IllegalArgumentException("Yeni tarih önerisi için önce talep reddedilmiş olmalı");
        }

        int booked = req.getBookedMinutes();
        if (booked != original.getBookedMinutes()) {
            throw new IllegalArgumentException("Yeni teklif, mevcut rezervasyon süresiyle aynı olmalı");
        }

        Instant scheduled = req.getScheduledStartAt();
        Instant minStart = Instant.now().plus(1, ChronoUnit.HOURS);
        if (scheduled.isBefore(minStart)) {
            throw new IllegalArgumentException("Oturum başlangıcı en az 1 saat sonrası için seçilmelidir");
        }
        validateScheduleAgainstSkillAvailability(original.getSkill(), scheduled);
        assertNoAcceptScheduleConflict(
                original.getRequester(),
                original.getSkill().getOwner(),
                scheduled,
                original.getBookedMinutes(),
                null
        );

        ExchangeRequest newReq = new ExchangeRequest();
        newReq.setSkill(original.getSkill());
        newReq.setRequester(original.getRequester());
        newReq.setMessage(req.getMessage().trim());
        newReq.setBookedMinutes(original.getBookedMinutes());
        newReq.setScheduledStartAt(scheduled);
        newReq.setReminderSent(false);
        newReq.setStartedPromptSent(false);
        newReq.setPendingFromOwner(true);
        newReq.setRequesterCreditHeld(false);
        newReq.setStatus(ExchangeRequestStatus.PENDING);

        ExchangeRequest saved = exchangeRequestRepository.save(newReq);
        notificationService.notifyCounterOffer(saved);
        return mapToResponse(saved);
    }

    @Transactional
    public ExchangeRequestResponse completeRequest(UUID requestId, String ownerEmail) {
        ExchangeRequest exchangeRequest = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));

        if (!exchangeRequest.getSkill().getOwner().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new IllegalArgumentException("Bu talebi tamamlama yetkiniz yok");
        }

        if (exchangeRequest.getStatus() != ExchangeRequestStatus.ACCEPTED) {
            throw new IllegalArgumentException("Sadece kabul edilmiş talepler tamamlanabilir");
        }
        if (exchangeRequest.getOwnerAttendanceAckAt() == null) {
            exchangeRequest.setOwnerAttendanceAckAt(Instant.now());
        }
        settleIfBothAttendanceAcked(exchangeRequest);
        exchangeRequestRepository.save(exchangeRequest);
        return mapToResponse(exchangeRequest);
    }

    /**
     * Kabul edilmiş oturum: eğitmen (beceri sahibi) toplantı linki ekler/günceller.
     */
    @Transactional
    public ExchangeRequestResponse updateSessionMeeting(
            UUID requestId,
            UpdateSessionMeetingRequest req,
            String userEmail
    ) {
        ExchangeRequest ex = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));
        if (!ex.getSkill().getOwner().getEmail().equalsIgnoreCase(userEmail)) {
            throw new IllegalArgumentException("Oturum linkini yalnızca eğitmen (beceri sahibi) güncelleyebilir");
        }
        if (ex.getStatus() != ExchangeRequestStatus.ACCEPTED) {
            throw new IllegalArgumentException("Sadece onaylanmış oturumlar için link eklenebilir");
        }
        String u = req.getMeetingUrl() == null ? null : req.getMeetingUrl().trim();
        ex.setSessionMeetingUrl(u == null || u.isEmpty() ? null : u);
        exchangeRequestRepository.save(ex);
        return mapToResponse(ex);
    }

    /**
     * Talep sahibi (öğrenci) oturumun başladığını işaretler.
     */
    @Transactional
    public ExchangeRequestResponse acknowledgeRequesterAttendance(
            UUID requestId,
            String userEmail
    ) {
        ExchangeRequest ex = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));
        if (!ex.getRequester().getEmail().equalsIgnoreCase(userEmail)) {
            throw new IllegalArgumentException("Bu oturum için sadece talep sahibi onay verebilir");
        }
        if (ex.getStatus() != ExchangeRequestStatus.ACCEPTED) {
            throw new IllegalArgumentException("Sadece onaylanmış oturumlar için katılım onayı verilebilir");
        }
        if (ex.getRequesterAttendanceAckAt() == null) {
            ex.setRequesterAttendanceAckAt(Instant.now());
        }
        settleIfBothAttendanceAcked(ex);
        exchangeRequestRepository.save(ex);
        return mapToResponse(ex);
    }

    @Transactional
    public ExchangeRequestResponse acknowledgeOwnerAttendance(
            UUID requestId,
            String userEmail
    ) {
        ExchangeRequest ex = exchangeRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));
        if (!ex.getSkill().getOwner().getEmail().equalsIgnoreCase(userEmail)) {
            throw new IllegalArgumentException("Bu oturum için sadece eğitmen onay verebilir");
        }
        if (ex.getStatus() != ExchangeRequestStatus.ACCEPTED) {
            throw new IllegalArgumentException("Sadece onaylanmış oturumlar için katılım onayı verilebilir");
        }
        if (ex.getOwnerAttendanceAckAt() == null) {
            ex.setOwnerAttendanceAckAt(Instant.now());
        }
        settleIfBothAttendanceAcked(ex);
        exchangeRequestRepository.save(ex);
        return mapToResponse(ex);
    }

    @Transactional(readOnly = true)
    public List<ExchangeMessageResponse> listMessages(UUID exchangeRequestId, String userEmail) {
        ExchangeRequest ex = exchangeRequestRepository.findById(exchangeRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));
        if (!isParticipant(ex, userEmail)) {
            throw new IllegalArgumentException("Bu konuşmaya erişim yok");
        }
        return exchangeMessageRepository.findByExchangeRequest_IdOrderByCreatedAtAsc(exchangeRequestId)
                .stream()
                .map(this::mapMessage)
                .toList();
    }

    @Transactional
    public ExchangeMessageResponse sendMessage(
            UUID exchangeRequestId,
            CreateExchangeMessageRequest req,
            String userEmail
    ) {
        ExchangeRequest ex = exchangeRequestRepository.findById(exchangeRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Talep bulunamadı"));
        if (ex.getStatus() == ExchangeRequestStatus.PENDING && !ex.isPendingFromOwner()) {
            throw new IllegalArgumentException("Talep beklemedeyken mesaj gönderilemez");
        }
        if (!isParticipant(ex, userEmail)) {
            throw new IllegalArgumentException("Bu konuşmaya erişim yok");
        }
        User sender = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));
        ExchangeMessage msg = new ExchangeMessage();
        msg.setExchangeRequest(ex);
        msg.setSender(sender);
        msg.setBody(req.getBody().trim());
        ExchangeMessage saved = exchangeMessageRepository.save(msg);
        return mapMessage(saved);
    }

    private static boolean isParticipant(ExchangeRequest ex, String email) {
        return ex.getRequester().getEmail().equalsIgnoreCase(email)
                || ex.getSkill().getOwner().getEmail().equalsIgnoreCase(email);
    }

    /**
     * Aynı kullanıcı için aynı anda (öğrenci veya eğitmen olarak) çakışan onaylı oturum yok.
     */
    private void assertNoAcceptScheduleConflict(
            User requester,
            User owner,
            Instant scheduled,
            int bookedMinutes,
            UUID excludeExchangeId
    ) {
        if (scheduled == null) {
            return;
        }
        if (bookedMinutes <= 0) {
            return;
        }
        assertUserScheduleNoOverlap(requester.getId(), scheduled, bookedMinutes, excludeExchangeId);
        assertUserScheduleNoOverlap(owner.getId(), scheduled, bookedMinutes, excludeExchangeId);
    }

    private void assertUserScheduleNoOverlap(
            UUID userId,
            Instant newStart,
            int newMinutes,
            UUID excludeExchangeId
    ) {
        Instant newEnd = newStart.plus(newMinutes, ChronoUnit.MINUTES);
        List<ExchangeRequest> list = exchangeRequestRepository.findAcceptedByUserInvolvement(
                ExchangeRequestStatus.ACCEPTED, userId);
        for (ExchangeRequest e : list) {
            if (excludeExchangeId != null && excludeExchangeId.equals(e.getId())) {
                continue;
            }
            Instant oStart = e.getScheduledStartAt();
            if (oStart == null) {
                continue;
            }
            Instant oEnd = oStart.plus(e.getBookedMinutes(), ChronoUnit.MINUTES);
            if (intervalsOverlap(newStart, newEnd, oStart, oEnd)) {
                throw new IllegalArgumentException(
                        "Bu zaman aralığında zaten onaylanmış başka bir oturumunuz var; çakışan rezervasyon yapılamaz.");
            }
        }
    }

    private static boolean intervalsOverlap(Instant a0, Instant a1, Instant b0, Instant b1) {
        // Yarım açık: [a0, a1) yorumu — aynı anda biten/başlayan hafif kesişimlere izin: bitiş == başlangıç çakışmaz
        return a0.isBefore(b1) && b0.isBefore(a1);
    }

    private static void validateScheduleAgainstSkillAvailability(Skill skill, Instant scheduledStartAt) {
        if (skill.getAvailableDays() == null || skill.getAvailableFrom() == null || skill.getAvailableUntil() == null) {
            return;
        }
        var local = scheduledStartAt.atZone(SCHEDULE_ZONE);
        String day = local.getDayOfWeek().name().toUpperCase(Locale.ROOT);
        List<String> allowedDays = Arrays.stream(skill.getAvailableDays().split(","))
                .map(String::trim)
                .map(s -> s.toUpperCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .toList();
        if (!allowedDays.contains(day)) {
            throw new IllegalArgumentException("Seçilen gün eğitmenin uygun günleri arasında değil");
        }
        LocalTime start = local.toLocalTime().withSecond(0).withNano(0);
        LocalTime from = LocalTime.parse(skill.getAvailableFrom());
        LocalTime until = LocalTime.parse(skill.getAvailableUntil());
        if (start.isBefore(from) || !start.isBefore(until)) {
            throw new IllegalArgumentException("Seçilen saat eğitmenin uygun saat aralığında değil");
        }
    }

    private ExchangeMessageResponse mapMessage(ExchangeMessage m) {
        return new ExchangeMessageResponse(
                m.getId(),
                m.getSender().getId(),
                m.getSender().getFullName(),
                m.getBody(),
                m.getCreatedAt()
        );
    }

    private ExchangeRequestResponse mapToResponse(ExchangeRequest exchangeRequest) {
        return new ExchangeRequestResponse(
                exchangeRequest.getId(),
                exchangeRequest.getSkill().getId(),
                exchangeRequest.getSkill().getTitle(),
                exchangeRequest.getRequester().getId(),
                exchangeRequest.getRequester().getFullName(),
                exchangeRequest.getSkill().getOwner().getId(),
                exchangeRequest.getSkill().getOwner().getFullName(),
                exchangeRequest.getMessage(),
                exchangeRequest.getBookedMinutes(),
                exchangeRequest.getScheduledStartAt(),
                exchangeRequest.isPendingFromOwner(),
                exchangeRequest.getStatus(),
                exchangeRequest.getCreatedAt(),
                exchangeRequest.getSessionMeetingUrl(),
                exchangeRequest.getRequesterAttendanceAckAt(),
                exchangeRequest.getOwnerAttendanceAckAt()
        );
    }

    private void releaseHeldCreditIfAny(ExchangeRequest ex) {
        if (!ex.isRequesterCreditHeld()) {
            return;
        }
        User requester = ex.getRequester();
        requester.setTimeCreditMinutes(requester.getTimeCreditMinutes() + ex.getBookedMinutes());
        ex.setRequesterCreditHeld(false);
        userRepository.save(requester);
    }

    private void settleIfBothAttendanceAcked(ExchangeRequest exchangeRequest) {
        if (exchangeRequest.getStatus() != ExchangeRequestStatus.ACCEPTED) {
            return;
        }
        if (exchangeRequest.getRequesterAttendanceAckAt() == null || exchangeRequest.getOwnerAttendanceAckAt() == null) {
            return;
        }
        User provider = exchangeRequest.getSkill().getOwner();
        User requester = exchangeRequest.getRequester();
        int minutes = exchangeRequest.getBookedMinutes();
        provider.setTimeCreditMinutes(provider.getTimeCreditMinutes() + minutes);
        exchangeRequest.setRequesterCreditHeld(false);
        exchangeRequest.setStatus(ExchangeRequestStatus.COMPLETED);

        TimeTransaction spendTx = new TimeTransaction();
        spendTx.setUser(requester);
        spendTx.setExchangeRequest(exchangeRequest);
        spendTx.setType(TransactionType.SPEND);
        spendTx.setMinutes(minutes);
        spendTx.setDescription("Onaylanan oturum için askıdaki kredi kesinleşti");

        TimeTransaction earnTx = new TimeTransaction();
        earnTx.setUser(provider);
        earnTx.setExchangeRequest(exchangeRequest);
        earnTx.setType(TransactionType.EARN);
        earnTx.setMinutes(minutes);
        earnTx.setDescription("Onaylanan oturum için kredi kazanıldı");

        userRepository.save(provider);
        timeTransactionRepository.save(spendTx);
        timeTransactionRepository.save(earnTx);
    }
}