package com.timebank.timebank.notification;

import com.timebank.timebank.notification.dto.NotificationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> list(Authentication authentication) {
        return notificationService.listForUser(authentication.getName());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication authentication) {
        return Map.of("count", notificationService.countUnread(authentication.getName()));
    }

    /** POST avoids some proxies/CDNs mishandling PUT; PUT kept for compatibility. */
    @PostMapping({"/mark-all-read", "/read-all"})
    public ResponseEntity<Void> markAllReadPost(Authentication authentication) {
        notificationService.markAllRead(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    /**
     * Same fixed-path style as {@code /mark-all-read} — some deployments break
     * {@code /{uuid}/read}; query param avoids embedding the id in the path.
     */
    @PostMapping("/mark-one-read")
    public ResponseEntity<Void> markOneRead(
            @RequestParam("id") UUID id,
            Authentication authentication
    ) {
        notificationService.markRead(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mark-one-unread")
    public ResponseEntity<Void> markOneUnread(
            @RequestParam("id") UUID id,
            Authentication authentication
    ) {
        notificationService.markUnread(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/delete-selected")
    public ResponseEntity<Void> deleteSelected(
            @RequestBody DeleteSelectedRequest request,
            Authentication authentication
    ) {
        List<UUID> ids = request != null && request.ids() != null ? request.ids() : List.of();
        notificationService.deleteSelected(authentication.getName(), ids);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllReadPut(Authentication authentication) {
        notificationService.markAllRead(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    /** POST avoids some proxies/CDNs mishandling PUT; PUT kept for compatibility. */
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markReadPost(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        notificationService.markRead(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        notificationService.markRead(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/unread")
    public ResponseEntity<Void> markUnreadPost(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        notificationService.markUnread(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/unread")
    public ResponseEntity<Void> markUnread(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        notificationService.markUnread(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }

    public record DeleteSelectedRequest(List<UUID> ids) {}
}
