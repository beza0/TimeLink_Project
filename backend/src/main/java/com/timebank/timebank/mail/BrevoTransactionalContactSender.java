package com.timebank.timebank.mail;

import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Brevo Transactional e-posta HTTP API (HTTPS 443). İletişim formu, doğrulama ve şifre sıfırlama için kullanılır.
 * Anahtar: {@code brevo.api-key} / {@code BREVO_API_KEY} (Brevo “API keys”; SMTP xsmtpsib- şifresi değildir).
 */
@Component
public class BrevoTransactionalContactSender {

    private static final Logger log = LoggerFactory.getLogger(BrevoTransactionalContactSender.class);
    private static final URI BREVO_SEND_URI = URI.create("https://api.brevo.com/v3/smtp/email");

    private final Environment environment;
    private final RestClient restClient = RestClient.create();

    public BrevoTransactionalContactSender(Environment environment) {
        this.environment = environment;
    }

    public boolean isConfigured() {
        String k = apiKeyRaw();
        return k != null && !k.isBlank();
    }

    private String apiKeyRaw() {
        String k = environment.getProperty("brevo.api-key");
        if (k == null || k.isBlank()) {
            k = environment.getProperty("BREVO_API_KEY");
        }
        return k == null ? "" : k.trim();
    }

    /**
     * Anahtar yoksa false döner (ağ çağrısı yok). Başarılı gönderimde true.
     */
    public boolean sendIfConfigured(
            String name,
            String replyToEmail,
            String subject,
            String textBody,
            String toInbox,
            String fromHeader
    ) {
        String apiKey = apiKeyRaw();
        if (apiKey.isBlank()) {
            return false;
        }
        ParsedFrom parsed = parseFromHeader(fromHeader);
        if (parsed.email() == null || parsed.email().isBlank()) {
            log.warn("Brevo API: gönderici e-postası çıkarılamadı, fromHeader={}", maskFromForLog(fromHeader));
            return false;
        }
        Map<String, Object> payload = buildPayload(name, replyToEmail, subject, textBody, toInbox, parsed);
        return postPayload(apiKey, payload, "contact", toInbox, replyToEmail);
    }

    /**
     * Tek alıcıya düz metin (doğrulama / şifre sıfırlama). Reply-To yok.
     */
    public boolean sendPlainToRecipient(String toEmail, String subject, String textBody, String fromHeader) {
        String apiKey = apiKeyRaw();
        if (apiKey.isBlank()) {
            return false;
        }
        ParsedFrom parsed = parseFromHeader(fromHeader);
        if (parsed.email() == null || parsed.email().isBlank()) {
            log.warn("Brevo API: gönderici e-postası çıkarılamadı, fromHeader={}", maskFromForLog(fromHeader));
            return false;
        }
        if (toEmail == null || toEmail.isBlank()) {
            return false;
        }
        Map<String, Object> sender = new LinkedHashMap<>();
        sender.put("name", parsed.name().isBlank() ? "Tiempos" : parsed.name());
        sender.put("email", parsed.email());

        List<Map<String, String>> to = new ArrayList<>();
        Map<String, String> toOne = new LinkedHashMap<>();
        toOne.put("email", toEmail.trim());
        to.add(toOne);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("sender", sender);
        root.put("to", to);
        root.put("subject", subject);
        root.put("textContent", textBody);
        return postPayload(apiKey, root, "transactional", toEmail, null);
    }

    private boolean postPayload(
            String apiKey,
            Map<String, Object> payload,
            String kind,
            String toMaskedHint,
            String replyToHint
    ) {
        try {
            restClient.post()
                    .uri(BREVO_SEND_URI)
                    .header("api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            if (replyToHint != null) {
                log.info("Brevo API: {} gönderildi, to={}, replyTo={}", kind, toMaskedHint, maskEmailForLog(replyToHint));
            } else {
                log.info("Brevo API: {} gönderildi, to={}", kind, maskEmailForLog(toMaskedHint));
            }
            return true;
        } catch (RestClientResponseException e) {
            String body = e.getResponseBodyAsString();
            String snippet = body == null || body.length() < 400 ? body : body.substring(0, 400) + "…";
            log.error(
                    "Brevo API HTTP {} ({}): {}",
                    e.getStatusCode().value(),
                    kind,
                    snippet == null || snippet.isBlank() ? "(gövde yok)" : snippet
            );
            return false;
        } catch (Exception e) {
            log.error("Brevo API {} gönderilemedi: {}", kind, e.getMessage(), e);
            return false;
        }
    }

    private static Map<String, Object> buildPayload(
            String name,
            String replyToEmail,
            String subject,
            String textBody,
            String toInbox,
            ParsedFrom parsed
    ) {
        Map<String, Object> sender = new LinkedHashMap<>();
        sender.put("name", parsed.name().isBlank() ? "Tiempos" : parsed.name());
        sender.put("email", parsed.email());

        List<Map<String, String>> to = new ArrayList<>();
        Map<String, String> toOne = new LinkedHashMap<>();
        toOne.put("email", toInbox.trim());
        to.add(toOne);

        Map<String, Object> replyTo = new LinkedHashMap<>();
        replyTo.put("email", replyToEmail.trim());
        String rn = name == null ? "" : name.trim();
        if (!rn.isBlank()) {
            replyTo.put("name", rn);
        }

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("sender", sender);
        root.put("to", to);
        root.put("replyTo", replyTo);
        root.put("subject", subject);
        root.put("textContent", textBody);
        return root;
    }

    private record ParsedFrom(String name, String email) {}

    private static ParsedFrom parseFromHeader(String fromHeader) {
        if (fromHeader == null || fromHeader.isBlank()) {
            return new ParsedFrom("", "");
        }
        String trimmed = fromHeader.trim();
        try {
            InternetAddress[] parsed = InternetAddress.parse(trimmed, false);
            if (parsed.length > 0) {
                InternetAddress a = parsed[0];
                String addr = Optional.ofNullable(a.getAddress()).map(String::trim).orElse("");
                String personal = Optional.ofNullable(a.getPersonal()).map(String::trim).orElse("");
                return new ParsedFrom(personal, addr);
            }
        } catch (AddressException ignored) {
            // fall through
        }
        int lt = trimmed.indexOf('<');
        int gt = trimmed.indexOf('>');
        if (lt >= 0 && gt > lt) {
            String personal = trimmed.substring(0, lt).trim();
            String addr = trimmed.substring(lt + 1, gt).trim();
            return new ParsedFrom(personal.replace("\"", ""), addr);
        }
        return new ParsedFrom("", trimmed);
    }

    private static String maskEmailForLog(String email) {
        if (email == null || email.isBlank()) {
            return "(yok)";
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }

    private static String maskFromForLog(String from) {
        if (from == null || from.isBlank()) {
            return "(yok)";
        }
        int at = from.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return from.charAt(0) + "***" + from.substring(at);
    }
}
