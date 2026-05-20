package com.timebank.timebank.publicsite;

import com.timebank.timebank.mail.RegistrationMailService;
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
        boolean sent = registrationMailService.sendContactFormInquiry(
                req.getName(),
                req.getEmail().trim(),
                req.getSubject().trim().toLowerCase(),
                req.getMessage().trim()
        );
        if (!sent) {
            return ResponseEntity
                    .status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "message",
                            "Email delivery is not configured or failed. Please try again later."
                    ));
        }
        return ResponseEntity.noContent().build();
    }
}
