package com.bananaskyrescue.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.repository.PlayerRepository;
import com.bananaskyrescue.backend.security.PendingLogin;
import com.bananaskyrescue.backend.security.PendingLoginService;
import com.bananaskyrescue.backend.service.MfaEnrollmentService;
import com.bananaskyrescue.backend.service.MfaReconnectService;
import com.bananaskyrescue.backend.service.MfaVerificationService;
import com.bananaskyrescue.backend.service.PlayerAuthenticationService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/auth/mfa")
public class MfaController {

        private final MfaEnrollmentService enrollmentService;
        private final PendingLoginService pendingLoginService;
        private final UserDetailsService userDetailsService;
        private final SecurityContextRepository securityContextRepository;
        private final MfaVerificationService verificationService;
        private final MfaReconnectService reconnectService;
        private final PlayerAuthenticationService playerAuthenticationService;
        private final PlayerRepository playerRepository;

    public MfaController(
                MfaEnrollmentService enrollmentService,
        PendingLoginService pendingLoginService,
        UserDetailsService userDetailsService,
        SecurityContextRepository securityContextRepository,
        MfaVerificationService verificationService,
        MfaReconnectService reconnectService,
        PlayerAuthenticationService playerAuthenticationService,
        PlayerRepository playerRepository
        ) {

        this.enrollmentService = enrollmentService;
        this.pendingLoginService = pendingLoginService;
        this.userDetailsService = userDetailsService;
        this.securityContextRepository = securityContextRepository;
        this.verificationService = verificationService;
        this.reconnectService = reconnectService;
        this.playerAuthenticationService = playerAuthenticationService;
        this.playerRepository = playerRepository;
    }

    // Start first-time MFA enrollment
    @PostMapping("/enrollment/start")
    public ResponseEntity<?> startEnrollment(HttpServletRequest request) {

        Optional<PendingLogin> optional =
                pendingLoginService.getValid(request.getSession(false));

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Login challenge expired."));
        }

        PendingLogin pending = optional.get();

