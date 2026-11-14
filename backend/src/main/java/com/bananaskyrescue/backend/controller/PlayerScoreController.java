
package com.bananaskyrescue.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.bananaskyrescue.backend.service.PlayerLevelScoreService;
import com.bananaskyrescue.backend.service.PlayerLevelScoreService.SavedScore;

@RestController
@RequestMapping("/api/scores")
public class PlayerScoreController {

    private final PlayerLevelScoreService scoreService;

    public PlayerScoreController(
            PlayerLevelScoreService scoreService) {

        this.scoreService = scoreService;
    }

    // REQUEST DATA

    public record CompleteLevelRequest(
            Integer mainLevelId,
            Integer sublevelId,
            Integer rescuedAnimals,
            Integer activeSeconds,
            Integer remainingEnergy
    ) {}

    // SAVE COMPLETED LEVEL SCORE

    @PostMapping("/complete")
    public ResponseEntity<SavedScore> completeLevel(
            @RequestBody CompleteLevelRequest request,
            Authentication authentication) {

        // Ensure player is authenticated.
        if (
            authentication == null ||
            !authentication.isAuthenticated() ||
            "anonymousUser".equals(authentication.getPrincipal())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in to save your score"
            );
        }

        // Check that all required values are supplied.
        if (
            request.mainLevelId() == null ||
            request.sublevelId() == null ||
            request.rescuedAnimals() == null ||
            request.activeSeconds() == null ||
            request.remainingEnergy() == null
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Missing required score information"
            );
        }

        // Obtain username from Spring Security.
        // Never trust a player ID sent by the browser.
        String username = authentication.getName();

        // Service validates statistics,
        // calculates the score and saves personal best.
        SavedScore savedScore =
                scoreService.saveLevelScore(
                        username,
                        request.mainLevelId(),
                        request.sublevelId(),
                        request.rescuedAnimals(),
                        request.activeSeconds(),
                        request.remainingEnergy()
                );

        return ResponseEntity.ok(savedScore);
    }
}
