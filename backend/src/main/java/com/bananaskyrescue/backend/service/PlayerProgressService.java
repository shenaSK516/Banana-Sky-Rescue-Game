
package com.bananaskyrescue.backend.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bananaskyrescue.backend.entity.PlayerLevelProgress;
import com.bananaskyrescue.backend.repository.PlayerLevelProgressRepository;

@Service
public class PlayerProgressService {

    private static final int MAIN_LEVEL_COUNT = 4;
    private static final int SUBLEVEL_COUNT = 3;

    private final PlayerLevelProgressRepository progressRepository;

    public PlayerProgressService(
            PlayerLevelProgressRepository progressRepository) {
        this.progressRepository = progressRepository;
    }

    @Transactional(readOnly = true)
    public List<MainLevelProgress> getPlayerProgress(Long playerId) {

        List<PlayerLevelProgress> records =
                progressRepository.findByPlayer_Id(playerId);

        Set<String> completedLevels = new HashSet<>();

        for (PlayerLevelProgress record : records) {
            completedLevels.add(
                    record.getMainLevelId() + ":" +
                    record.getSublevelId()
            );
        }

        List<MainLevelProgress> result = new ArrayList<>();

        boolean mainLevelUnlocked = true;

        for (int mainLevel = 1;
                mainLevel <= MAIN_LEVEL_COUNT;
                mainLevel++) {

            List<SublevelProgress> sublevels = new ArrayList<>();
            boolean allCompleted = true;

            for (int sublevel = 1;
                    sublevel <= SUBLEVEL_COUNT;
                    sublevel++) {

                boolean completed = completedLevels.contains(
                        mainLevel + ":" + sublevel
                );

                boolean unlocked =
                        mainLevelUnlocked &&
                        (sublevel == 1 ||
                         completedLevels.contains(
                                 mainLevel + ":" + (sublevel - 1)
                         ));

                sublevels.add(
                        new SublevelProgress(
                                sublevel,
                                unlocked,
                                completed
                        )
                );

                if (!completed) {
                    allCompleted = false;
                }
            }

            result.add(
                    new MainLevelProgress(
                            mainLevel,
                            mainLevelUnlocked,
                            sublevels
                    )
            );

            mainLevelUnlocked =
                    mainLevelUnlocked && allCompleted;
        }

        return result;
    }

    public record SublevelProgress(
            int sublevelId,
            boolean unlocked,
            boolean completed
    ) {}

    public record MainLevelProgress(
            int mainLevelId,
            boolean unlocked,
            List<SublevelProgress> sublevels
    ) {}
}
