package com.bananaskyrescue.backend.controller;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.repository.PlayerMfaRepository;
import com.bananaskyrescue.backend.security.PendingLoginService;
import com.bananaskyrescue.backend.service.PlayerAuthenticationService;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final PlayerAuthenticationService authenticationService;
    private final PlayerMfaRepository playerMfaRepository;
    private final PendingLoginService pendingLoginService;
    private final SecurityContextRepository securityContextRepository;

    public LoginController(
            PlayerAuthenticationService authenticationService,
            PlayerMfaRepository playerMfaRepository,
            PendingLoginService pendingLoginService,
            SecurityContextRepository securityContextRepository) {

        this.authenticationService = authenticationService;
        this.playerMfaRepository = playerMfaRepository;
        this.pendingLoginService = pendingLoginService;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(
            @RequestParam String username,
            @RequestParam String password,
            HttpServletRequest request,
            HttpServletResponse response) {

        // Clear any previous pending challenge.
        HttpSession existingSession = request.getSession(false);
        pendingLoginService.clear(existingSession);

        // Remove any previously authenticated session context.
        SecurityContextHolder.clearContext();

        SecurityContext emptyContext =
                SecurityContextHolder.createEmptyContext();

        SecurityContextHolder.setContext(emptyContext);

        securityContextRepository.saveContext(
                emptyContext,
                request,
                response
        );

        try {

            // Validate the username and password.
            // This does NOT create a fully authenticated session.
            Player player = authenticationService.authenticatePassword(
                    username,
                    password
            );

            // Create or retrieve the session and rotate its ID.
            HttpSession session = request.getSession(true);
            request.changeSessionId();

            // Check whether the player already has MFA enabled.
            boolean mfaEnabled = playerMfaRepository
                    .findByPlayerId(player.getId())
                    .map(mfa -> mfa.isEnabled())
                    .orElse(false);

            // Store only a temporary MFA challenge.
            pendingLoginService.start(
                    session,
                    player.getId(),
                    player.getUsername(),
                    !mfaEnabled
            );

            String status = mfaEnabled
                    ? "MFA_REQUIRED"
                    : "MFA_SETUP_REQUIRED";

            return ResponseEntity.ok(
                    Map.of("status", status)
            );

        } catch (AuthenticationException exception) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Invalid username or password, or account temporarily unavailable."
                    ));
        }
    }
}
