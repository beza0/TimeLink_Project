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
import com.timebank.timebank.user.dto.UpdateUserProfileRequest;
import com.timebank.timebank.user.dto.UserDashboardResponse;
import com.timebank.timebank.common.EmailVerificationRequiredException;
import com.timebank.timebank.mail.RegistrationMailService;
import com.timebank.timebank.user.dto.PublicUserProfileResponse;
import com.timebank.timebank.user.dto.UserProfileResponse;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final RegistrationMailService registrationMailService;
    private final EntityManager entityManager;

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
                       RegistrationMailService registrationMailService,
                       EntityManager entityManager) {
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
        this.registrationMailService = registrationMailService;
        this.entityManager = entityManager;
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
            registrationMailService.sendVerificationCode(fullName, email, code);
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
                registrationMailService.sendVerificationCode(p.getFullName(), email, newCode);
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

        String token = jwtService.generateToken(
                user.getEmail(),
                user.getRole()
        );

        return new LoginResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole()
        );
    }

    public UserProfileResponse getMyProfile(String email) {
        User user = userRepository.findByEmail(email)
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
        User user = userRepository.findByEmail(email)
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
        User user = userRepository.findByEmail(email)
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
     * Kullanıcıyı ve ona bağlı tüm verileri siler: beceriler, talepler, mesajlar, yorumlar,
     * bildirimler, zaman işlemleri ve kullanıcı kaydı.
     */
    @Transactional
    public void deleteAccount(String emailRaw) {
        String email = emailRaw.trim().toLowerCase();
        clearPendingSignupForEmail(email);

        User user = userRepository.findByEmail(email).orElse(null);
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