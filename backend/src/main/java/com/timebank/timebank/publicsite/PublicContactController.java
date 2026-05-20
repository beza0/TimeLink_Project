package com.timebank.timebank.publicsite;

import com.timebank.timebank.mail.RegistrationMailService;
import com.timebank.timebank.mail.RegistrationMailService.ContactInquirySendStatus;
import com.timebank.timebank.publicsite.dto.ContactFormRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicContactController {

    private final RegistrationMailService registrationMailService;

    public PublicContactController(RegistrationMailService registrationMailService) {
        this.registrationMailService = registrationMailService;
    }

    @PostMapping("/contact")
    public ResponseEntity<?> submitContact(@Valid @RequestBody ContactFormRequest req) {
        ContactInquirySendStatus status = registrationMailService.sendContactFormInquiry(
                req.getName(),
                req.getEmail().trim(),
                req.getSubject().trim().toLowerCase(),
                req.getMessage().trim()
        );
        if (status == ContactInquirySendStatus.SENT) {
            return ResponseEntity.noContent().build();
        }
        String code = status == ContactInquirySendStatus.SEND_FAILED ? "smtp_send_failed" : "smtp_not_ready";
        String message = status == ContactInquirySendStatus.SEND_FAILED
                ? "SMTP send failed (check sender verification and credentials)."
                : "SMTP is not configured (missing host, credentials, or mail bean).";
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                        "code", code,
                        "message", message
                ));
    }
}
