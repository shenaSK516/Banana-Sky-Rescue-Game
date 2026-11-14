
package com.bananaskyrescue.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.bananaskyrescue.backend.entity.PlayerLevelScore;

public interface PlayerLevelScoreRepository
        extends JpaRepository<PlayerLevelScore, Long> {

    // Retrieve a player's best score for a level.
    Optional<PlayerLevelScore>
        findByPlayer_IdAndMainLevelIdAndSublevelId(
            Long playerId,
            Integer mainLevelId,
            Integer sublevelId
        );

    // Get Top 10 players for a specific level.
    List<PlayerLevelScore>
        findTop10ByMainLevelIdAndSublevelIdOrderByScoreDescAchievedAtAsc(
            Integer mainLevelId,
            Integer sublevelId
        );

    // Get all saved scores for a player's profile.
    List<PlayerLevelScore> findByPlayer_Id(Long playerId);


    // OVERALL LEADERBOARD

    @Query("""
        SELECT
            p.username,
            SUM(s.score),
            COUNT(s.id)
        FROM PlayerLevelScore s
        JOIN s.player p
        GROUP BY p.id, p.username
        ORDER BY
            SUM(s.score) DESC,
            COUNT(s.id) DESC,
            p.username ASC
        """)
    List<Object[]> findOverallLeaderboard(Pageable pageable);

}
