
package com.bananaskyrescue.backend.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MfaEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";

    private static final int KEY_LENGTH_BYTES = 32;

    private static final int NONCE_LENGTH_BYTES = 12;

    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec secretKey;

    private final SecureRandom secureRandom = new SecureRandom();

    public MfaEncryptionService(
            @Value("${MFA_ENCRYPTION_KEY:}") String encodedKey) {

        if (encodedKey == null || encodedKey.isBlank()) {
            throw new IllegalStateException(
                "MFA encryption key is not configured."
            );
        }

        byte[] keyBytes;

        try {
            keyBytes = Base64.getDecoder().decode(encodedKey);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException(
                "MFA encryption key is not valid Base64."
            );
        }

        if (keyBytes.length != KEY_LENGTH_BYTES) {
            Arrays.fill(keyBytes, (byte) 0);

            throw new IllegalStateException(
                "MFA encryption key must contain exactly 32 bytes."
            );
        }

        this.secretKey = new SecretKeySpec(keyBytes, "AES");

        Arrays.fill(keyBytes, (byte) 0);
    }

    // Encrypt an authenticator secret.
    public String encrypt(String plainText) {

        if (plainText == null || plainText.isBlank()) {
            throw new IllegalArgumentException(
                "Secret cannot be empty."
            );
        }

        try {
            byte[] nonce = new byte[NONCE_LENGTH_BYTES];

            secureRandom.nextBytes(nonce);

            Cipher cipher = Cipher.getInstance(ALGORITHM);

            GCMParameterSpec parameterSpec =
                new GCMParameterSpec(TAG_LENGTH_BITS, nonce);

            cipher.init(
                Cipher.ENCRYPT_MODE,
                secretKey,
                parameterSpec
            );

            byte[] encryptedData = cipher.doFinal(
                plainText.getBytes(StandardCharsets.UTF_8)
            );

            ByteBuffer buffer = ByteBuffer.allocate(
                nonce.length + encryptedData.length
            );

            buffer.put(nonce);
            buffer.put(encryptedData);

            return Base64.getEncoder().encodeToString(
                buffer.array()
            );

        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException(
                "Unable to encrypt MFA secret."
            );
        }
    }

    // Decrypt a previously encrypted authenticator secret.
    public String decrypt(String encryptedValue) {

        if (encryptedValue == null || encryptedValue.isBlank()) {
            throw new IllegalArgumentException(
                "Encrypted secret cannot be empty."
            );
        }

        try {
            byte[] combined = Base64.getDecoder().decode(
                encryptedValue
            );

            if (combined.length < NONCE_LENGTH_BYTES + 16) {
                throw new IllegalArgumentException(
                    "Invalid encrypted secret."
                );
            }

            ByteBuffer buffer = ByteBuffer.wrap(combined);

            byte[] nonce = new byte[NONCE_LENGTH_BYTES];

            buffer.get(nonce);

            byte[] encryptedData = new byte[buffer.remaining()];

            buffer.get(encryptedData);

            Cipher cipher = Cipher.getInstance(ALGORITHM);

            GCMParameterSpec parameterSpec =
                new GCMParameterSpec(TAG_LENGTH_BITS, nonce);

            cipher.init(
                Cipher.DECRYPT_MODE,
                secretKey,
                parameterSpec
            );

            byte[] decryptedData = cipher.doFinal(encryptedData);

            return new String(
                decryptedData,
                StandardCharsets.UTF_8
            );

        } catch (GeneralSecurityException |
                 IllegalArgumentException ex) {

            throw new IllegalStateException(
                "Unable to decrypt MFA secret."
            );
        }
    }
}
