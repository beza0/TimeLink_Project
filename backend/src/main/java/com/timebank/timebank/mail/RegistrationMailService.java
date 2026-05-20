package com.timebank.timebank.mail;

import com.timebank.timebank.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Kayıt e-postaları. {@code spring.mail.host} yoksa gönderim yok; kayıt akışında doğrulama da atlanır.
 */
@Service
public class RegistrationMailService {

    /** İletişim formu SMTP sonucu (HTTP 503 gövdesinde {@code code} için kullanılır). */
    public enum ContactInquirySendStatus {
        SENT,
        /** Host / kullanıcı-şifre eksik veya JavaMailSender yok */
        SMTP_NOT_READY,
        MAIL_BEAN_MISSING,
        INBOX_MISSING,
        /** Sunucuya bağlanıldı; gönderim SMTP tarafından reddedildi / hata */
        SEND_FAILED
    }

    private static final Logger log = LoggerFactory.getLogger(RegistrationMailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Environment environment;
    private final BrevoTransactionalContactSender brevoTransactionalContactSender;

    public RegistrationMailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            Environment environment,
            BrevoTransactionalContactSender brevoTransactionalContactSender
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.environment = environment;
        this.brevoTransactionalContactSender = brevoTransactionalContactSender;
    }

    /** SMTP ile gerçek posta gönderilebiliyor mu (doğrulama zorunlu mu)? */
    public boolean isMailDeliveryEnabled() {
        Boolean explicit = environment.getProperty("app.mail.enabled", Boolean.class);
        if (explicit != null) {
            return explicit;
        }
        String host = environment.getProperty("spring.mail.host");
        if (host == null || host.isBlank()) {
            return false;
        }

        boolean smtpAuth = environment.getProperty(
                "spring.mail.properties.mail.smtp.auth",
                Boolean.class,
                true
        );
        if (!smtpAuth) {
            return true;
        }

        String username = environment.getProperty("spring.mail.username");
        String password = environment.getProperty("spring.mail.password");
        return username != null
                && !username.isBlank()
                && password != null
                && !password.isBlank();
    }

