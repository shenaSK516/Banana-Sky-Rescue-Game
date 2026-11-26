
package com.bananaskyrescue.backend.service;

import java.util.OptionalLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class TotpServiceTest {

    private final TotpService service = new TotpService();

    // Test-only 160-bit Base32 secret.
    private static final String TEST_SECRET =
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    @Test
    void shouldGenerateValidSecret() {

        String secret = service.generateSecret();

        assertNotNull(secret);
        assertEquals(32, secret.length());

        assertNotEquals(
            secret,
            service.generateSecret()
        );
    }

    @Test
    void shouldGenerateSixDigitCode() {

        String code = service.generateCode(TEST_SECRET, 100);

        assertNotNull(code);
        assertTrue(code.matches("[0-9]{6}"));
    }

    @Test
    void shouldVerifyValidCode() {

        long timeStep = 100;

        String code = service.generateCode(
            TEST_SECRET,
            timeStep
        );

        OptionalLong result = service.verifyCode(
            TEST_SECRET,
            code,
            timeStep * 30
        );

        assertTrue(result.isPresent());
        assertEquals(timeStep, result.getAsLong());
    }

    @Test
    void shouldRejectInvalidCode() {

        OptionalLong result = service.verifyCode(
            TEST_SECRET,
            "123456",
            3000
        );

        assertTrue(result.isEmpty());
    }

    @Test
    void shouldRejectIncorrectCodeFormat() {

        assertTrue(
            service.verifyCode(TEST_SECRET, "12345").isEmpty()
        );

        assertTrue(
            service.verifyCode(TEST_SECRET, "1234567").isEmpty()
        );

        assertTrue(
            service.verifyCode(TEST_SECRET, "ABC123").isEmpty()
        );
    }

    @Test
    void shouldAcceptPreviousTimeStep() {

        long timeStep = 100;

        String code = service.generateCode(
            TEST_SECRET,
            timeStep - 1
        );

        OptionalLong result = service.verifyCode(
            TEST_SECRET,
            code,
            timeStep * 30
        );

        assertTrue(result.isPresent());
        assertEquals(timeStep - 1, result.getAsLong());
    }

    @Test
    void shouldAcceptNextTimeStep() {

        long timeStep = 100;

        String code = service.generateCode(
            TEST_SECRET,
            timeStep + 1
        );

        OptionalLong result = service.verifyCode(
            TEST_SECRET,
            code,
            timeStep * 30
        );

        assertTrue(result.isPresent());
        assertEquals(timeStep + 1, result.getAsLong());
    }

    @Test
    void shouldRejectCodeOutsideAllowedTimeWindow() {

        long timeStep = 100;

        String code = service.generateCode(
            TEST_SECRET,
            timeStep
        );

        OptionalLong result = service.verifyCode(
            TEST_SECRET,
            code,
            (timeStep + 2) * 30
        );

        assertTrue(result.isEmpty());
    }

    @Test
    void shouldRejectInvalidBase32Secret() {

        assertThrows(
            IllegalArgumentException.class,
            () -> service.generateCode("INVALID!", 100)
        );
    }

    @Test
    void shouldBuildValidAuthenticatorUri() {

        String uri = service.buildOtpAuthUri(
            "Banana Sky Rescue",
            "testplayer@example.com",
            TEST_SECRET
        );

        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("secret=" + TEST_SECRET));
        assertTrue(uri.contains("algorithm=SHA1"));
        assertTrue(uri.contains("digits=6"));
        assertTrue(uri.contains("period=30"));
    }
}
