
package com.bananaskyrescue.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.bananaskyrescue.backend.dto.RegistrationRequest;
import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.repository.PlayerRepository;

@Service
public class RegistrationService {

    private final PlayerRepository playerRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final EmailService emailService;
    private static final Logger logger =
        LoggerFactory.getLogger(RegistrationService.class);

    public RegistrationService(
            PlayerRepository playerRepository,
            PasswordEncoder passwordEncoder,
            OtpService otpService,
            EmailService emailService) {

        this.playerRepository = playerRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
        this.emailService = emailService;
    }

    @Transactional
    public void register(RegistrationRequest request) {

        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();

        if (playerRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username is already taken");
        }

        if (playerRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        Player player = new Player();
        player.setUsername(username);
        player.setEmail(email);
        player.setPasswordHash(
            passwordEncoder.encode(request.password())
        );
        player.setEmailVerified(false);

        Player savedPlayer = playerRepository.save(player);

        String otp = otpService.generateOtp(savedPlayer);

        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    emailService.sendVerificationOtp(email, otp);
                } catch (MailException ex) {
                    logger.error(
                        "Verification email delivery failed for player ID {}",
                        savedPlayer.getId(),
                        ex
                    );
                }
            }
            }
        );
    }
}
