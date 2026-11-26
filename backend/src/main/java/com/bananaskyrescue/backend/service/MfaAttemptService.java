
package com.bananaskyrescue.backend.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.bananaskyrescue.backend.entity.PlayerMfa;

@Service
public class MfaAttemptService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_MINUTES = 15;

    public boolean isLocked(PlayerMfa mfa) {

        if (mfa == null) {
            return true;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lockedUntil = mfa.getLockedUntil();

        if (lockedUntil == null) {
            return false;
        }

        if (now.isBefore(lockedUntil)) {
            return true;
        }

        // The previous lock has expired.
        resetAttempts(mfa);

        return false;
    }

    public void recordFailure(PlayerMfa mfa) {

        if (mfa == null) {
            throw new IllegalArgumentException("MFA record is required.");
        }

        int attempts = mfa.getFailedAttempts() + 1;

        mfa.setFailedAttempts(attempts);

        if (attempts >= MAX_FAILED_ATTEMPTS) {

            mfa.setLockedUntil(
                    LocalDateTime.now()
                            .plusMinutes(LOCK_DURATION_MINUTES)
            );
        }
    }

    public void recordSuccess(PlayerMfa mfa) {

        if (mfa == null) {
            throw new IllegalArgumentException("MFA record is required.");
        }

        resetAttempts(mfa);
    }

    private void resetAttempts(PlayerMfa mfa) {

        mfa.setFailedAttempts(0);
        mfa.setLockedUntil(null);
    }
}
