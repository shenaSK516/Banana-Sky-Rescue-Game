package com.bananaskyrescue.backend.service;

import java.time.LocalDateTime;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.repository.PlayerRepository;

@Service
public class PlayerAuthenticationService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_MINUTES = 15;

    private final PlayerRepository playerRepository;
    private final AuthenticationManager authenticationManager;

    public PlayerAuthenticationService(
            PlayerRepository playerRepository,
            AuthenticationManager authenticationManager) {

        this.playerRepository = playerRepository;
        this.authenticationManager = authenticationManager;
    }

    @Transactional(noRollbackFor = BadCredentialsException.class)
    public Player authenticatePassword(
            String username,
            String password) {

        if (username == null || username.isBlank()
                || password == null || password.isBlank()) {

            throw new BadCredentialsException(
                    "Invalid username or password."
            );
        }

        Player player = playerRepository
                .findByUsernameForUpdate(username)
                .orElseThrow(() ->
                        new BadCredentialsException(
                                "Invalid username or password."
                        )
                );

        LocalDateTime now = LocalDateTime.now();

        // Check whether the account is currently locked.
        if (player.getLockedUntil() != null) {

            if (now.isBefore(player.getLockedUntil())) {
                throw new LockedException(
                        "Account is temporarily locked."
                );
            }

            // The previous lock has expired.
            player.setFailedLoginAttempts(0);
            player.setLockedUntil(null);
        }

        try {

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            username,
                            password
                    )
            );

        } catch (BadCredentialsException exception) {

            int attempts = player.getFailedLoginAttempts() + 1;

            player.setFailedLoginAttempts(attempts);

            if (attempts >= MAX_FAILED_ATTEMPTS) {

                player.setLockedUntil(
                        now.plusMinutes(LOCK_DURATION_MINUTES)
                );
            }

            playerRepository.saveAndFlush(player);

            throw new BadCredentialsException(
                    "Invalid username or password."
            );
        }

        // Password authentication succeeded.
        player.setFailedLoginAttempts(0);
        player.setLockedUntil(null);

        return playerRepository.save(player);
    }
}
