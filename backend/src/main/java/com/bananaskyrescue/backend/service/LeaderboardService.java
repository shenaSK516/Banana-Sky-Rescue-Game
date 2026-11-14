
package com.bananaskyrescue.backend.service;

import java.util.List;
import java.util.stream.IntStream;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bananaskyrescue.backend.entity.PlayerLevelScore;
import com.bananaskyrescue.backend.repository.PlayerLevelScoreRepository;

@Service
public class LeaderboardService {

    private final PlayerLevelScoreRepository scoreRepository;

    public LeaderboardService(
            PlayerLevelScoreRepository scoreRepository) {
        this.scoreRepository = scoreRepository;
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getTop10(
            int mainLevelId,
            int sublevelId) {

        // Retrieve the top 10 best scores from MySQL.
        List<PlayerLevelScore> scores =
                scoreRepository
                    .findTop10ByMainLevelIdAndSublevelIdOrderByScoreDescAchievedAtAsc(
                        mainLevelId,
                        sublevelId
                    );

        // Convert database records into safe API responses.
        return IntStream.range(0, scores.size())
                .mapToObj(index -> {

                    PlayerLevelScore score = scores.get(index);

                    return new LeaderboardEntry(
                        index + 1,
                        score.getPlayer().getUsername(),
                        score.getScore(),
                        score.getRescuedAnimals(),
                        score.getActiveSeconds(),
                        score.getRemainingEnergy()
                    );

                })
                .toList();
    }

    public record LeaderboardEntry(
            int rank,
            String username,
            int score,
            int rescuedAnimals,
            int activeSeconds,
            int remainingEnergy
    ) {}



    // GET TOP 10 OVERALL PLAYERS

    @Transactional(readOnly = true)
    public List<OverallLeaderboardEntry> getOverallTop10() {

        // Retrieve only the Top 10 from MySQL.
        List<Object[]> results =
                scoreRepository.findOverallLeaderboard(
                        PageRequest.of(0, 10)
                );

        return IntStream.range(0, results.size())
                .mapToObj(index -> {

                    Object[] row = results.get(index);

                    String username = (String) row[0];

                    long totalScore =
                            ((Number) row[1]).longValue();

                    long levelsCompleted =
                            ((Number) row[2]).longValue();

                    return new OverallLeaderboardEntry(
                            index + 1,
                            username,
                            totalScore,
                            levelsCompleted
                    );
                })
                .toList();
    }

    public record OverallLeaderboardEntry(
            int rank,
            String username,
            long totalScore,
            long levelsCompleted
    ) {}

}
