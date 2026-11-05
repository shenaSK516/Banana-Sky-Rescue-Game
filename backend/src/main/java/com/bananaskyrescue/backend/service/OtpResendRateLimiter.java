
package com.bananaskyrescue.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class OtpResendRateLimiter {

    private static final int MAX_REQUESTS = 5;

    private static final Duration WINDOW =
            Duration.ofMinutes(15);

    private final ConcurrentHashMap<String, Deque<Instant>>
            requests = new ConcurrentHashMap<>();

    public boolean allowRequest(String clientKey) {

        if (clientKey == null || clientKey.isBlank()) {
            return false;
        }

        Instant now = Instant.now();

        final boolean[] allowed = {false};

        requests.compute(clientKey, (key, timestamps) -> {

            if (timestamps == null) {
                timestamps = new ArrayDeque<>();
            }

            removeExpiredTimestamps(timestamps, now);

            if (timestamps.size() >= MAX_REQUESTS) {
                return timestamps;
            }

            timestamps.addLast(now);
            allowed[0] = true;

            return timestamps;
        });

        return allowed[0];
    }

    private void removeExpiredTimestamps(
            Deque<Instant> timestamps,
            Instant now) {

        Instant cutoff = now.minus(WINDOW);

        while (!timestamps.isEmpty()
                && !timestamps.peekFirst().isAfter(cutoff)) {

            timestamps.removeFirst();
        }
    }

    @Scheduled(fixedDelay = 300000)
    public void cleanupExpiredRequests() {

        Instant now = Instant.now();

        for (Map.Entry<String, Deque<Instant>> entry
                : requests.entrySet()) {

            requests.computeIfPresent(
                    entry.getKey(),
                    (key, timestamps) -> {

                        removeExpiredTimestamps(timestamps, now);

                        return timestamps.isEmpty()
                                ? null
                                : timestamps;
                    }
            );
        }
    }
}
