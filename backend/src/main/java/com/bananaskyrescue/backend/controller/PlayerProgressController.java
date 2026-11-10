
package com.bananaskyrescue.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.repository.PlayerRepository;
import com.bananaskyrescue.backend.service.PlayerProgressService;
import com.bananaskyrescue.backend.service.PlayerProgressService.MainLevelProgress;

@RestController
@RequestMapping("/api/progress")
public class PlayerProgressController {

    private final PlayerRepository playerRepository;
    private final PlayerProgressService progressService;

    public PlayerProgressController(
            PlayerRepository playerRepository,
            PlayerProgressService progressService) {

        this.playerRepository = playerRepository;
        this.progressService = progressService;
    }

    @GetMapping
    public ResponseEntity<List<MainLevelProgress>> getProgress(
            Authentication authentication) {

        String username = authentication.getName();

        Player player = playerRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Authenticated player not found"
                        )
                );

        List<MainLevelProgress> progress =
                progressService.getPlayerProgress(player.getId());

        return ResponseEntity.ok(progress);
    }
}
