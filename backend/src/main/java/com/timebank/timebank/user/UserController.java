package com.timebank.timebank.user;

import com.timebank.timebank.user.dto.LoginRequest;
import com.timebank.timebank.user.dto.LoginResponse;
import com.timebank.timebank.user.dto.RegisterRequest;
import com.timebank.timebank.user.dto.ResendVerificationRequest;
import com.timebank.timebank.user.dto.UpdateUserProfileRequest;
import com.timebank.timebank.user.dto.UserDashboardResponse;
import com.timebank.timebank.user.dto.PublicUserProfileResponse;
import com.timebank.timebank.user.dto.UserProfileResponse;
import com.timebank.timebank.user.dto.UserResponse;
import com.timebank.timebank.mail.RegistrationMailService;
import com.timebank.timebank.user.dto.RegistrationOutcome;
import com.timebank.timebank.user.dto.VerifyEmailCodeRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserService userService;
    private final RegistrationMailService registrationMailService;

    public UserController(UserService userService, RegistrationMailService registrationMailService) {
        this.userService = userService;
        this.registrationMailService = registrationMailService;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest req) {
        RegistrationOutcome out = userService.register(req);
        if (out.isPendingSignup()) {
            PendingSignup p = out.pendingSignup();
            return ResponseEntity.ok(
                    new UserResponse(
                            p.getId(),
                            p.getFullName(),
                            p.getEmail(),
                            0,
                            true,
                            registrationMailService.isMailDeliveryEnabled(),
                            registrationMailService.isLocalCaptureSmtp()
                    )
            );
        }
        User saved = out.user();
        return ResponseEntity.ok(
                new UserResponse(
                        saved.getId(),
                        saved.getFullName(),
                        saved.getEmail(),
                        saved.getTimeCreditMinutes(),
                        !saved.isEmailVerified()
                )
        );
    }

    @PostMapping("/auth/verify-email")
    public ResponseEntity<LoginResponse> verifyEmailWithCode(
            @Valid @RequestBody VerifyEmailCodeRequest req
    ) {
        LoginResponse response = userService.verifyEmailWithCode(req.getEmail(), req.getCode());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/auth/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest req) {
        userService.resendVerificationEmail(req.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auth/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req) {
        LoginResponse response = userService.login(req);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<String> me(Authentication authentication) {
        return ResponseEntity.ok("Hello " + authentication.getName());
    }

    @GetMapping("/users/me/profile")
    public ResponseEntity<UserProfileResponse> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(
                userService.getMyProfile(authentication.getName())
        );
    }

    /**
     * Başka üyenin herkese açık profil özeti; giriş gerekir, e-posta/telefon dönmez.
     */
    @GetMapping("/users/{userId}/public")
    public ResponseEntity<PublicUserProfileResponse> getPublicUserProfile(
            @PathVariable UUID userId
    ) {
        return ResponseEntity.ok(userService.getPublicProfile(userId));
    }

    @PutMapping("/users/me/profile")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @Valid @RequestBody UpdateUserProfileRequest req,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                userService.updateMyProfile(authentication.getName(), req)
        );
    }

    @GetMapping("/users/me/dashboard")
    public ResponseEntity<UserDashboardResponse> getMyDashboard(Authentication authentication) {
        return ResponseEntity.ok(
                userService.getMyDashboard(authentication.getName())
        );
    }

    /** Hesap silme (REST). Ayrıca POST /api/users/me/delete desteklenir. */
    @DeleteMapping("/users/me")
    public ResponseEntity<Void> deleteMyAccount(Authentication authentication) {
        userService.deleteAccount(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/me/delete")
    public ResponseEntity<Void> deleteMyAccountPost(Authentication authentication) {
        userService.deleteAccount(authentication.getName());
        return ResponseEntity.noContent().build();
    }
}