    /**
     * SMTP oturumu (host + gerekirse kullanıcı/şifre) gerçekten yapılandırılmış mı.
     * {@link #isMailDeliveryEnabled()} {@code app.mail.enabled=false} iken false dönebilir; iletişim formu
     * yalnızca buna bakar — böylece Brevo açıkken form yine çalışır.
     */
    public boolean isSmtpTransportReady() {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return false;
        }
        String host = environment.getProperty("spring.mail.host");
        if (host == null || host.isBlank()) {
            return false;
        }
        boolean smtpAuth = environment.getProperty(
                "spring.mail.properties.mail.smtp.auth",
                Boolean.class,
                true
        );
        if (!smtpAuth) {
            return true;
        }
        String username = environment.getProperty("spring.mail.username");
        String password = environment.getProperty("spring.mail.password");
        return username != null
                && !username.isBlank()
                && password != null
                && !password.isBlank();
    }

    /**
     * Yerel yakalama (Mailpit vb.): gerçek gelen kutusu değil; kod Mailpit UI veya API loglarında görünür.
     */
    public boolean isLocalCaptureSmtp() {
        if (!isMailDeliveryEnabled()) {
            return false;
        }
        String host = environment.getProperty("spring.mail.host");
        if (host == null || host.isBlank()) {
            return false;
        }
        String h = host.trim().toLowerCase(Locale.ROOT);
        return "localhost".equals(h)
                || "127.0.0.1".equals(h)
                || "::1".equals(h)
                || "mailpit".equals(h);
    }

    @PostConstruct
    void logEffectiveMailBackend() {
        String host = environment.getProperty("spring.mail.host");
        log.info(
                "SMTP: host={}, deliveryEnabled={}, smtpReadyForContact={}, localCapture(Mailpit)= {}, from={}, brevoApiKey={}",
                host == null || host.isBlank() ? "(none)" : host.trim(),
                isMailDeliveryEnabled(),
                isSmtpTransportReady(),
                isLocalCaptureSmtp(),
                maskFromForLog(fromAddress()),
                brevoTransactionalContactSender.isConfigured() ? "yes" : "no");
        if (isMailDeliveryEnabled() && !isLocalCaptureSmtp()) {
            probeSmtpConnection();
        }
    }

    private void probeSmtpConnection() {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (!(mailSender instanceof JavaMailSenderImpl impl)) {
            return;
        }
        try {
            impl.testConnection();
            log.info(
                    "SMTP bağlantı testi OK ({}:{}, user={})",
                    impl.getHost(),
                    impl.getPort(),
                    maskEmailForLog(impl.getUsername()));
        } catch (MessagingException e) {
            log.error(
                    "SMTP bağlantı testi BAŞARISIZ ({}:{}) — doğrulama e-postası gitmeyebilir. "
                            + "Hata: {}. Gmail + Render sık engellenir; Brevo (smtp-relay.brevo.com) önerilir.",
                    impl.getHost(),
                    impl.getPort(),
                    e.getMessage());
        }
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

    /**
     * E-postaya 6 haneli doğrulama kodu (kullanıcıda saklı; aynı alan/VARCHAR).
     */
    public void sendVerificationEmail(User user) {
        String code = user.getEmailVerificationToken();
        if (code == null || code.isBlank()) {
            log.warn("Doğrulama kodu boş, e-posta atlanıyor: {}", user.getEmail());
            return;
        }
        sendVerificationCode(user.getFullName(), user.getEmail(), code);
    }

    /**
     * Kayıt / yeniden gönder — HTTP yanıtını bekletmez; SMTP hatası kaydı iptal etmez.
     * @return true e-posta SMTP ile gönderildi
     */
    @Async
    public void sendVerificationCodeAsync(String fullName, String email, String code) {
        boolean sent = sendVerificationCode(fullName, email, code);
        if (!sent) {
            log.warn(
                    "Doğrulama e-postası gönderilemedi (kayıt yine de tamam). e-posta={} — Render loglarında SMTP hatasına bakın; geçici olarak APP_MAIL_ENABLED=false veya Brevo ayarlarını düzeltin.",
                    email);
        }
    }

    /**
     * Bekleyen kayıt veya doğrulama yeniden gönderimi.
     * @return true gönderim başarılı; false atlandı veya SMTP hatası (çağıran HTTP isteğini patlatmaz)
     */
    public boolean sendVerificationCode(String fullName, String email, String code) {
        if (!isMailDeliveryEnabled()) {
            log.warn(
                    "SMTP kapalı — doğrulama kodu e-postayla gitmez. e-posta={} kod={}",
                    email,
                    code);
            return false;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.debug("JavaMailSender yok, doğrulama e-postası atlanıyor");
            return false;
        }
        if (code == null || code.isBlank()) {
            log.warn("Doğrulama kodu boş, e-posta atlanıyor: {}", email);
            return false;
        }
        String from = fromAddress();
        String publicBase = environment.getProperty("app.public-base-url", "http://localhost:3000").trim().replaceAll("/$", "");
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(email);
            msg.setSubject("Tiempos — doğrulama kodunuz");
            msg.setText(
                    "Merhaba " + fullName + ",\n\n"
                            + "Tiempos hesabınızı tamamlamak için doğrulama kodunuz:\n\n"
                            + "    " + code + "\n\n"
                            + "Bu kodu uygulamada girerek hesabınızı açabilirsiniz.\n"
                            + "Uygulama adresi: " + publicBase + "\n\n"
                            + "Kod 48 saat geçerlidir. Siz kayıt olmadıysanız bu iletiyi yok sayın.\n"
            );
            mailSender.send(msg);
            log.info("Doğrulama e-postası gönderildi: {}", email);
            return true;
        } catch (Exception e) {
            String host = environment.getProperty("spring.mail.host", "(yok)");
            log.error(
                    "Doğrulama e-postası gönderilemedi: alici={}, smtpHost={}, from={}, hata={}",
                    email,
                    host,
                    from,
                    e.getMessage(),
                    e
            );
            if (isStrictMailErrors()) {
                throw new IllegalStateException(
                        "Doğrulama e-postası gönderilemedi. SMTP ayarlarını (Brevo gönderici, SMTP key, APP_MAIL_FROM) kontrol edin.",
                        e
                );
            }
            return false;
        }
    }

    /** true ise SMTP hatası HTTP 503 olarak yukarı fırlar (varsayılan: false). */
    private boolean isStrictMailErrors() {
        return Boolean.TRUE.equals(environment.getProperty("app.mail.strict-errors", Boolean.class));
    }

    @Async
    public void sendPasswordResetCodeAsync(String fullName, String email, String code) {
        sendPasswordResetCode(fullName, email, code);
    }

    /** Şifre sıfırlama kodu gönderir. */
    public void sendPasswordResetCode(String fullName, String email, String code) {
        if (!isMailDeliveryEnabled()) {
            return;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.debug("JavaMailSender yok, şifre sıfırlama e-postası atlanıyor");
            return;
        }
        String from = fromAddress();
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(email);
            msg.setSubject("Tiempos — şifre sıfırlama kodunuz");
            msg.setText(
                    "Merhaba " + fullName + ",\n\n"
                            + "Şifre sıfırlama kodunuz:\n\n"
                            + "    " + code + "\n\n"
                            + "Bu kodu uygulamada girerek yeni şifrenizi belirleyebilirsiniz.\n"
                            + "Kod 1 saat geçerlidir. Siz bu talebi yapmadıysanız bu iletiyi yok sayın.\n"
            );
            mailSender.send(msg);
            log.info("Şifre sıfırlama e-postası gönderildi: {}", email);
        } catch (Exception e) {
            log.error("Şifre sıfırlama e-postası gönderilemedi ({})", email, e);
            throw new IllegalStateException(
                    "Şifre sıfırlama e-postası gönderilemedi. SMTP ayarlarını kontrol edin.",
                    e
            );
        }
    }

    /** SMTP kapalıyken basit hoş geldin (geliştirme). */
    public void sendWelcomeAfterRegister(User user) {
        if (!isMailDeliveryEnabled()) {
            return;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return;
        }
        String from = fromAddress();
        String to = user.getEmail();
        String publicBase = environment.getProperty("app.public-base-url", "http://localhost:3000");
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject("Tiempos — kaydınız tamamlandı");
            msg.setText(
                    "Merhaba " + user.getFullName() + ",\n\n"
                            + "Tiempos'a hoş geldiniz. Hesabınız oluşturuldu.\n\n"
                            + "Uygulama: " + publicBase + "\n\n"
                            + "Bu e-postayı siz talep etmediyseniz yok sayabilirsiniz.\n"
            );
            mailSender.send(msg);
            log.info("Kayıt hoş geldin e-postası gönderildi: {}", to);
        } catch (Exception e) {
            log.warn("Hoş geldin e-postası gönderilemedi ({}): {}", to, e.getMessage());
        }
    }

    public boolean isMailFromConfigured() {
        String from = environment.getProperty("app.mail.from");
        if (from != null && !from.isBlank()) {
            return true;
        }
        String user = environment.getProperty("spring.mail.username");
        return user != null && !user.isBlank();
    }

    public boolean isMailHostConfigured() {
        String host = environment.getProperty("spring.mail.host");
        return host != null && !host.isBlank();
    }

    private String fromAddress() {
        String from = environment.getProperty("app.mail.from");
        if (from != null && !from.isBlank()) {
            return from.trim();
        }
        String user = environment.getProperty("spring.mail.username");
        if (user != null && !user.isBlank()) {
            return user.trim();
        }
        return "noreply@tiempos.local";
    }

    /**
     * Web sitesi iletişim formu — gelen kutusu {@code app.contact.inbox} (varsayılan tiempos.site@gmail.com).
     * Reply-To: gönderenin e-postası.
     */
    public ContactInquirySendStatus sendContactFormInquiry(
            String name,
            String replyToEmail,
            String subjectKey,
            String message
    ) {
        String inbox = environment.getProperty("app.contact.inbox", "tiempos.site@gmail.com").trim();
        if (inbox.isBlank()) {
            log.warn("İletişim formu: app.contact.inbox boş");
            return ContactInquirySendStatus.INBOX_MISSING;
        }
        String from = fromAddress();
        String subjectLabel = contactSubjectLabel(subjectKey);
        String body =
                "New message from the Tiempos contact form.\n\n"
                        + "Name: " + name + "\n"
                        + "Email: " + replyToEmail + "\n"
                        + "Topic: " + subjectLabel + "\n\n"
                        + "---\n"
                        + message + "\n"
                        + "---\n";
        String subject = "[Tiempos Contact] " + subjectLabel;

        if (brevoTransactionalContactSender.sendIfConfigured(name, replyToEmail, subject, body, inbox, from)) {
            return ContactInquirySendStatus.SENT;
        }

        if (!isSmtpTransportReady()) {
            log.warn(
                    "İletişim formu: SMTP hazır değil ve Brevo API anahtarı yok/başarısız. replyTo={}",
                    maskEmailForLog(replyToEmail)
            );
            return ContactInquirySendStatus.SMTP_NOT_READY;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("İletişim formu: JavaMailSender yok");
            return ContactInquirySendStatus.MAIL_BEAN_MISSING;
        }
        try {
            var mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(inbox);
            helper.setReplyTo(replyToEmail);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(mimeMessage);
            log.info("İletişim formu e-postası gönderildi (SMTP): inbox={}, replyTo={}", inbox, maskEmailForLog(replyToEmail));
            return ContactInquirySendStatus.SENT;
        } catch (Exception e) {
            log.error(
                    "İletişim formu e-postası gönderilemedi (SMTP): inbox={}, replyTo={}, from={}, hata={}",
                    inbox,
                    maskEmailForLog(replyToEmail),
                    maskFromForLog(from),
                    e.getMessage(),
                    e
            );
            if (isStrictMailErrors()) {
                throw new IllegalStateException(
                        "İletişim e-postası gönderilemedi. SMTP ayarlarını kontrol edin.",
                        e
                );
            }
            return ContactInquirySendStatus.SEND_FAILED;
        }
    }

    private static String contactSubjectLabel(String key) {
        if (key == null) {
            return "Other";
        }
        return switch (key.toLowerCase(Locale.ROOT)) {
            case "general" -> "General inquiry";
            case "support" -> "Technical support";
            case "billing" -> "Billing question";
            case "partnership" -> "Partnership";
            case "feedback" -> "Feedback";
            default -> "Other";
        };
    }
}
