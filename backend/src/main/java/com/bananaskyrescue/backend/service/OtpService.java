
package com.bananaskyrescue.backend.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bananaskyrescue.backend.entity.EmailVerificationOtp;
import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.repository.EmailVerificationOtpRepository;
import com.bananaskyrescue.backend.repository.PlayerRepository;

@Service
public class OtpService {

    private static final int MAX_ATTEMPTS = 5;
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_RESENDS = 3;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int RECOVERY_WINDOW_MINUTES = 30;

    private final EmailVerificationOtpRepository otpRepository;
    private final PlayerRepository playerRepository;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(
            EmailVerificationOtpRepository otpRepository,
            PasswordEncoder passwordEncoder,
            PlayerRepository playerRepository) {

        this.otpRepository = otpRepository;
        this.passwordEncoder = passwordEncoder;
        this.playerRepository = playerRepository;
    }

    // Generate the initial OTP during registration only.
    @Transactional
    public String generateOtp(Player player) {

        String otp = generateSecureOtp();

        EmailVerificationOtp record = otpRepository
                .findByPlayerId(player.getId())
                .orElseGet(EmailVerificationOtp::new);

        LocalDateTime now = LocalDateTime.now();

        record.setPlayer(player);
        record.setOtpHash(passwordEncoder.encode(otp));
        record.setExpiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES));
        record.setAttempts(0);
        record.setResendCount(0);
        record.setLastSentAt(now);

        otpRepository.save(record);

        return otp;
    }

    // Resend an OTP or begin a new verification cycle
    // after the recovery waiting period.
    @Transactional
    public Optional<String> resendOtp(String email) {

        if (email == null || email.isBlank()) {
            return Optional.empty();
        }

        String normalizedEmail =
                email.trim().toLowerCase(Locale.ROOT);

        Optional<Player> playerOptional =
                playerRepository.findByEmailForUpdate(normalizedEmail);

        if (playerOptional.isEmpty()) {
            return Optional.empty();
        }

        Player player = playerOptional.get();

        if (player.isEmailVerified()) {
            return Optional.empty();
        }

        Optional<EmailVerificationOtp> otpOptional =
                otpRepository.findByPlayerIdForUpdate(player.getId());

        if (otpOptional.isEmpty()) {
            return Optional.empty();
        }

        EmailVerificationOtp record = otpOptional.get();

        LocalDateTime now = LocalDateTime.now();

        // Enforce the minimum delay between OTP sends.
        if (record.getLastSentAt() != null &&
                now.isBefore(
                        record.getLastSentAt()
                                .plusSeconds(RESEND_COOLDOWN_SECONDS))) {
            return Optional.empty();
        }

        // createdAt marks the start of the first cycle.
        // After a recovery, lastSentAt may mark a later cycle,
        // so this version derives the next recovery eligibility
        // from the record's timestamps.
        LocalDateTime cycleStart = record.getCreatedAt();

        if (cycleStart == null) {
            return Optional.empty();
        }

        boolean recoveryWindowElapsed =
                !now.isBefore(
                        cycleStart.plusMinutes(RECOVERY_WINDOW_MINUTES));

        boolean attemptsExhausted =
                record.getAttempts() >= MAX_ATTEMPTS;

        boolean resendsExhausted =
                record.getResendCount() >= MAX_RESENDS;

        if (!recoveryWindowElapsed &&
                (attemptsExhausted || resendsExhausted)) {
            return Optional.empty();
        }

        String otp = generateSecureOtp();

        if (recoveryWindowElapsed) {

            // Begin a fresh verification cycle.
            record.setAttempts(0);
            record.setResendCount(0);

            // The existing createdAt column is managed by @PrePersist.
            // It must also be updated when a recovery cycle begins.
            record.setCreatedAt(now);

        } else {
            record.setResendCount(record.getResendCount() + 1);
        }

        record.setOtpHash(passwordEncoder.encode(otp));
        record.setExpiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES));
        record.setLastSentAt(now);

        otpRepository.save(record);

        return Optional.of(otp);
    }

    // Verify a submitted six-digit OTP.
    @Transactional
    public boolean verifyOtp(String email, String submittedOtp) {

        if (email == null || submittedOtp == null ||
                !submittedOtp.matches("\\d{6}")) {
            return false;
        }

        String normalizedEmail =
                email.trim().toLowerCase(Locale.ROOT);

        Optional<Player> playerOptional =
                playerRepository.findByEmailForUpdate(normalizedEmail);

        if (playerOptional.isEmpty()) {
            return false;
        }

        Player player = playerOptional.get();

        if (player.isEmailVerified()) {
            return false;
        }

        Optional<EmailVerificationOtp> otpOptional =
                otpRepository.findByPlayerIdForUpdate(player.getId());

        if (otpOptional.isEmpty()) {
            return false;
        }

        EmailVerificationOtp record = otpOptional.get();

        if (!LocalDateTime.now().isBefore(record.getExpiresAt())) {
            return false;
        }

        if (record.getAttempts() >= MAX_ATTEMPTS) {
            return false;
        }

        if (!passwordEncoder.matches(
                submittedOtp,
                record.getOtpHash())) {

            record.setAttempts(record.getAttempts() + 1);
            otpRepository.save(record);

            return false;
        }

        player.setEmailVerified(true);
        playerRepository.save(player);

        otpRepository.delete(record);

        return true;
    }

    private String generateSecureOtp() {

        return String.format(
                "%06d",
                secureRandom.nextInt(1_000_000)
        );
    }
}
