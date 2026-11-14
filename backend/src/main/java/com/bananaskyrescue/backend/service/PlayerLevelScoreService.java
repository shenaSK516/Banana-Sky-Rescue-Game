
package com.bananaskyrescue.backend.service;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.entity.PlayerLevelScore;
import com.bananaskyrescue.backend.repository.PlayerLevelScoreRepository;
import com.bananaskyrescue.backend.repository.PlayerRepository;

@Service
public class PlayerLevelScoreService {

    private final PlayerRepository playerRepository;
    private final PlayerLevelScoreRepository scoreRepository;

    public PlayerLevelScoreService(
            PlayerRepository playerRepository,
            PlayerLevelScoreRepository scoreRepository) {

        this.playerRepository = playerRepository;
        this.scoreRepository = scoreRepository;
    }

    // SAVE PLAYER'S BEST LEVEL SCORE

    @Transactional
    public SavedScore saveLevelScore(
            String username,
            int mainLevelId,
            int sublevelId,
            int rescuedAnimals,
            int activeSeconds,
            int remainingEnergy) {

        // For now, only Sunny Skies 1/3 is playable.
        if (mainLevelId != 1 || sublevelId != 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Score saving is not enabled for this level"
            );
        }

        // Sunny Skies 1/3 requires one animal rescue.
        if (rescuedAnimals != 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The required animal rescue is incomplete"
            );
        }

        // Validate active gameplay duration.
        if (activeSeconds < 0 || activeSeconds > 3600) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid gameplay duration"
            );
        }

        // Validate remaining energy.
        if (remainingEnergy < 1 || remainingEnergy > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid remaining energy"
            );
        }

        // CALCULATE SCORE ON THE BACKEND

        int rescuePoints = rescuedAnimals * 100;

        int timeBonus = Math.max(
                0,
                500 - (5 * activeSeconds)
        );

        int energyBonus = remainingEnergy * 2;

        int calculatedScore =
                rescuePoints + timeBonus + energyBonus;

        // FIND THE AUTHENTICATED PLAYER

        Player player = playerRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Player account not found"
                        )
                );

        // FIND EXISTING PERSONAL BEST

        Optional<PlayerLevelScore> existingScore =
                scoreRepository
                .findByPlayer_IdAndMainLevelIdAndSublevelId(
                        player.getId(),
                        mainLevelId,
                        sublevelId
                );

        PlayerLevelScore scoreRecord;
        boolean newPersonalBest;

        if (existingScore.isPresent()) {

            // The player has completed this level before.
            scoreRecord = existingScore.get();

            newPersonalBest = scoreRecord.updateBestScore(
                    calculatedScore,
                    rescuedAnimals,
                    activeSeconds,
                    remainingEnergy
            );

        } else {

            // First completed score for this level.
            scoreRecord = new PlayerLevelScore(
                    player,
                    mainLevelId,
                    sublevelId,
                    calculatedScore,
                    rescuedAnimals,
                    activeSeconds,
                    remainingEnergy
            );

            newPersonalBest = true;
        }

        // Save only a first attempt or an improved score.
        if (newPersonalBest) {
            scoreRepository.save(scoreRecord);
        }

        // RETURN SCORE RESULT

        return new SavedScore(
                mainLevelId,
                sublevelId,
                calculatedScore,
                scoreRecord.getScore(),
                newPersonalBest
        );
    }

    public record SavedScore(
            int mainLevelId,
            int sublevelId,
            int submittedScore,
            int bestScore,
            boolean newPersonalBest
    ) {}
}
