
package com.bananaskyrescue.backend.service;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.OptionalLong;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

@Service
public class TotpService {

    private static final char[] BASE32_ALPHABET =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();

    private static final int SECRET_LENGTH_BYTES = 20;

    private static final int TIME_STEP_SECONDS = 30;

    private static final int CODE_DIGITS = 6;

    private static final int ALLOWED_TIME_WINDOW = 1;

    private final SecureRandom secureRandom = new SecureRandom();

    // Generate a cryptographically secure Base32 secret.
    public String generateSecret() {

        byte[] secretBytes = new byte[SECRET_LENGTH_BYTES];

        secureRandom.nextBytes(secretBytes);

        return encodeBase32(secretBytes);
    }

    // Verify a six-digit authenticator code.
    public OptionalLong verifyCode(
            String secret,
            String code) {

        return verifyCode(
            secret,
            code,
            Instant.now().getEpochSecond()
        );
    }

    // Package-private overload for deterministic testing.
    OptionalLong verifyCode(
            String secret,
            String code,
            long epochSeconds) {

        if (code == null || !code.matches("[0-9]{6}")) {
            return OptionalLong.empty();
        }

        byte[] secretBytes = decodeBase32(secret);

        long currentTimeStep =
            Math.floorDiv(epochSeconds, TIME_STEP_SECONDS);

        for (
            long offset = -ALLOWED_TIME_WINDOW;
            offset <= ALLOWED_TIME_WINDOW;
            offset++
        ) {

            long candidateTimeStep = currentTimeStep + offset;

            if (candidateTimeStep < 0) {
                continue;
            }

            String expectedCode = generateCode(
                secretBytes,
                candidateTimeStep
            );

            boolean matches = MessageDigest.isEqual(
                expectedCode.getBytes(StandardCharsets.US_ASCII),
                code.getBytes(StandardCharsets.US_ASCII)
            );

            if (matches) {
                return OptionalLong.of(candidateTimeStep);
            }
        }

        return OptionalLong.empty();
    }

    // Build the URI used to create a Microsoft Authenticator QR code.
    public String buildOtpAuthUri(
            String issuer,
            String accountName,
            String secret) {

        if (
            issuer == null || issuer.isBlank() ||
            accountName == null || accountName.isBlank() ||
            secret == null || secret.isBlank()
        ) {
            throw new IllegalArgumentException(
                "Issuer, account name and secret are required."
            );
        }

        String encodedIssuer = encodeURIComponent(issuer);

        String encodedAccount = encodeURIComponent(accountName);

        String encodedLabel =
            encodedIssuer + ":" + encodedAccount;

        return "otpauth://totp/"
            + encodedLabel
            + "?secret=" + encodeURIComponent(secret)
            + "&issuer=" + encodedIssuer
            + "&algorithm=SHA1"
            + "&digits=6"
            + "&period=30";
    }

    // Generate a TOTP code for a specific time step.
    // Package-private so tests can generate deterministic codes.
    String generateCode(String secret, long timeStep) {

        return generateCode(
            decodeBase32(secret),
            timeStep
        );
    }

    private String generateCode(
            byte[] secretBytes,
            long timeStep) {

        try {

            byte[] timeCounter = ByteBuffer.allocate(8)
                .putLong(timeStep)
                .array();

            Mac mac = Mac.getInstance("HmacSHA1");

            SecretKeySpec key = new SecretKeySpec(
                secretBytes,
                "HmacSHA1"
            );

            mac.init(key);

            byte[] hash = mac.doFinal(timeCounter);

            int offset = hash[hash.length - 1] & 0x0F;

            int binaryCode =
                ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);

            int otp = binaryCode % 1_000_000;

            return String.format(
                Locale.ROOT,
                "%06d",
                otp
            );

        } catch (GeneralSecurityException ex) {

            throw new IllegalStateException(
                "Unable to generate authenticator code.",
                ex
            );
        }
    }

    // Encode bytes into Base32 without padding.
    private String encodeBase32(byte[] input) {

        StringBuilder output = new StringBuilder();

        int buffer = 0;
        int bitsLeft = 0;

        for (byte value : input) {

            buffer = (buffer << 8) | (value & 0xFF);

            bitsLeft += 8;

            while (bitsLeft >= 5) {

                bitsLeft -= 5;

                output.append(
                    BASE32_ALPHABET[
                        (buffer >> bitsLeft) & 0x1F
                    ]
                );
            }

            buffer &= (1 << bitsLeft) - 1;
        }

        if (bitsLeft > 0) {

            output.append(
                BASE32_ALPHABET[
                    (buffer << (5 - bitsLeft)) & 0x1F
                ]
            );
        }

        return output.toString();
    }

    // Decode a Base32 authenticator secret.
    private byte[] decodeBase32(String secret) {

        if (secret == null || secret.isBlank()) {

            throw new IllegalArgumentException(
                "Authenticator secret cannot be empty."
            );
        }

        String normalized = secret
            .replace("=", "")
            .replace(" ", "")
            .toUpperCase(Locale.ROOT);

        ByteArrayOutputStream output =
            new ByteArrayOutputStream();

        int buffer = 0;
        int bitsLeft = 0;

        for (char character : normalized.toCharArray()) {

            int value = -1;

            for (int i = 0; i < BASE32_ALPHABET.length; i++) {

                if (BASE32_ALPHABET[i] == character) {
                    value = i;
                    break;
                }
            }

            if (value < 0) {

                throw new IllegalArgumentException(
                    "Invalid Base32 authenticator secret."
                );
            }

            buffer = (buffer << 5) | value;

            bitsLeft += 5;

            if (bitsLeft >= 8) {

                bitsLeft -= 8;

                output.write(
                    (buffer >> bitsLeft) & 0xFF
                );
            }

            buffer &= (1 << bitsLeft) - 1;
        }

        byte[] decoded = output.toByteArray();

        if (decoded.length < 16) {

            throw new IllegalArgumentException(
                "Authenticator secret is too short."
            );
        }

        return decoded;
    }

    private String encodeURIComponent(String value) {

        return URLEncoder.encode(
            value,
            StandardCharsets.UTF_8
        ).replace("+", "%20");
    }
}
