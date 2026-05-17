package com.timebank.timebank.user;

import com.timebank.timebank.config.JwtService;
import com.timebank.timebank.exchange.ExchangeRequest;
import com.timebank.timebank.exchange.ExchangeRequestRepository;
import com.timebank.timebank.exchange.ExchangeMessageRepository;
import com.timebank.timebank.notification.UserNotificationRepository;
import com.timebank.timebank.review.ReviewRepository;
import com.timebank.timebank.skill.SkillRepository;
import com.timebank.timebank.transaction.TimeTransactionRepository;
import com.timebank.timebank.user.dto.LoginRequest;
import com.timebank.timebank.user.dto.LoginResponse;
import com.timebank.timebank.user.dto.RegisterRequest;
import com.timebank.timebank.user.dto.RegistrationOutcome;
import com.timebank.timebank.user.dto.SocialLoginRequest;
import com.timebank.timebank.user.dto.UpdateUserProfileRequest;
import com.timebank.timebank.user.dto.UserDashboardResponse;
import com.timebank.timebank.common.EmailVerificationRequiredException;
import com.timebank.timebank.mail.RegistrationMailService;
import com.timebank.timebank.user.dto.PublicUserProfileResponse;
import com.timebank.timebank.user.dto.UserBlockStateResponse;
import com.timebank.timebank.user.dto.UserProfileResponse;
import jakarta.persistence.EntityManager;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SkillRepository skillRepository;
    private final ExchangeRequestRepository exchangeRequestRepository;
    private final ReviewRepository reviewRepository;
    private final ExchangeMessageRepository exchangeMessageRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final TimeTransactionRepository timeTransactionRepository;
    private final PendingSignupRepository pendingSignupRepository;
    private final UserBlockRepository userBlockRepository;
    private final RegistrationMailService registrationMailService;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    /** OAuth Web client id (public) — frontend Google giriş butonu için. */
    public Optional<String> getGoogleOAuthClientId() {
        if (googleClientId == null || googleClientId.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(googleClientId.trim());
    }

    public UserService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       SkillRepository skillRepository,
                       ExchangeRequestRepository exchangeRequestRepository,
                       ReviewRepository reviewRepository,
                       ExchangeMessageRepository exchangeMessageRepository,
                       UserNotificationRepository userNotificationRepository,
                       TimeTransactionRepository timeTransactionRepository,
                       PendingSignupRepository pendingSignupRepository,
                       UserBlockRepository userBlockRepository,
                       RegistrationMailService registrationMailService,
                       EntityManager entityManager,
                       ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.skillRepository = skillRepository;
        this.exchangeRequestRepository = exchangeRequestRepository;
        this.reviewRepository = reviewRepository;
        this.exchangeMessageRepository = exchangeMessageRepository;
        this.userNotificationRepository = userNotificationRepository;
        this.timeTransactionRepository = timeTransactionRepository;
        this.pendingSignupRepository = pendingSignupRepository;
        this.userBlockRepository = userBlockRepository;
        this.registrationMailService = registrationMailService;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    /** JPQL delete bazen aynı TX içinde INSERT'tan önce DB'ye yansımıyor; native + flush güvenilir. */
    private void clearPendingSignupForEmail(String email) {
        entityManager.createNativeQuery("DELETE FROM pending_signups WHERE lower(email) = lower(:email)")
                .setParameter("email", email)
                .executeUpdate();
        entityManager.flush();
    }

    /**
     * Hesap yalnızca doğrulama kodundan sonra {@code users} tablosunda oluşturulur.
     * Doğrulama öncesi yalnızca {@code pending_signups} kaydı vardır (SMTP açık/kapalı aynı akış).
     */
    @Transactional(rollbackFor = Exception.class)
    public RegistrationOutcome register(RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        String fullName = req.getFullName().trim();

        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            if (existingUser.get().isEmailVerified()) {
                throw new IllegalArgumentException("Bu email zaten kayıtlı.");
            }
            deleteAccount(email);
        }

        clearPendingSignupForEmail(email);

        PendingSignup pending = new PendingSignup();
        pending.setEmail(email);
        pending.setFullName(fullName);
        pending.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        String code = newVerificationCode();
        pending.setVerificationCode(code);
        pending.setExpiresAt(Instant.now().plus(48, ChronoUnit.HOURS));

        PendingSignup saved = pendingSignupRepository.save(pending);

        if (registrationMailService.isMailDeliveryEnabled()) {
            registrationMailService.sendVerificationCodeAsync(fullName, email, code);
        } else {
            log.warn(
                    "SMTP kapalı — kod e-postayla gitmez. e-posta={} doğrulama_kodu={} (API/docker loglarına bakın; üretimde SMTP açın).",
                    email,
                    code);
        }

        return RegistrationOutcome.verifiedLater(saved);
    }

    /**
     * E-postaya gelen 6 haneli kod ile doğrular ve oturum token'ı döner.
     */
    @Transactional
    public LoginResponse verifyEmailWithCode(String emailRaw, String codeRaw) {
        if (emailRaw == null || emailRaw.isBlank() || codeRaw == null || codeRaw.isBlank()) {
            throw new IllegalArgumentException("E-posta ve doğrulama kodu gerekli.");
        }
        String email = emailRaw.trim().toLowerCase();
        String code = codeRaw.trim().replaceAll("\\s+", "");
        if (!code.matches("[0-9]{6}")) {
            throw new IllegalArgumentException("Doğrulama kodu 6 rakam olmalıdır.");
        }

        Optional<PendingSignup> pendingOpt = pendingSignupRepository.findByEmail(email);
        if (pendingOpt.isPresent()) {
            PendingSignup p = pendingOpt.get();
            if (Instant.now().isAfter(p.getExpiresAt())) {
                throw new IllegalArgumentException(
                        "Doğrulama süresi dolmuş. Yeni kod için \"Tekrar gönder\" kullanın.");
            }
            if (!constantTimeEquals(p.getVerificationCode(), code)) {
                throw new IllegalArgumentException("Doğrulama kodu hatalı.");
            }

            User user = new User();
            user.setFullName(p.getFullName());
            user.setEmail(p.getEmail());
            user.setPasswordHash(p.getPasswordHash());
            user.setRole("USER");
            user.setTimeCreditMinutes(60);
            user.skipEmailVerification();
            User saved = userRepository.save(user);
            pendingSignupRepository.delete(p);

            String token = jwtService.generateToken(saved.getEmail(), saved.getRole());
            return new LoginResponse(
                    token,
                    saved.getId(),
                    saved.getEmail(),
                    saved.getFullName(),
                    saved.getRole()
            );
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Geçersiz kod veya e-posta."));
        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Bu hesap zaten doğrulanmış.");
        }
        Instant exp = user.getEmailVerificationExpiresAt();
        if (exp != null && Instant.now().isAfter(exp)) {
            throw new IllegalArgumentException(
                    "Doğrulama süresi dolmuş. Yeni kod için \"Tekrar gönder\" kullanın.");
        }
        String expected = user.getEmailVerificationToken();
        if (expected == null || !constantTimeEquals(expected, code)) {
            throw new IllegalArgumentException("Doğrulama kodu hatalı.");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        User saved = userRepository.save(user);

        String token = jwtService.generateToken(saved.getEmail(), saved.getRole());
        return new LoginResponse(
                token,
                saved.getId(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole()
        );
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int r = 0;
        for (int i = 0; i < a.length(); i++) {
            r |= a.charAt(i) ^ b.charAt(i);
        }
        return r == 0;
    }

    /**
     * Bekleyen kayıt için yeni kod; SMTP yoksa kod yalnızca sunucu loglarına yazılır.
     * Eski (users’daki doğrulanmamış) hesaplar için uyumluluk dalı korunur.
     */
    @Transactional
    public void resendVerificationEmail(String emailRaw) {
        if (emailRaw == null || emailRaw.isBlank()) {
            return;
        }
        String email = emailRaw.trim().toLowerCase();
        boolean smtp = registrationMailService.isMailDeliveryEnabled();

        Optional<PendingSignup> pendingOpt = pendingSignupRepository.findByEmail(email);
        if (pendingOpt.isPresent()) {
            PendingSignup p = pendingOpt.get();
            String newCode = newVerificationCode();
            p.setVerificationCode(newCode);
            p.setExpiresAt(Instant.now().plus(48, ChronoUnit.HOURS));
            pendingSignupRepository.save(p);
            if (smtp) {
                registrationMailService.sendVerificationCodeAsync(p.getFullName(), email, newCode);
            } else {
                log.warn("SMTP kapalı — yeniden gönderilen kod. e-posta={} kod={}", email, newCode);
            }
            return;
        }

        if (!smtp) {
            return;
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.isEmailVerified()) {
            return;
        }
        user.setEmailVerificationToken(newVerificationCode());
        user.setEmailVerificationExpiresAt(Instant.now().plus(48, ChronoUnit.HOURS));
        User saved = userRepository.save(user);
        registrationMailService.sendVerificationEmail(saved);
    }

    @Transactional
    public UserBlockStateResponse blockUser(String blockerEmail, UUID blockedUserId) {
        User blocker = userRepository.findByEmailIgnoreCase(blockerEmail)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));
        User blocked = userRepository.findById(blockedUserId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));

        if (blocker.getId().equals(blocked.getId())) {
            throw new IllegalArgumentException("Kendinizi engelleyemezsiniz");
        }

        if (!userBlockRepository.existsByBlocker_IdAndBlocked_Id(blocker.getId(), blocked.getId())) {
            UserBlock rel = new UserBlock();
            rel.setBlocker(blocker);
            rel.setBlocked(blocked);
            userBlockRepository.save(rel);
        }
        return getMyBlockState(blockerEmail);
    }

    @Transactional
    public UserBlockStateResponse unblockUser(String blockerEmail, UUID blockedUserId) {
        User blocker = userRepository.findByEmailIgnoreCase(blockerEmail)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));
        userBlockRepository.deleteByBlocker_IdAndBlocked_Id(blocker.getId(), blockedUserId);
        return getMyBlockState(blockerEmail);
    }

    @Transactional(readOnly = true)
    public UserBlockStateResponse getMyBlockState(String userEmail) {
        User me = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));
        return new UserBlockStateResponse(
                userBlockRepository.findBlockedUserIds(me.getId()),
                userBlockRepository.findBlockedByUserIds(me.getId())
        );
    }

    /** 6 haneli sayısal kod (e-postada gönderilir). */
    private static String newVerificationCode() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    public LoginResponse login(LoginRequest req) {
        String email = req.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Email veya şifre hatalı"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email veya şifre hatalı");
        }

        if (!user.isEmailVerified()) {
            throw new EmailVerificationRequiredException();
        }

        String role = user.getRole();
        if (role == null || role.isBlank()) {
            role = "USER";
        }

        String token = jwtService.generateToken(user.getEmail(), role);

        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );
    }

    @Transactional
    public LoginResponse socialLogin(SocialLoginRequest req) {
        String provider = req.getProvider() == null ? "" : req.getProvider().trim().toLowerCase();
        String accessToken = req.getAccessToken() == null ? "" : req.getAccessToken().trim();
        String idToken = req.getIdToken() == null ? "" : req.getIdToken().trim();
        if (provider.isEmpty() || (accessToken.isEmpty() && idToken.isEmpty())) {
            throw new IllegalArgumentException("Sosyal giriş bilgisi eksik");
        }

        SocialIdentity identity = switch (provider) {
            case "google" -> fetchGoogleIdentity(accessToken, idToken);
            case "facebook" -> {
                if (accessToken.isEmpty()) {
                    throw new IllegalArgumentException("Facebook girişi için erişim jetonu gerekli");
                }
                yield fetchFacebookIdentity(accessToken);
            }
            default -> throw new IllegalArgumentException("Desteklenmeyen sosyal sağlayıcı");
        };

        String email = identity.email().trim().toLowerCase();
        if (email.isEmpty()) {
            throw new IllegalArgumentException("Sosyal hesap e-posta bilgisi döndürmedi");
        }
        String fullName = identity.fullName().isBlank() ? email : identity.fullName().trim();

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setFullName(fullName);
            // Sosyal girişte parola kullanılmaz; rastgele hash saklanır.
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setRole("USER");
            user.setTimeCreditMinutes(60);
            user.skipEmailVerification();
            user = userRepository.save(user);
        } else if (!user.isEmailVerified()) {
            user.skipEmailVerification();
            userRepository.save(user);
        }

        String appToken = jwtService.generateToken(user.getEmail(), user.getRole());
        return new LoginResponse(
                appToken,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );
    }

    private SocialIdentity fetchGoogleIdentity(String accessToken, String idToken) {
        if (!idToken.isEmpty()) {
            return fetchGoogleIdentityFromIdToken(idToken);
        }
        if (accessToken.isEmpty()) {
            throw new IllegalArgumentException("Google giriş bilgisi eksik");
        }
        return fetchGoogleIdentityFromAccessToken(accessToken);
    }

    private SocialIdentity fetchGoogleIdentityFromIdToken(String idToken) {
        try {
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token="
                    + URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Google ID token doğrulaması başarısız: status={}", response.statusCode());
                throw new IllegalArgumentException("Google doğrulaması başarısız");
            }
            JsonNode body = objectMapper.readTree(response.body());
            if (body.hasNonNull("error_description")) {
                throw new IllegalArgumentException("Google doğrulaması başarısız");
            }
            verifyGoogleAudience(body);
            verifyGoogleTokenNotExpired(body);
            String email = text(body, "email");
            String name = text(body, "name");
            if (name.isBlank()) {
                name = text(body, "given_name");
            }
            if (email.isBlank()) {
                throw new IllegalArgumentException("Google hesabı e-posta bilgisi döndürmedi");
            }
            return new SocialIdentity(email, name);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Google ID token işlenemedi", e);
            throw new IllegalArgumentException("Google ile giriş tamamlanamadı");
        }
    }

    private SocialIdentity fetchGoogleIdentityFromAccessToken(String accessToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder(
                            URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Google userinfo başarısız: status={} body={}", response.statusCode(), response.body());
                throw new IllegalArgumentException("Google doğrulaması başarısız");
            }
            JsonNode body = objectMapper.readTree(response.body());
            String email = text(body, "email");
            String name = text(body, "name");
            if (email.isBlank()) {
                throw new IllegalArgumentException("Google hesabı e-posta bilgisi döndürmedi");
            }
            return new SocialIdentity(email, name);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Google access token işlenemedi", e);
            throw new IllegalArgumentException("Google ile giriş tamamlanamadı");
        }
    }

    private void verifyGoogleAudience(JsonNode tokenInfo) {
        String configured = googleClientId == null ? "" : googleClientId.trim();
        if (configured.isEmpty()) {
            return;
        }
        String aud = text(tokenInfo, "aud");
        if (!configured.equals(aud)) {
            log.warn("Google aud eşleşmedi: beklenen={}, gelen={}", configured, aud);
            throw new IllegalArgumentException("Google doğrulaması başarısız");
        }
    }

    private void verifyGoogleTokenNotExpired(JsonNode tokenInfo) {
        String expRaw = text(tokenInfo, "exp");
        if (expRaw.isBlank()) {
            return;
        }
        try {
            long exp = Long.parseLong(expRaw);
            if (Instant.now().getEpochSecond() >= exp) {
                throw new IllegalArgumentException("Google oturumu süresi doldu");
            }
        } catch (NumberFormatException ignored) {
            // exp parse edilemezse Google yanıtına güven
        }
    }

    private SocialIdentity fetchFacebookIdentity(String accessToken) {
        try {
            String url = "https://graph.facebook.com/me?fields=id,name,email&access_token="
                    + URLEncoder.encode(accessToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .GET()
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalArgumentException("Facebook doğrulaması başarısız");
            }
            JsonNode body = objectMapper.readTree(response.body());
            String email = text(body, "email");
            String name = text(body, "name");
            if (email.isBlank()) {
                throw new IllegalArgumentException("Facebook hesabı e-posta bilgisi döndürmedi");
            }
            return new SocialIdentity(email, name);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Facebook ile giriş tamamlanamadı");
        }
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.get(field) == null || node.get(field).isNull()) {
            return "";
        }
        return node.get(field).asText("");
    }

    private record SocialIdentity(String email, String fullName) {
    }

    public UserProfileResponse getMyProfile(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));

        return toProfileResponse(user);
    }

    @Transactional(readOnly = true)
    public PublicUserProfileResponse getPublicProfile(UUID userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
        long totalReviews = reviewRepository.countByReviewedUserEmail(u.getEmail());
        Double avg = reviewRepository.findAverageRatingByReviewedUserEmail(u.getEmail());
        return new PublicUserProfileResponse(
                u.getId(),
                u.getFullName(),
                u.getBio(),
                u.getLocation(),
                u.getLanguages(),
                u.getWebsite(),
                u.getLinkedin(),
                u.getTwitter(),
                u.getAvatarUrl(),
                u.getCreatedAt(),
                avg != null ? avg : 0.0,
                totalReviews
        );
    }

    @Transactional
    public UserProfileResponse updateMyProfile(String email, UpdateUserProfileRequest req) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));

        user.setFullName(req.getFullName().trim());
        user.setBio(blankToNull(req.getBio()));
        user.setPhone(blankToNull(req.getPhone()));
        user.setLocation(blankToNull(req.getLocation()));
        user.setLanguages(blankToNull(req.getLanguages()));
        user.setWebsite(blankToNull(req.getWebsite()));
        user.setLinkedin(blankToNull(req.getLinkedin()));
        user.setTwitter(blankToNull(req.getTwitter()));
        user.setAvatarUrl(blankToNull(req.getAvatarUrl()));

        User saved = userRepository.saveAndFlush(user);

        return toProfileResponse(saved);
    }

    private static UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getBio(),
                user.getPhone(),
                user.getLocation(),
                user.getLanguages(),
                user.getWebsite(),
                user.getLinkedin(),
                user.getTwitter(),
                user.getAvatarUrl(),
                user.getTimeCreditMinutes(),
                user.getCreatedAt()
        );
    }

    private static String blankToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    public UserDashboardResponse getMyDashboard(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));

        long mySkillsCount = skillRepository.countByOwnerEmail(email);
        long sentRequestsCount = exchangeRequestRepository.countByRequesterEmail(email);
        long receivedRequestsCount = exchangeRequestRepository.countBySkillOwnerEmail(email);

        return new UserDashboardResponse(
                user.getFullName(),
                user.getTimeCreditMinutes(),
                mySkillsCount,
                sentRequestsCount,
                receivedRequestsCount
        );
    }

    /**
     * Şifre sıfırlama talebi: 6 haneli kod üretir, e-posta gönderir (SMTP varsa).
     * Kullanıcı bulunamazsa sessizce döner (e-posta sızıntısı önlenir).
     */
    @Transactional
    public void forgotPassword(String emailRaw) {
        if (emailRaw == null || emailRaw.isBlank()) {
            return;
        }
        String email = emailRaw.trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || !user.isEmailVerified()) {
            return;
        }
        String code = newVerificationCode();
        user.setPasswordResetToken(code);
        user.setPasswordResetExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));
        userRepository.save(user);

        if (registrationMailService.isMailDeliveryEnabled()) {
            registrationMailService.sendPasswordResetCodeAsync(user.getFullName(), email, code);
        } else {
            log.warn("SMTP kapalı — şifre sıfırlama kodu. e-posta={} kod={}", email, code);
        }
    }

    /**
     * Sıfırlama kodu ile yeni şifre belirler.
     */
    @Transactional
    public void resetPassword(String emailRaw, String tokenRaw, String newPassword) {
        if (emailRaw == null || emailRaw.isBlank()
                || tokenRaw == null || tokenRaw.isBlank()
                || newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("E-posta, kod ve yeni şifre gerekli.");
        }
        String email = emailRaw.trim().toLowerCase();
        String token = tokenRaw.trim().replaceAll("\\s+", "");

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Geçersiz kod veya e-posta."));

        String expected = user.getPasswordResetToken();
        if (expected == null || expected.isBlank()) {
            throw new IllegalArgumentException("Geçersiz veya süresi dolmuş sıfırlama kodu.");
        }
        Instant exp = user.getPasswordResetExpiresAt();
        if (exp != null && Instant.now().isAfter(exp)) {
            throw new IllegalArgumentException("Sıfırlama kodunun süresi dolmuş. Lütfen yeni bir kod talep edin.");
        }
        if (!constantTimeEquals(expected, token)) {
            throw new IllegalArgumentException("Geçersiz sıfırlama kodu.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiresAt(null);
        userRepository.save(user);
    }

    /**
     * Oturum açmış kullanıcının mevcut şifresini doğrulayıp yenisiyle değiştirir.
     */
    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadCredentialsException("Mevcut şifre hatalı.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /**
     * Kullanıcıyı ve ona bağlı tüm verileri siler: beceriler, talepler, mesajlar, yorumlar,
     * bildirimler, zaman işlemleri ve kullanıcı kaydı.
     */
    @Transactional
    public void deleteAccount(String emailRaw) {
        String email = emailRaw.trim().toLowerCase();
        clearPendingSignupForEmail(email);

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return;
        }
        UUID userId = user.getId();

        Set<UUID> erIdSet = new HashSet<>();
        for (ExchangeRequest er : exchangeRequestRepository.findByRequesterEmailOrderByCreatedAtDesc(email)) {
            erIdSet.add(er.getId());
        }
        for (ExchangeRequest er : exchangeRequestRepository.findBySkillOwnerEmailOrderByCreatedAtDesc(email)) {
            erIdSet.add(er.getId());
        }
        List<UUID> erIds = new ArrayList<>(erIdSet);

        if (!erIds.isEmpty()) {
            reviewRepository.deleteAllByExchangeRequest_IdIn(erIds);
            exchangeMessageRepository.deleteAllByExchangeRequest_IdIn(erIds);
            userNotificationRepository.deleteAllByExchangeRequest_IdIn(erIds);
            timeTransactionRepository.deleteAllByExchangeRequest_IdIn(erIds);
            exchangeRequestRepository.deleteAllById(erIds);
        }
        userNotificationRepository.deleteAllByUser_Id(userId);
        timeTransactionRepository.deleteAllByUser_Id(userId);
        skillRepository.deleteAllByOwner_Id(userId);
        userRepository.delete(user);
    }
}