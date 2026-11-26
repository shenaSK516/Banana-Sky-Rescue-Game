
package com.bananaskyrescue.backend.service;

import java.time.LocalDateTime;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.repository.PlayerRepository;

@Service
public class PlayerUserDetailsService
        implements UserDetailsService {

    private final PlayerRepository playerRepository;

    public PlayerUserDetailsService(
            PlayerRepository playerRepository) {

        this.playerRepository = playerRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        if (username == null || username.isBlank()) {
            throw new UsernameNotFoundException(
                    "Invalid username or password"
            );
        }

        Player player = playerRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "Invalid username or password"
                        )
                );

        boolean accountNotLocked =
                player.getLockedUntil() == null ||
                !LocalDateTime.now().isBefore(
                        player.getLockedUntil()
                );

        return User.withUsername(player.getUsername())
                .password(player.getPasswordHash())
                .authorities("ROLE_PLAYER")
                .disabled(!player.isEmailVerified())
                .accountLocked(!accountNotLocked)
                .build();
    }
}
