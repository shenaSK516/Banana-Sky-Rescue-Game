
package com.bananaskyrescue.backend.service;

import java.util.Locale;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class OtpResendService {

    private static final Logger logger =
            LoggerFactory.getLogger(OtpResendService.class);

    private final OtpService otpService;
    private final EmailService emailService;
    private final OtpResendRateLimiter rateLimiter;

    public OtpResendService(
            OtpService otpService,
            EmailService emailService,
            OtpResendRateLimiter rateLimiter) {

        this.otpService = otpService;
        this.emailService = emailService;
        this.rateLimiter = rateLimiter;
    }

    @Transactional
    public void resendVerificationOtp(
            String email,
            String clientKey) {

        // Apply request-level rate limiting first.
        if (!rateLimiter.allowRequest(
            clientKey == null ? null : "client:" + clientKey)) {
                return;
        }

        if (email == null || email.isBlank()) {
            return;
        }

        String normalizedEmail =
                email.trim().toLowerCase(Locale.ROOT);

        // Apply a separate limit for the target email address.
            if (!rateLimiter.allowRequest("email:" + normalizedEmail)) {
                return;
            }

        Optional<String> otpOptional =
                otpService.resendOtp(normalizedEmail);

        if (otpOptional.isEmpty()) {
            return;
        }

        String otp = otpOptional.get();

        // Send the email only after the transaction commits.
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {

                    @Override
                    public void afterCommit() {

                        try {
                            emailService.sendVerificationOtp(
                                    normalizedEmail,
                                    otp
                            );

                        } catch (MailException ex) {
                            logger.error(
                                    "OTP resend email delivery failed: {}",
                                    ex.getClass().getSimpleName()
                            );
                        }
                    }
                }
        );
    }
}
