
package com.bananaskyrescue.backend.service;

import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.entity.PlayerLevelProgress;
import com.bananaskyrescue.backend.entity.PlayerLevelScore;
import com.bananaskyrescue.backend.repository.PlayerLevelProgressRepository;
import com.bananaskyrescue.backend.repository.PlayerLevelScoreRepository;
import com.bananaskyrescue.backend.repository.PlayerRepository;

@Service
public class PlayerLevelScoreService {

    private final PlayerRepository playerRepository;
    private final PlayerLevelScoreRepository scoreRepository;

    // Repository for tracking completed levels.
    private final PlayerLevelProgressRepository progressRepository;

    public PlayerLevelScoreService(
            PlayerRepository playerRepository,
            PlayerLevelScoreRepository scoreRepository,
            PlayerLevelProgressRepository progressRepository) {

        this.playerRepository = playerRepository;
        this.scoreRepository = scoreRepository;
        this.progressRepository = progressRepository;
    }

    // SAVE PLAYER'S COMPLETED LEVEL SCORE

    @Transactional
    public SavedScore saveLevelScore(
            String username,
            int mainLevelId,
            int sublevelId,
            int rescuedAnimals,
            int activeSeconds,
            int remainingEnergy) {


        // Currently supported Sunny Skies sublevels.
        if (mainLevelId != 1 ||
                (sublevelId != 1 && sublevelId != 2)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Score saving is not enabled for this level"
            );
        }

        // Required number of rescues for each sublevel.
        int requiredRescues = sublevelId == 1 ? 1 : 2;

        if (rescuedAnimals != requiredRescues) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The required animal rescues are incomplete"
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

        // FIND AUTHENTICATED PLAYER


        Player player = playerRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Player account not found"
                        )
                );


        // Level 2 must not be submitted before Level 1
        // has been completed by this player.
        if (sublevelId == 2 &&
                !progressRepository
                    .existsByPlayer_IdAndMainLevelIdAndSublevelId(
                        player.getId(), 1, 1
                    )) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Complete Sunny Skies 1/3 first"
            );
        }


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

            scoreRecord = existingScore.get();

            newPersonalBest = scoreRecord.updateBestScore(
                    calculatedScore,
                    rescuedAnimals,
                    activeSeconds,
                    remainingEnergy
            );

        } else {

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

        // Only save an initial or improved best score.
        if (newPersonalBest) {
            scoreRepository.save(scoreRecord);
        }

        // SAVE LEVEL COMPLETION PROGRESS

        // Completion is separate from personal best.
        // Even a lower-scoring successful replay
        // should count as a completed level.

        boolean alreadyCompleted =
                progressRepository
                        .existsByPlayer_IdAndMainLevelIdAndSublevelId(
                                player.getId(),
                                mainLevelId,
                                sublevelId
                        );

        if (!alreadyCompleted) {

            PlayerLevelProgress completedLevel =
                    new PlayerLevelProgress(
                            player,
                            mainLevelId,
                            sublevelId
                    );

            progressRepository.save(completedLevel);
        }

        // RETURN SAVED SCORE RESULT

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
