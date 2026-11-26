package com.bananaskyrescue.backend.service;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class MfaEncryptionServiceTest {

    // Test-only key. Never use this as a production key.
    private static final String TEST_KEY =
        Base64.getEncoder().encodeToString(new byte[32]);

    private MfaEncryptionService createService() {
        return new MfaEncryptionService(TEST_KEY);
    }

    @Test
    void shouldEncryptAndDecryptSuccessfully() {

        MfaEncryptionService service = createService();

        String originalSecret = "JBSWY3DPEHPK3PXP";

        String encrypted = service.encrypt(originalSecret);

        String decrypted = service.decrypt(encrypted);

        assertEquals(originalSecret, decrypted);
    }

    @Test
    void shouldGenerateDifferentCiphertextEachTime() {

        MfaEncryptionService service = createService();

        String secret = "JBSWY3DPEHPK3PXP";

        String first = service.encrypt(secret);
        String second = service.encrypt(secret);

        assertNotEquals(first, second);
    }

    @Test
    void shouldRejectEmptySecret() {

        MfaEncryptionService service = createService();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> service.encrypt("")
        );

        assertEquals(
            "Secret cannot be empty.",
            exception.getMessage()
        );
    }

    @Test
    void shouldRejectEmptyEncryptedValue() {

        MfaEncryptionService service = createService();

        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> service.decrypt("")
        );

        assertEquals(
            "Encrypted secret cannot be empty.",
            exception.getMessage()
        );
    }

    @Test
    void shouldDetectTamperedEncryptedData() {

        MfaEncryptionService service = createService();

        String encrypted = service.encrypt("TEST_SECRET");

        byte[] encryptedBytes =
            Base64.getDecoder().decode(encrypted);

        encryptedBytes[encryptedBytes.length - 1] ^= 1;

        String tampered = Base64.getEncoder()
            .encodeToString(encryptedBytes);

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> service.decrypt(tampered)
        );

        assertEquals(
            "Unable to decrypt MFA secret.",
            exception.getMessage()
        );
    }

    @Test
    void shouldRejectIncorrectEncryptionKeyLength() {

        String invalidKey = Base64.getEncoder()
            .encodeToString(new byte[16]);

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> new MfaEncryptionService(invalidKey)
        );

        assertEquals(
            "MFA encryption key must contain exactly 32 bytes.",
            exception.getMessage()
        );
    }
}
