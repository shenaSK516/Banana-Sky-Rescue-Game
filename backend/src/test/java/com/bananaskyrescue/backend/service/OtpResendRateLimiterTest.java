
package com.bananaskyrescue.backend.service;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class OtpResendRateLimiterTest {

    @Test
    void cleanupRemovesExpiredEntries() throws Exception {

        OtpResendRateLimiter limiter =
                new OtpResendRateLimiter();

        Field field = OtpResendRateLimiter.class
                .getDeclaredField("requests");

        field.setAccessible(true);

        @SuppressWarnings("unchecked")
        ConcurrentHashMap<String, Deque<Instant>> requests =
                (ConcurrentHashMap<String, Deque<Instant>>)
                        field.get(limiter);

        Deque<Instant> expired = new ArrayDeque<>();

        expired.add(
                Instant.now().minus(Duration.ofMinutes(20))
        );

        requests.put("expired-client", expired);

        limiter.cleanupExpiredRequests();

        assertFalse(requests.containsKey("expired-client"));
    }

    @Test
    void cleanupKeepsActiveEntries() throws Exception {

        OtpResendRateLimiter limiter =
                new OtpResendRateLimiter();

        Field field = OtpResendRateLimiter.class
                .getDeclaredField("requests");

        field.setAccessible(true);

        @SuppressWarnings("unchecked")
        ConcurrentHashMap<String, Deque<Instant>> requests =
                (ConcurrentHashMap<String, Deque<Instant>>)
                        field.get(limiter);

        Deque<Instant> active = new ArrayDeque<>();

        active.add(Instant.now());

        requests.put("active-client", active);

        limiter.cleanupExpiredRequests();

        assertTrue(requests.containsKey("active-client"));
    }


    @Test
    void shouldAllowFiveRequestsAndBlockSixth() {

        OtpResendRateLimiter limiter =
            new OtpResendRateLimiter();

        String clientA = "test-client-A";
        String clientB = "test-client-B";

        // First five requests must be allowed.
        for (int i = 0; i < 5; i++) {

            assertTrue(
                limiter.allowRequest(clientA),
                "Request " + (i + 1) + " should be allowed"
            );
        }

        // Sixth request must be blocked.
        assertFalse(
            limiter.allowRequest(clientA),
            "Sixth request should be blocked"
        );

        // Another client has an independent limit.
        assertTrue(
            limiter.allowRequest(clientB),
            "Different client should be allowed"
        );
    }


@Test
void shouldRejectMissingClientKeys() {

    OtpResendRateLimiter limiter =
            new OtpResendRateLimiter();

    assertFalse(
            limiter.allowRequest(null),
            "Null client key must be rejected"
    );

    assertFalse(
            limiter.allowRequest(""),
            "Empty client key must be rejected"
    );

    assertFalse(
            limiter.allowRequest("   "),
            "Blank client key must be rejected"
    );
}


}
