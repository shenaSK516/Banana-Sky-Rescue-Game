
package com.bananaskyrescue.backend.security;

import java.time.Instant;

public record PendingLogin(
        Long playerId,
        String username,
        boolean setupRequired,
        Instant expiresAt,
        int failedAttempts
) {
}
