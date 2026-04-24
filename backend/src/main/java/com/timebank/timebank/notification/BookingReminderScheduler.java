package com.timebank.timebank.notification;

import com.timebank.timebank.exchange.ExchangeRequest;
import com.timebank.timebank.exchange.ExchangeRequestRepository;
import com.timebank.timebank.exchange.ExchangeRequestStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Kabul edilmiş taleplerde oturum başlangıcından ~1 saat önce hatırlatıcı bildirim.
 */
@Component
public class BookingReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(BookingReminderScheduler.class);

    private final ExchangeRequestRepository exchangeRequestRepository;
    private final NotificationService notificationService;

    public BookingReminderScheduler(
            ExchangeRequestRepository exchangeRequestRepository,
            NotificationService notificationService
    ) {
        this.exchangeRequestRepository = exchangeRequestRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void sendReminders() {
        Instant now = Instant.now();
        Instant windowStart = now.plus(59, ChronoUnit.MINUTES);
        Instant windowEnd = now.plus(61, ChronoUnit.MINUTES);
        List<ExchangeRequest> due = exchangeRequestRepository
                .findByStatusAndReminderSentFalseAndScheduledStartAtBetween(
                        ExchangeRequestStatus.ACCEPTED,
                        windowStart,
                        windowEnd
                );
        for (ExchangeRequest ex : due) {
            try {
                notificationService.sendSessionReminder(ex);
                ex.setReminderSent(true);
                exchangeRequestRepository.save(ex);
            } catch (Exception e) {
                log.warn("Reminder failed for exchange {}: {}", ex.getId(), e.getMessage());
            }
        }

        Instant startWindow = now.minus(1, ChronoUnit.MINUTES);
        Instant endWindow = now.plus(1, ChronoUnit.MINUTES);
        List<ExchangeRequest> startDue = exchangeRequestRepository
                .findByStatusAndStartedPromptSentFalseAndScheduledStartAtBetween(
                        ExchangeRequestStatus.ACCEPTED,
                        startWindow,
                        endWindow
                );
        for (ExchangeRequest ex : startDue) {
            try {
                notificationService.sendSessionStartPrompt(ex);
                ex.setStartedPromptSent(true);
                exchangeRequestRepository.save(ex);
            } catch (Exception e) {
                log.warn("Session-start prompt failed for exchange {}: {}", ex.getId(), e.getMessage());
            }
        }
    }
}
