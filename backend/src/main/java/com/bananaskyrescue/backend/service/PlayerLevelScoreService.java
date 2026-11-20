
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

    // SAVE COMPLETED LEVEL SCORE

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

        // STORM RESCUE: 1/3, 2/3, 3/3
        boolean isStormRescue =
                mainLevelId == 3 &&
                sublevelId >= 1 &&
                sublevelId <= 3;

        // RAINBOW VALLEY: 1/3, 2/3, 3/3
        boolean isRainbowValley =
                mainLevelId == 4 &&
                sublevelId >= 1 &&
                sublevelId <= 3;

        // Reject unsupported levels.
        if (
                !isSunnySkies &&
                !isWindyHeights &&
                !isStormRescue &&
                !isRainbowValley
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
        // 1/3 = 2 animals
        // 2/3 = 3 animals
        // 3/3 = 4 animals

        // RAINBOW VALLEY:
        // 1/3 = 3 animals
        // 2/3 = 3 animals
        // 3/3 = 4 animals

        int requiredRescues;

        if (isRainbowValley) {

            // Rainbow Valley 3/3 requires 4 rescues.
            // Rainbow Valley 1/3 and 2/3 require 3.

            requiredRescues =
                    sublevelId == 3 ? 4 : 3;

        } else if (isStormRescue) {

            requiredRescues = sublevelId + 1;

        } else {

            requiredRescues = sublevelId;
        }

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

        //VALIDATE REMAINING BANANA ENERGY

        if (remainingEnergy < 1 || remainingEnergy > 100) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid remaining energy"
            );
        }

        // CALCULATE SCORE ON BACKEND

        // 100 points for each rescued animal.
        int rescuePoints = rescuedAnimals * 100;

        // Time bonus decreases by 5 points
        // per active second.

        int timeBonus = Math.max(
                0,
                500 - (5 * activeSeconds)
        );

        // Remaining Banana Energy bonus.
        int energyBonus = remainingEnergy * 2;

        // Final calculated level score.
        int calculatedScore =
                rescuePoints +
                timeBonus +
                energyBonus;

        //FIND AUTHENTICATED PLAYER

        Player player = playerRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Player account not found"
                        )
                );

        // WINDY HEIGHTS UNLOCK VALIDATION

        // Windy Heights 1/3 requires
        // Sunny Skies 3/3 completion.

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

        // Storm Rescue 1/3 requires
        // Windy Heights 3/3 completion.

        if (mainLevelId == 3 && sublevelId == 1) {

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

        // RAINBOW VALLEY UNLOCK VALIDATION

        // Rainbow Valley 1/3 requires
        // Storm Rescue 3/3 completion.

        if (mainLevelId == 4 && sublevelId == 1) {

            boolean stormRescueCompleted =
                    progressRepository
                            .existsByPlayer_IdAndMainLevelIdAndSublevelId(
                                    player.getId(),
                                    3,
                                    3
                            );

            if (!stormRescueCompleted) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Complete Storm Rescue 3/3 before Rainbow Valley"
                );
            }
        }

        // VALIDATE SUBLEVEL UNLOCKING

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

        //FIND EXISTING PERSONAL BEST


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

            // Update only if the new score
            // is better than the saved best.

            newPersonalBest = scoreRecord.updateBestScore(
                    calculatedScore,
                    rescuedAnimals,
                    activeSeconds,
                    remainingEnergy
            );

        } else {

            // First successful completion
            // of this sublevel.

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

        // 12. SAVE PERSONAL BEST SCORE

        // Save initial score or improved best.


        if (newPersonalBest) {

            scoreRepository.save(scoreRecord);
        }

        // 13. SAVE LEVEL COMPLETION PROGRESS

        // Completion progress is separate
        // from personal-best score.

        // Avoid duplicate completion records.

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
