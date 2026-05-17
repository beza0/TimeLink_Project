package com.timebank.timebank.mail;

import com.timebank.timebank.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import jakarta.annotation.PostConstruct;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Kayıt e-postaları. {@code spring.mail.host} yoksa gönderim yok; kayıt akışında doğrulama da atlanır.
 */
@Service
public class RegistrationMailService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationMailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Environment environment;

    public RegistrationMailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            Environment environment
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.environment = environment;
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
                "SMTP: host={}, deliveryEnabled={}, localCapture(Mailpit)= {}",
                host == null || host.isBlank() ? "(none)" : host.trim(),
                isMailDeliveryEnabled(),
                isLocalCaptureSmtp());
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
            msg.setSubject("Tiempo — doğrulama kodunuz");
            msg.setText(
                    "Merhaba " + fullName + ",\n\n"
                            + "Tiempo hesabınızı tamamlamak için doğrulama kodunuz:\n\n"
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
            msg.setSubject("Tiempo — şifre sıfırlama kodunuz");
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
            msg.setSubject("Tiempo — kaydınız tamamlandı");
            msg.setText(
                    "Merhaba " + user.getFullName() + ",\n\n"
                            + "Tiempo'e hoş geldiniz. Hesabınız oluşturuldu.\n\n"
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
        return "noreply@timelink.local";
    }
}
