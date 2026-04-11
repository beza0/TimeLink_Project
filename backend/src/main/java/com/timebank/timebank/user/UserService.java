package com.timebank.timebank.user;

import com.timebank.timebank.config.JwtService;
import com.timebank.timebank.exchange.ExchangeRequestRepository;
import com.timebank.timebank.skill.SkillRepository;
import com.timebank.timebank.user.dto.LoginRequest;
import com.timebank.timebank.user.dto.LoginResponse;
import com.timebank.timebank.user.dto.RegisterRequest;
import com.timebank.timebank.user.dto.UpdateUserProfileRequest;
import com.timebank.timebank.user.dto.UserDashboardResponse;
import com.timebank.timebank.user.dto.UserProfileResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SkillRepository skillRepository;
    private final ExchangeRequestRepository exchangeRequestRepository;

    public UserService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       SkillRepository skillRepository,
                       ExchangeRequestRepository exchangeRequestRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.skillRepository = skillRepository;
        this.exchangeRequestRepository = exchangeRequestRepository;
    }

    public User register(RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Bu email zaten kayıtlı.");
        }

        User user = new User();
        user.setFullName(req.getFullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole("USER");
        user.setTimeCreditMinutes(60); // başlangıç: 1 saat kredi

        return userRepository.save(user);
    }

    public LoginResponse login(LoginRequest req) {
        String email = req.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Email veya şifre hatalı"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email veya şifre hatalı");
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
}