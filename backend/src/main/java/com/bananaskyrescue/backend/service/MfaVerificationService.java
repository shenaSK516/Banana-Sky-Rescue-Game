
package com.bananaskyrescue.backend.service;

import java.util.OptionalLong;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bananaskyrescue.backend.entity.PlayerMfa;
import com.bananaskyrescue.backend.repository.PlayerMfaRepository;

@Service
public class MfaVerificationService {

    private final PlayerMfaRepository playerMfaRepository;
    private final MfaEncryptionService encryptionService;
    private final TotpService totpService;
    private final MfaRecoveryCodeService recoveryCodeService;
    private final MfaAttemptService attemptService;

    public MfaVerificationService(
            PlayerMfaRepository playerMfaRepository,
            MfaEncryptionService encryptionService,
            TotpService totpService,
            MfaRecoveryCodeService recoveryCodeService,
            MfaAttemptService attemptService) {

        this.playerMfaRepository = playerMfaRepository;
        this.encryptionService = encryptionService;
        this.totpService = totpService;
        this.recoveryCodeService = recoveryCodeService;
        this.attemptService = attemptService;
    }

    @Transactional
    public boolean verifyTotpCode(Long playerId, String submittedCode) {

        if (playerId == null) {
            return false;
        }

        PlayerMfa mfa = playerMfaRepository
                .findByPlayerIdForUpdate(playerId)
                .orElse(null);

        if (mfa == null || !mfa.isEnabled()) {
            return false;
        }

        // Reject attempts while the MFA account is locked.
        if (attemptService.isLocked(mfa)) {
            playerMfaRepository.save(mfa);
            return false;
        }

        // Validate the submitted six-digit code.
        if (submittedCode == null ||
                !submittedCode.matches("\\d{6}")) {

            attemptService.recordFailure(mfa);
            playerMfaRepository.save(mfa);
            return false;
        }

        String secret = encryptionService.decrypt(
                mfa.getSecretEncrypted()
        );

        OptionalLong matchingTimeStep =
                totpService.verifyCode(secret, submittedCode);

        // Reject invalid authenticator codes.
        if (matchingTimeStep.isEmpty()) {

            attemptService.recordFailure(mfa);
            playerMfaRepository.save(mfa);
            return false;
        }

        long acceptedTimeStep = matchingTimeStep.getAsLong();

        Long lastUsedTimeStep = mfa.getLastUsedTimeStep();

        // Prevent reuse of an already accepted TOTP time step.
        if (lastUsedTimeStep != null &&
                acceptedTimeStep <= lastUsedTimeStep) {

            attemptService.recordFailure(mfa);
            playerMfaRepository.save(mfa);
            return false;
        }

        // Record the accepted TOTP time step.
        mfa.setLastUsedTimeStep(acceptedTimeStep);

        // Reset MFA failures after successful verification.
        attemptService.recordSuccess(mfa);

        playerMfaRepository.save(mfa);

        return true;
    }

    @Transactional
    public boolean verifyRecoveryCode(
            Long playerId,
            String submittedCode) {

        if (playerId == null) {
            return false;
        }

        PlayerMfa mfa = playerMfaRepository
                .findByPlayerIdForUpdate(playerId)
                .orElse(null);

        if (mfa == null || !mfa.isEnabled()) {
            return false;
        }

        // Reject recovery-code attempts while the account is locked.
        if (attemptService.isLocked(mfa)) {
            playerMfaRepository.save(mfa);
            return false;
        }

        // Verify and consume the recovery code.
        boolean verified =
                recoveryCodeService.verifyAndConsumeRecoveryCode(
                        playerId,
                        submittedCode
                );

        if (!verified) {

            attemptService.recordFailure(mfa);
            playerMfaRepository.save(mfa);

            return false;
        }

        // Reset failures after successful recovery-code verification.
        attemptService.recordSuccess(mfa);

        playerMfaRepository.save(mfa);

        return true;
    }
}
