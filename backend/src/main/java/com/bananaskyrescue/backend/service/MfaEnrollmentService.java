
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
public class MfaEnrollmentService {

    private static final String ISSUER = "Banana Sky Rescue";

    private final PlayerRepository playerRepository;
    private final PlayerMfaRepository playerMfaRepository;
    private final MfaEncryptionService encryptionService;
    private final TotpService totpService;
    private final MfaRecoveryCodeService recoveryCodeService;
    private final MfaAttemptService attemptService;

    public MfaEnrollmentService(
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

    @Transactional
    public String startEnrollment(Long playerId, String username) {

        if (playerId == null || username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Valid player details are required."
            );
        }

        Player player = getEligiblePlayer(playerId);

        if (!player.getUsername().equals(username)) {
            throw new IllegalStateException("Invalid enrollment request.");
        }

        PlayerMfa mfa = playerMfaRepository
                .findByPlayerIdForUpdate(playerId)
                .orElseGet(() -> {
                    PlayerMfa newMfa = new PlayerMfa();
                    newMfa.setPlayerId(playerId);
                    return newMfa;
                });

        if (mfa.isEnabled()) {
            throw new IllegalStateException("MFA is already enabled.");
        }

        if (attemptService.isLocked(mfa)) {
            throw new IllegalStateException(
                    "MFA is temporarily locked. Try again later."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // Reuse an existing valid enrollment secret.
        if (mfa.getEnrollmentExpiresAt() != null
                && now.isBefore(mfa.getEnrollmentExpiresAt())
                && mfa.getSecretEncrypted() != null
                && !mfa.getSecretEncrypted().isBlank()) {

            String existingSecret =
                    encryptionService.decrypt(mfa.getSecretEncrypted());

            return totpService.buildOtpAuthUri(
                    ISSUER,
                    username,
                    existingSecret
            );
        }

        // Generate a new secret if no valid enrollment exists.
        String secret = totpService.generateSecret();

        mfa.setSecretEncrypted(encryptionService.encrypt(secret));
        mfa.setEnabled(false);
        mfa.setEnrollmentExpiresAt(now.plusMinutes(5));
        mfa.setLastUsedTimeStep(null);

        playerMfaRepository.saveAndFlush(mfa);

        return totpService.buildOtpAuthUri(
                ISSUER,
                username,
                secret
        );
    }

    @Transactional(noRollbackFor = InvalidAuthenticatorCodeException.class)
    public List<String> confirmEnrollment(
            Long playerId,
            String submittedCode) {

        if (playerId == null) {
            throw new IllegalArgumentException(
                    "Player ID is required."
            );
        }

        // Lock and recheck the player account.
        getEligiblePlayer(playerId);

        PlayerMfa mfa = playerMfaRepository
                .findByPlayerIdForUpdate(playerId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "MFA enrollment was not started."
                        )
                );

        if (mfa.isEnabled()) {
            throw new IllegalStateException("MFA is already enabled.");
        }

        // Check persistent MFA lockout.
        if (attemptService.isLocked(mfa)) {
            throw new IllegalStateException(
                    "MFA is temporarily locked. Try again later."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        if (mfa.getEnrollmentExpiresAt() == null
                || !now.isBefore(mfa.getEnrollmentExpiresAt())) {

            throw new IllegalStateException(
                    "MFA enrollment has expired. Please start again."
            );
        }

        // Validate the submitted authenticator code.
        if (submittedCode == null
                || !submittedCode.matches("\\d{6}")) {

            recordInvalidEnrollmentAttempt(mfa);
        }

        String secret = encryptionService.decrypt(
                mfa.getSecretEncrypted()
        );

        OptionalLong matchingTimeStep =
                totpService.verifyCode(secret, submittedCode);

        if (matchingTimeStep.isEmpty()) {
            recordInvalidEnrollmentAttempt(mfa);
        }

        // Enable MFA only after successful verification.
        mfa.setEnabled(true);
        mfa.setEnrollmentExpiresAt(null);
        mfa.setLastUsedTimeStep(matchingTimeStep.getAsLong());

        attemptService.recordSuccess(mfa);

        playerMfaRepository.saveAndFlush(mfa);

        // Generate recovery codes only after successful confirmation.
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

    private void recordInvalidEnrollmentAttempt(PlayerMfa mfa) {

        attemptService.recordFailure(mfa);

        playerMfaRepository.saveAndFlush(mfa);

        throw new InvalidAuthenticatorCodeException(
                "Invalid authenticator code."
        );
    }

    public static class InvalidAuthenticatorCodeException
            extends IllegalArgumentException {

        public InvalidAuthenticatorCodeException(String message) {
            super(message);
        }
    }
}
