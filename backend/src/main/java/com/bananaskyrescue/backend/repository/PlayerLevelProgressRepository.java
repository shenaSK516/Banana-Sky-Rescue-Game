package com.bananaskyrescue.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bananaskyrescue.backend.entity.PlayerLevelProgress;

public interface PlayerLevelProgressRepository
        extends JpaRepository<PlayerLevelProgress, Long> {

    // Retrieve all completed sublevels for a specific player.
    List<PlayerLevelProgress> findByPlayer_Id(Long playerId);

    // Check whether a specific sublevel has been completed.
    boolean existsByPlayer_IdAndMainLevelIdAndSublevelId(
            Long playerId,
            Integer mainLevelId,
            Integer sublevelId
    );
}
