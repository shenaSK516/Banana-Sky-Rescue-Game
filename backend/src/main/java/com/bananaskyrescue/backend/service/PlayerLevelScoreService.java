
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

        // VALIDATE SUPPORTED LEVELS

        boolean isSunnySkies =
                mainLevelId == 1 &&
                sublevelId >= 1 &&
                sublevelId <= 3;

        boolean isWindyLevel1 =
                mainLevelId == 2 &&
                sublevelId == 1;

        if (!isSunnySkies && !isWindyLevel1) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Unsupported level or sublevel"
                );
        }

        // VALIDATE REQUIRED ANIMAL RESCUES

        // Sunny Skies 1/3: 1 animal
        // Sunny Skies 2/3: 2 animals
        // Sunny Skies 3/3: 3 animals

        int requiredRescues = sublevelId;

        if (rescuedAnimals != requiredRescues) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Incorrect number of rescued animals"
            );
        }


        // VALIDATE GAMEPLAY DURATION


        if (activeSeconds < 0 || activeSeconds > 3600) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid gameplay duration"
            );
        }

        // VALIDATE REMAINING BANANA ENERGY

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

        // WINDY HEIGHTS UNLOCK VALIDATION
        // Sunny Skies 3/3 must be completed first.

        if (mainLevelId == 2 && sublevelId == 1) {

        boolean sunnySkiesCompleted =
                progressRepository
                        .existsByPlayer_IdAndMainLevelIdAndSublevelId(
                                player.getId(),
                                1,
                                3
                        );

        if (!sunnySkiesCompleted) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Complete Sunny Skies 3/3 before Windy Heights"
                );
        }
        }

        // VALIDATE SUBLEVEL UNLOCKING

        // Level 1 has no prerequisite.
        // Level 2 requires Level 1 completion.
        // Level 3 requires Level 2 completion.

        if (sublevelId > 1) {

            boolean previousLevelCompleted =
                    progressRepository
                            .existsByPlayer_IdAndMainLevelIdAndSublevelId(
                                    player.getId(),
                                    mainLevelId,
                                    sublevelId - 1
                            );

            if (!previousLevelCompleted) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Complete the previous sublevel first"
                );
            }
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

            // Update only if the new score is better.
            newPersonalBest = scoreRecord.updateBestScore(
                    calculatedScore,
                    rescuedAnimals,
                    activeSeconds,
                    remainingEnergy
            );

        } else {

            // First successful completion of this sublevel.
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


        // SAVE PERSONAL BEST SCORE

        // Only save an initial or improved best score.
        if (newPersonalBest) {

            scoreRepository.save(scoreRecord);
        }

        // SAVE LEVEL COMPLETION PROGRESS

        // Completion is separate from personal best.
        // A successful replay must not create duplicate
        // completion records.

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

    // SCORE RESPONSE

    public record SavedScore(
            int mainLevelId,
            int sublevelId,
            int submittedScore,
            int bestScore,
            boolean newPersonalBest
    ) {}
}
