
package com.bananaskyrescue.backend.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpSession;

@Service
public class PendingLoginService {

    private static final String SESSION_ATTRIBUTE = "PENDING_MFA_LOGIN";
    private static final Duration CHALLENGE_LIFETIME = Duration.ofMinutes(5);
    private static final int MAX_ATTEMPTS = 5;

    public void start(
            HttpSession session,
            Long playerId,
            String username,
            boolean setupRequired) {

        if (session == null || playerId == null ||
                username == null || username.isBlank()) {
            throw new IllegalArgumentException("Valid login details are required.");
        }

        PendingLogin pendingLogin = new PendingLogin(
                playerId,
                username,
                setupRequired,
                Instant.now().plus(CHALLENGE_LIFETIME),
                0
        );

        session.setAttribute(SESSION_ATTRIBUTE, pendingLogin);
    }

    public Optional<PendingLogin> getValid(HttpSession session) {

        if (session == null) {
            return Optional.empty();
        }

        Object stored = session.getAttribute(SESSION_ATTRIBUTE);

        if (!(stored instanceof PendingLogin pendingLogin)) {
            return Optional.empty();
        }

        if (!Instant.now().isBefore(pendingLogin.expiresAt())) {
            clear(session);
            return Optional.empty();
        }

        return Optional.of(pendingLogin);
    }

    public boolean recordFailedAttempt(HttpSession session) {

        Optional<PendingLogin> optional = getValid(session);

        if (optional.isEmpty()) {
            return false;
        }

        PendingLogin current = optional.get();
        int nextAttempt = current.failedAttempts() + 1;

        if (nextAttempt >= MAX_ATTEMPTS) {
            clear(session);
            return false;
        }

        PendingLogin updated = new PendingLogin(
                current.playerId(),
                current.username(),
                current.setupRequired(),
                current.expiresAt(),
                nextAttempt
        );

        session.setAttribute(SESSION_ATTRIBUTE, updated);
        return true;
    }

    public void clear(HttpSession session) {
        if (session != null) {
            session.removeAttribute(SESSION_ATTRIBUTE);
        }
    }
}
