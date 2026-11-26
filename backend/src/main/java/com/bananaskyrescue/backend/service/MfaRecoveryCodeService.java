package com.bananaskyrescue.backend.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bananaskyrescue.backend.entity.PlayerMfaRecoveryCode;
import com.bananaskyrescue.backend.repository.PlayerMfaRecoveryCodeRepository;

@Service
public class MfaRecoveryCodeService {

    private static final int NUMBER_OF_CODES = 10;

    private static final int CODE_LENGTH = 12;

    private static final char[] CODE_CHARACTERS =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final PlayerMfaRecoveryCodeRepository recoveryCodeRepository;

    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    public MfaRecoveryCodeService(
            PlayerMfaRecoveryCodeRepository recoveryCodeRepository,
            PasswordEncoder passwordEncoder) {

        this.recoveryCodeRepository = recoveryCodeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Generate 10 new recovery codes.
    // Only their BCrypt hashes are stored in the database.
    @Transactional
    public List<String> generateRecoveryCodes(Long playerId) {

        if (playerId == null) {
            throw new IllegalArgumentException(
                "Player ID is required."
            );
        }

        // Remove previous recovery codes.
        recoveryCodeRepository.deleteAllByPlayerId(playerId);

        List<String> plainCodes = new ArrayList<>();

        List<PlayerMfaRecoveryCode> entities =
            new ArrayList<>();

        for (int i = 0; i < NUMBER_OF_CODES; i++) {

            String rawCode = generateRandomCode();

            String formattedCode = formatCode(rawCode);

            PlayerMfaRecoveryCode recoveryCode =
                new PlayerMfaRecoveryCode();

            recoveryCode.setPlayerId(playerId);

            recoveryCode.setCodeHash(
                passwordEncoder.encode(rawCode)
            );

            entities.add(recoveryCode);

            // The original code is returned only once.
            plainCodes.add(formattedCode);
        }

        recoveryCodeRepository.saveAll(entities);

        return plainCodes;
    }

    // Verify and consume a recovery code.
    @Transactional
    public boolean verifyAndConsumeRecoveryCode(
            Long playerId,
            String submittedCode) {

        if (
            playerId == null ||
            submittedCode == null ||
            submittedCode.isBlank()
        ) {
            return false;
        }

        String normalizedCode = normalizeCode(submittedCode);

        if (
            normalizedCode.length() != CODE_LENGTH ||
            !normalizedCode.matches("[A-HJ-NP-Z2-9]{12}")
        ) {
            return false;
        }

        // Lock unused recovery codes during verification.
        List<PlayerMfaRecoveryCode> unusedCodes =
            recoveryCodeRepository
                .findUnusedByPlayerIdForUpdate(playerId);

        for (PlayerMfaRecoveryCode storedCode : unusedCodes) {

            if (
                passwordEncoder.matches(
                    normalizedCode,
                    storedCode.getCodeHash()
                )
            ) {

                // Mark the matched recovery code as used.
                storedCode.setUsedAt(LocalDateTime.now());

                recoveryCodeRepository.save(storedCode);

                return true;
            }
        }

        return false;
    }

    // Generate a cryptographically random 12-character code.
    private String generateRandomCode() {

        StringBuilder code = new StringBuilder(CODE_LENGTH);

        for (int i = 0; i < CODE_LENGTH; i++) {

            int index = secureRandom.nextInt(
                CODE_CHARACTERS.length
            );

            code.append(CODE_CHARACTERS[index]);
        }

        return code.toString();
    }

    // Format as XXXX-XXXX-XXXX for easier reading.
    private String formatCode(String code) {

        return code.substring(0, 4)
            + "-"
            + code.substring(4, 8)
            + "-"
            + code.substring(8, 12);
    }

    // Accept codes with or without hyphens and spaces.
    private String normalizeCode(String code) {

        return code.replace("-", "")
            .replaceAll("\\s", "")
            .toUpperCase(Locale.ROOT);
    }
}