        if (!pending.setupRequired()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "MFA setup is not required."));
        }

        try {

            String otpAuthUri = enrollmentService.startEnrollment(
                    pending.playerId(),
                    pending.username()
            );

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .body(Map.of(
                            "status", "MFA_SETUP_STARTED",
                            "otpauthUri", otpAuthUri
                    ));

        } catch (IllegalStateException exception) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // Confirm first-time MFA enrollment
    @PostMapping("/enrollment/confirm")
    public ResponseEntity<?> confirmEnrollment(
            @RequestParam String code,
            HttpServletRequest request,
            HttpServletResponse response) {

        HttpSession session = request.getSession(false);

        Optional<PendingLogin> optional =
                pendingLoginService.getValid(session);

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Login challenge expired."));
        }

        PendingLogin pending = optional.get();

        if (!pending.setupRequired()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "MFA setup is not required."));
        }

        try {

            // Check whether the account is still available.
            UserDetails userDetails =
                    userDetailsService.loadUserByUsername(pending.username());

            if (!isAccountAvailable(userDetails)) {

                pendingLoginService.clear(session);
                SecurityContextHolder.clearContext();

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Account is not available."));
            }

            // Confirm enrollment and generate recovery codes.
            List<String> recoveryCodes =
                    enrollmentService.confirmEnrollment(
                            pending.playerId(),
                            code
                    );

            // Establish the authenticated session.
            establishAuthenticatedSession(
                    userDetails,
                    request,
                    response
            );

            pendingLoginService.clear(session);

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .body(Map.of(
                            "status", "MFA_SETUP_COMPLETED",
                            "recoveryCodes", recoveryCodes
                    ));

        } catch (UsernameNotFoundException exception) {

            pendingLoginService.clear(session);
            SecurityContextHolder.clearContext();

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Account is not available."));

        } catch (IllegalArgumentException exception) {

            pendingLoginService.recordFailedAttempt(session);

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid authenticator code."));

        } catch (IllegalStateException exception) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    // Verify MFA for players who have already enabled it
    @PostMapping("/verify")
    public ResponseEntity<?> verifyMfa(
            @RequestParam String code,
            @RequestParam(defaultValue = "TOTP") String method,
            HttpServletRequest request,
            HttpServletResponse response) {

        HttpSession session = request.getSession(false);

        Optional<PendingLogin> optional =
                pendingLoginService.getValid(session);

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Login challenge expired."));
        }

        PendingLogin pending = optional.get();

        if (pending.setupRequired()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "MFA setup is required."));
        }

        // Validate the requested verification method.
        if (!"TOTP".equals(method) && !"RECOVERY".equals(method)) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid verification method."));
        }

        // Check account availability BEFORE consuming an MFA code.
        UserDetails userDetails;

        try {

            userDetails =
                    userDetailsService.loadUserByUsername(pending.username());

        } catch (UsernameNotFoundException exception) {

            pendingLoginService.clear(session);
            SecurityContextHolder.clearContext();

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Account is not available."));
        }

        if (!isAccountAvailable(userDetails)) {

            pendingLoginService.clear(session);
            SecurityContextHolder.clearContext();

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Account is not available."));
        }

        // Verify the selected MFA method.
        boolean verified;

        if ("TOTP".equals(method)) {

            verified = verificationService.verifyTotpCode(
                    pending.playerId(),
                    code
            );

        } else {

            verified = verificationService.verifyRecoveryCode(
                    pending.playerId(),
                    code
            );
        }

        if (!verified) {

            boolean attemptsRemaining =
                    pendingLoginService.recordFailedAttempt(session);

            if (!attemptsRemaining) {

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Login challenge expired or maximum attempts reached."
                        ));
            }

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid verification code."));
        }

        // MFA verification succeeded. Establish the authenticated session.
        establishAuthenticatedSession(
                userDetails,
                request,
                response
        );

        pendingLoginService.clear(session);

        return ResponseEntity.ok(Map.of(
                "status", "MFA_VERIFIED",
                "message", "Login successful."
        ));
    }


    // Start secure authenticator replacement
    @PostMapping("/reconnect/start")
    public ResponseEntity<?> startReconnect(
            @RequestParam String password,
            @RequestParam String code,
            @RequestParam(defaultValue = "TOTP") String method,
            Authentication authentication) {

        // Require a fully authenticated player session.
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetails currentUser)) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Authentication required."
                    ));
        }

        String username = currentUser.getUsername();

        // Validate the selected MFA method.
        if (!"TOTP".equals(method) && !"RECOVERY".equals(method)) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid verification method."
                    ));
        }

        try {

            // Step 1: Verify the player's password.
            Player player =
                    playerAuthenticationService.authenticatePassword(
                            username,
                            password
                    );

            // Step 2: Verify the player's CURRENT MFA factor.
            boolean verified;

            if ("TOTP".equals(method)) {

                verified = verificationService.verifyTotpCode(
                        player.getId(),
                        code
                );

            } else {

                verified = verificationService.verifyRecoveryCode(
                        player.getId(),
                        code
                );
            }

            if (!verified) {

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Invalid current authenticator code."
                        ));
            }

            // Step 3: Start replacement using the authenticated player's ID.
            String otpAuthUri = reconnectService.startReplacement(
                    player.getId(),
                    player.getUsername()
            );

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .body(Map.of(
                            "status", "MFA_RECONNECT_STARTED",
                            "otpauthUri", otpAuthUri,
                            "expiresIn", 300
                    ));

        } catch (AuthenticationException exception) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Password verification failed."
                    ));

        } catch (IllegalStateException exception) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            exception.getMessage()
                    ));
        }
    }


    // Check whether the player account is still valid
    private boolean isAccountAvailable(UserDetails userDetails) {

        return userDetails.isEnabled()
                && userDetails.isAccountNonLocked()
                && userDetails.isAccountNonExpired()
                && userDetails.isCredentialsNonExpired();
    }


    // Confirm and activate the replacement authenticator
    @PostMapping("/reconnect/confirm")
    public ResponseEntity<?> confirmReconnect(
            @RequestParam String code,
            Authentication authentication) {

        // Require a fully authenticated player session.
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof UserDetails currentUser)) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Authentication required."
                    ));
        }

        String username = currentUser.getUsername();

        try {

            // Recheck the player's account availability.
            UserDetails userDetails =
                    userDetailsService.loadUserByUsername(username);

            if (!isAccountAvailable(userDetails)) {

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Account is not available."
                        ));
            }

            // Retrieve the player using the authenticated username.
            Player player = playerRepository
                    .findByUsername(username)
                    .orElseThrow(() ->
                            new IllegalStateException(
                                    "Player account not found."
                            )
                    );

            // Verify the NEW authenticator and activate it.
            List<String> recoveryCodes =
                    reconnectService.confirmReplacement(
                            player.getId(),
                            code
                    );

            // Return new recovery codes only after successful replacement.
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .body(Map.of(
                            "status", "MFA_RECONNECT_COMPLETED",
                            "message", "Authenticator successfully replaced.",
                            "recoveryCodes", recoveryCodes
                    ));

        } catch (
                MfaReconnectService.InvalidReplacementCodeException exception) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid new authenticator code."
                    ));

        } catch (UsernameNotFoundException exception) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Account is not available."
                    ));

        } catch (IllegalStateException exception) {

            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            exception.getMessage()
                    ));
        }
    }


    // Create the authenticated session after successful MFA
    private void establishAuthenticatedSession(
            UserDetails userDetails,
            HttpServletRequest request,
            HttpServletResponse response) {

        // Change the session ID to protect against session fixation.
        request.changeSessionId();

        Authentication authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);

        SecurityContextHolder.setContext(context);

        securityContextRepository.saveContext(
                context,
                request,
                response
        );
    }
}
