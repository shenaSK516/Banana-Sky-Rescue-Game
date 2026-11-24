
package com.bananaskyrescue.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.bananaskyrescue.backend.service.LeaderboardService;
import com.bananaskyrescue.backend.service.LeaderboardService.LeaderboardEntry;
import com.bananaskyrescue.backend.service.LeaderboardService.OverallLeaderboardEntry;

@RestController
@RequestMapping("/api/scores")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(
            LeaderboardService leaderboardService) {

        this.leaderboardService = leaderboardService;
    }

    // GET TOP 10 LEADERBOARD


    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> getLeaderboard(

            @RequestParam(defaultValue = "1")
            int mainLevelId,

            @RequestParam(defaultValue = "1")
            int sublevelId) {

        // Validate requested level.
        if (
            mainLevelId < 1 || mainLevelId > 4 ||
            sublevelId < 1 || sublevelId > 3
        ) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid level selection"
            );
        }

        List<LeaderboardEntry> leaderboard =
                leaderboardService.getTop10(
                    mainLevelId,
                    sublevelId
                );

        return ResponseEntity.ok(leaderboard);
    }


    // GET OVERALL LEADERBOARD

    @GetMapping("/overall")
    public ResponseEntity<List<OverallLeaderboardEntry>>
            getOverallLeaderboard() {

        List<OverallLeaderboardEntry> leaderboard =
                leaderboardService.getOverallTop10();

        return ResponseEntity.ok(leaderboard);
    }

}
