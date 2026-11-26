
package com.bananaskyrescue.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.OptionalLong;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.entity.PlayerMfa;
import com.bananaskyrescue.backend.repository.PlayerMfaRepository;
import com.bananaskyrescue.backend.repository.PlayerRepository;

@Service
public class MfaReconnectService {

    private static final String ISSUER = "Banana Sky Rescue";

    private static final long EXPIRY_MINUTES = 5;

    private final PlayerRepository playerRepository;
    private final PlayerMfaRepository playerMfaRepository;
    private final MfaEncryptionService encryptionService;
    private final TotpService totpService;
    private final MfaRecoveryCodeService recoveryCodeService;
    private final MfaAttemptService attemptService;

    public MfaReconnectService(
            PlayerRepository playerRepository,
            PlayerMfaRepository playerMfaRepository,
            MfaEncryptionService encryptionService,
            TotpService totpService,
            MfaRecoveryCodeService recoveryCodeService,
            MfaAttemptService attemptService) {

        this.playerRepository = playerRepository;
        this.playerMfaRepository = playerMfaRepository;
        this.encryptionService = encryptionService;
        this.totpService = totpService;
        this.recoveryCodeService = recoveryCodeService;
        this.attemptService = attemptService;
    }

    // Start or resume authenticator replacement.
    // The controller must verify the player's password and
    // current MFA factor before calling this method.
    @Transactional
    public String startReplacement(
            Long playerId,
            String username) {

        if (playerId == null ||
                username == null ||
                username.isBlank()) {

            throw new IllegalArgumentException(
                    "Valid player details are required."
            );
        }

        Player player = getEligiblePlayer(playerId);

        if (!player.getUsername().equals(username)) {
            throw new IllegalStateException(
                    "Invalid replacement request."
            );
        }

        PlayerMfa mfa = playerMfaRepository
                .findByPlayerIdForUpdate(playerId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "MFA is not configured."
                        )
                );

        if (!mfa.isEnabled()) {
            throw new IllegalStateException(
                    "MFA is not enabled."
            );
        }

        if (attemptService.isLocked(mfa)) {
            throw new IllegalStateException(
                    "MFA is temporarily locked. Try again later."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // Reuse an unexpired replacement secret.
        if (mfa.getPendingEnrollmentExpiresAt() != null
                && now.isBefore(
                        mfa.getPendingEnrollmentExpiresAt())
                && mfa.getPendingSecretEncrypted() != null
                && !mfa.getPendingSecretEncrypted().isBlank()) {

            String existingSecret = encryptionService.decrypt(
                    mfa.getPendingSecretEncrypted()
            );

            return totpService.buildOtpAuthUri(
                    ISSUER,
                    username,
                    existingSecret
            );
        }

        // Generate a new temporary replacement secret.
        String newSecret = totpService.generateSecret();

        mfa.setPendingSecretEncrypted(
                encryptionService.encrypt(newSecret)
        );

        mfa.setPendingEnrollmentExpiresAt(
                now.plusMinutes(EXPIRY_MINUTES)
        );

        // Do not modify the active secret or enabled status.
        playerMfaRepository.saveAndFlush(mfa);

        return totpService.buildOtpAuthUri(
                ISSUER,
                username,
                newSecret
        );
    }

    // Confirm the new authenticator and activate it.
    @Transactional(
        noRollbackFor = InvalidReplacementCodeException.class
    )
    public List<String> confirmReplacement(
            Long playerId,
            String submittedCode) {

        if (playerId == null) {
            throw new IllegalArgumentException(
                    "Player ID is required."
            );
        }

        // Recheck and lock the player account.
        getEligiblePlayer(playerId);

        PlayerMfa mfa = playerMfaRepository
                .findByPlayerIdForUpdate(playerId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "MFA is not configured."
                        )
                );

        if (!mfa.isEnabled()) {
            throw new IllegalStateException(
                    "MFA is not enabled."
            );
        }

        if (attemptService.isLocked(mfa)) {
            throw new IllegalStateException(
                    "MFA is temporarily locked. Try again later."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // Check that replacement setup has not expired.
        if (mfa.getPendingEnrollmentExpiresAt() == null
                || !now.isBefore(
                        mfa.getPendingEnrollmentExpiresAt())
                || mfa.getPendingSecretEncrypted() == null
                || mfa.getPendingSecretEncrypted().isBlank()) {

            throw new IllegalStateException(
                    "Authenticator replacement has expired. "
                    + "Please start again."
            );
        }

        // Validate the submitted six-digit code.
        if (submittedCode == null
                || !submittedCode.matches("\\d{6}")) {

            recordInvalidReplacementAttempt(mfa);
        }

        // Decrypt the temporary replacement secret.
        String pendingSecret = encryptionService.decrypt(
                mfa.getPendingSecretEncrypted()
        );

        OptionalLong matchingTimeStep =
                totpService.verifyCode(
                        pendingSecret,
                        submittedCode
                );

        if (matchingTimeStep.isEmpty()) {
            recordInvalidReplacementAttempt(mfa);
        }

        // Activate the replacement only after successful verification.
        mfa.setSecretEncrypted(
                mfa.getPendingSecretEncrypted()
        );

        mfa.setPendingSecretEncrypted(null);
        mfa.setPendingEnrollmentExpiresAt(null);

        // The new secret has its own TOTP replay tracking.
        mfa.setLastUsedTimeStep(
                matchingTimeStep.getAsLong()
        );

        attemptService.recordSuccess(mfa);

        playerMfaRepository.saveAndFlush(mfa);

        // Generate new recovery codes only after successful replacement.
        // This also invalidates the previous recovery codes.
        return recoveryCodeService.generateRecoveryCodes(playerId);
    }

    private Player getEligiblePlayer(Long playerId) {

        Player player = playerRepository
                .findByIdForUpdate(playerId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Player account not found."
                        )
                );

        if (!player.isEmailVerified()) {
            throw new IllegalStateException(
                    "Email verification is required."
            );
        }

        LocalDateTime lockedUntil = player.getLockedUntil();

        if (lockedUntil != null
                && LocalDateTime.now().isBefore(lockedUntil)) {

            throw new IllegalStateException(
                    "Player account is temporarily locked."
            );
        }

        return player;
    }

    private void recordInvalidReplacementAttempt(PlayerMfa mfa) {

        attemptService.recordFailure(mfa);

        playerMfaRepository.saveAndFlush(mfa);

        throw new InvalidReplacementCodeException(
                "Invalid authenticator code."
        );
    }

    public static class InvalidReplacementCodeException
            extends IllegalArgumentException {

        public InvalidReplacementCodeException(String message) {
            super(message);
        }
    }
}
