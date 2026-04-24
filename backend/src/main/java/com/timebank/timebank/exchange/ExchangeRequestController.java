package com.timebank.timebank.exchange;

import com.timebank.timebank.exchange.dto.CreateExchangeMessageRequest;
import com.timebank.timebank.exchange.dto.CreateExchangeRequestRequest;
import com.timebank.timebank.exchange.dto.ExchangeMessageResponse;
import com.timebank.timebank.exchange.dto.ExchangeRequestResponse;
import com.timebank.timebank.exchange.dto.UpdateSessionMeetingRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exchange-requests")
public class ExchangeRequestController {

    private final ExchangeRequestService exchangeRequestService;

    public ExchangeRequestController(ExchangeRequestService exchangeRequestService) {
        this.exchangeRequestService = exchangeRequestService;
    }

    @PostMapping("/skill/{skillId}")
    public ResponseEntity<ExchangeRequestResponse> createRequest(
            @PathVariable UUID skillId,
            @Valid @RequestBody CreateExchangeRequestRequest req,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.createRequest(skillId, req, authentication.getName())
        );
    }

    @GetMapping("/sent")
    public ResponseEntity<List<ExchangeRequestResponse>> getMySentRequests(Authentication authentication) {
        return ResponseEntity.ok(
                exchangeRequestService.getMySentRequests(authentication.getName())
        );
    }

    @GetMapping("/received")
    public ResponseEntity<List<ExchangeRequestResponse>> getMyReceivedRequests(Authentication authentication) {
        return ResponseEntity.ok(
                exchangeRequestService.getMyReceivedRequests(authentication.getName())
        );
    }

    @GetMapping("/{exchangeRequestId}/messages")
    public ResponseEntity<List<ExchangeMessageResponse>> getMessages(
            @PathVariable UUID exchangeRequestId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.listMessages(exchangeRequestId, authentication.getName())
        );
    }

    @PostMapping("/{exchangeRequestId}/messages")
    public ResponseEntity<ExchangeMessageResponse> postMessage(
            @PathVariable UUID exchangeRequestId,
            @Valid @RequestBody CreateExchangeMessageRequest req,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.sendMessage(exchangeRequestId, req, authentication.getName())
        );
    }

    @PutMapping("/{requestId}/accept")
    public ResponseEntity<ExchangeRequestResponse> acceptRequest(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.acceptRequest(requestId, authentication.getName())
        );
    }

    @PutMapping("/{requestId}/reject")
    public ResponseEntity<ExchangeRequestResponse> rejectRequest(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.rejectRequest(requestId, authentication.getName())
        );
    }

    @PostMapping("/{requestId}/counter-offer")
    public ResponseEntity<ExchangeRequestResponse> counterOffer(
            @PathVariable UUID requestId,
            @Valid @RequestBody CreateExchangeRequestRequest req,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.counterOfferRequest(requestId, req, authentication.getName())
        );
    }

    @PutMapping("/{requestId}/complete")
    public ResponseEntity<ExchangeRequestResponse> completeRequest(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.completeRequest(requestId, authentication.getName())
        );
    }

    @PutMapping("/{requestId}/cancel")
    public ResponseEntity<ExchangeRequestResponse> cancelRequest(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.cancelRequest(requestId, authentication.getName())
        );
    }

    @PutMapping("/{requestId}/meeting")
    public ResponseEntity<ExchangeRequestResponse> updateSessionMeeting(
            @PathVariable UUID requestId,
            @Valid @RequestBody UpdateSessionMeetingRequest req,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.updateSessionMeeting(
                        requestId, req, authentication.getName()
                )
        );
    }

    @PostMapping("/{requestId}/ack-attendance")
    public ResponseEntity<ExchangeRequestResponse> acknowledgeRequesterAttendance(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.acknowledgeRequesterAttendance(
                        requestId, authentication.getName()
                )
        );
    }

    @PostMapping("/{requestId}/ack-owner-attendance")
    public ResponseEntity<ExchangeRequestResponse> acknowledgeOwnerAttendance(
            @PathVariable UUID requestId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                exchangeRequestService.acknowledgeOwnerAttendance(
                        requestId, authentication.getName()
                )
        );
    }
}