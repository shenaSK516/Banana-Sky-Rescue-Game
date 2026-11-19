
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

        // VALIDATE MAIN LEVEL AND SUBLEVEL

        // SUNNY SKIES: 1/3, 2/3, 3/3
        boolean isSunnySkies =
                mainLevelId == 1 &&
                sublevelId >= 1 &&
                sublevelId <= 3;

        // WINDY HEIGHTS: 1/3, 2/3, 3/3
        boolean isWindyHeights =
                mainLevelId == 2 &&
                sublevelId >= 1 &&
                sublevelId <= 3;

        // STORM RESCUE: 1/3
        boolean isStormRescueLevel1 =
                mainLevelId == 3 &&
                sublevelId == 1;

        // Reject unsupported levels
        if (
                !isSunnySkies &&
                !isWindyHeights &&
                !isStormRescueLevel1
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported level or sublevel"
            );
        }

        // VALIDATE REQUIRED ANIMAL RESCUES

        // SUNNY SKIES:
        // 1/3 = 1 animal
        // 2/3 = 2 animals
        // 3/3 = 3 animals

        // WINDY HEIGHTS:
        // 1/3 = 1 animal
        // 2/3 = 2 animals
        // 3/3 = 3 animals

        // STORM RESCUE:
        // 1/3 = 2 animals (Fox + Rabbit)

        int requiredRescues =
                isStormRescueLevel1
                        ? 2
                        : sublevelId;

        if (rescuedAnimals != requiredRescues) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Incorrect number of rescued animals"
            );
        }

        // ==========================================
        // 3. VALIDATE GAMEPLAY DURATION
        // ==========================================

        if (activeSeconds < 0 || activeSeconds > 3600) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid gameplay duration"
            );
        }

        //VALIDATE REMAINING BANANA ENERGY

        if (remainingEnergy < 1 || remainingEnergy > 100) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid remaining energy"
            );
        }

        //CALCULATE SCORE ON THE BACKEND

        int rescuePoints = rescuedAnimals * 100;

        int timeBonus = Math.max(
                0,
                500 - (5 * activeSeconds)
        );

        int energyBonus = remainingEnergy * 2;

        int calculatedScore =
                rescuePoints + timeBonus + energyBonus;

        // 6. FIND AUTHENTICATED PLAYER

        Player player = playerRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Player account not found"
                        )
                );


        // 7. WINDY HEIGHTS UNLOCK VALIDATION

        // Windy Heights 1/3 requires completion
        // of Sunny Skies 3/3.

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

        // STORM RESCUE UNLOCK VALIDATION


        // Storm Rescue 1/3 requires completion
        // of Windy Heights 3/3.

        if (isStormRescueLevel1) {

            boolean windyHeightsCompleted =
                    progressRepository
                            .existsByPlayer_IdAndMainLevelIdAndSublevelId(
                                    player.getId(),
                                    2,
                                    3
                            );

            if (!windyHeightsCompleted) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Complete Windy Heights 3/3 before Storm Rescue"
                );
            }
        }

        // VALIDATE SUBLEVEL UNLOCKING

        // Sublevel 1 has no same-world prerequisite.
        // Sublevel 2 requires Sublevel 1 completion.
        // Sublevel 3 requires Sublevel 2 completion.

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

            // Update only if new score is better.
            newPersonalBest = scoreRecord.updateBestScore(
                    calculatedScore,
                    rescuedAnimals,
                    activeSeconds,
                    remainingEnergy
            );

        } else {

            // First successful level completion.
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

        if (newPersonalBest) {

            scoreRepository.save(scoreRecord);
        }

        // ==========================================
        // 12. SAVE LEVEL COMPLETION PROGRESS
        // ==========================================

        // Save completion separately from personal best.
        // Replaying a completed level should not
        // create duplicate completion records.

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

        // ==========================================
        // 13. RETURN SAVED SCORE RESULT
        // ==========================================

        return new SavedScore(
                mainLevelId,
                sublevelId,
                calculatedScore,
                scoreRecord.getScore(),
                newPersonalBest
        );
    }

    // ==========================================
    // SCORE RESPONSE
    // ==========================================

    public record SavedScore(
            int mainLevelId,
            int sublevelId,
            int submittedScore,
            int bestScore,
            boolean newPersonalBest
    ) {}
}
