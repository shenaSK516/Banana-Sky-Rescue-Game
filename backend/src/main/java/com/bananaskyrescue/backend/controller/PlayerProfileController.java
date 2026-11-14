
package com.bananaskyrescue.backend.controller;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.bananaskyrescue.backend.entity.Player;
import com.bananaskyrescue.backend.entity.PlayerLevelScore;
import com.bananaskyrescue.backend.repository.PlayerLevelScoreRepository;
import com.bananaskyrescue.backend.repository.PlayerRepository;
import com.bananaskyrescue.backend.service.PlayerAvatarStorageService;

@RestController
@RequestMapping("/api/profile")
public class PlayerProfileController {

    private final PlayerRepository playerRepository;
    private final PlayerLevelScoreRepository scoreRepository;
    private final PlayerAvatarStorageService avatarStorageService;


    public PlayerProfileController(
            PlayerRepository playerRepository,
            PlayerLevelScoreRepository scoreRepository,
            PlayerAvatarStorageService avatarStorageService) {

            this.playerRepository = playerRepository;
            this.scoreRepository = scoreRepository;
            this.avatarStorageService = avatarStorageService;
        }


    // GET LOGGED-IN PLAYER PROFILE

    @GetMapping("/me")
    public ResponseEntity<PlayerProfileResponse> getMyProfile(
            Authentication authentication) {

        if (
            authentication == null ||
            !authentication.isAuthenticated() ||
            "anonymousUser".equals(authentication.getPrincipal())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in to view your profile"
            );
        }

        // Identify player from authenticated session.
        String username = authentication.getName();

        Player player = playerRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Player account not found"
                        )
                );

        // Retrieve this player's personal-best level scores.
        List<PlayerLevelScore> savedScores =
                scoreRepository.findByPlayer_Id(player.getId());

        // CALCULATE PROFILE STATISTICS

        long overallScore = savedScores.stream()
                .mapToLong(PlayerLevelScore::getScore)
                .sum();

        int highestScore = savedScores.stream()
                .mapToInt(PlayerLevelScore::getScore)
                .max()
                .orElse(0);

        int completedLevels = savedScores.size();

        // Convert score records into safe response objects.
        List<LevelScoreSummary> levelScores =
                savedScores.stream()
                        .sorted(
                            Comparator.comparing(
                                PlayerLevelScore::getMainLevelId
                            ).thenComparing(
                                PlayerLevelScore::getSublevelId
                            )
                        )
                        .map(score ->
                                new LevelScoreSummary(
                                        score.getMainLevelId(),
                                        score.getSublevelId(),
                                        score.getScore(),
                                        score.getRescuedAnimals(),
                                        score.getActiveSeconds(),
                                        score.getRemainingEnergy()
                                )
                        )
                        .toList();

        // Determine whether the Animal Rescuer
        // achievement has been earned.
        boolean animalRescuerUnlocked =
                savedScores.stream()
                        .anyMatch(score ->
                                score.getRescuedAnimals() > 0
                        );

        // Return only appropriate player information.
        return ResponseEntity.ok(
                new PlayerProfileResponse(
                        player.getUsername(),
                        player.getDisplayName() != null
                            && !player.getDisplayName().isBlank()
                            ? player.getDisplayName()
                            : player.getUsername(),
                        player.getEmail(),
                        player.getCreatedAt(),
                        overallScore,
                        highestScore,
                        completedLevels,
                        animalRescuerUnlocked,
                        levelScores
                )
        );
    }

    // RESPONSE RECORDS

    public record LevelScoreSummary(
            int mainLevelId,
            int sublevelId,
            int bestScore,
            int rescuedAnimals,
            int activeSeconds,
            int remainingEnergy
    ) {}

    public record PlayerProfileResponse(
            String username,
            String displayName,
            String email,
            LocalDateTime joinedAt,
            long overallScore,
            int highestScore,
            int completedLevels,
            boolean animalRescuerUnlocked,
            List<LevelScoreSummary> levelScores
    ) {}


    // UPDATE PLAYER DISPLAY NAME

    public record UpdateDisplayNameRequest(
            String displayName
    ) {}

    public record UpdateDisplayNameResponse(
            String displayName,
            String message
    ) {}

    @PutMapping("/display-name")
    public ResponseEntity<UpdateDisplayNameResponse>
            updateDisplayName(
                    @RequestBody UpdateDisplayNameRequest request,
                    Authentication authentication) {

        // Ensure the player is logged in.
        if (
            authentication == null ||
            !authentication.isAuthenticated() ||
            "anonymousUser".equals(authentication.getPrincipal())
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in to update your profile"
            );
        }

        // Validate the submitted display name.
        if (request == null || request.displayName() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Display name is required"
            );
        }

        String newDisplayName = request.displayName().trim();

        if (
            newDisplayName.isEmpty() ||
            newDisplayName.length() > 40 ||
            newDisplayName.codePoints()
                    .anyMatch(Character::isISOControl)
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Display name must contain 1 to 40 valid characters"
            );
        }

        // Identify the authenticated account.
        Player player = playerRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Player account not found"
                        )
                );

        // Update only the public display name.
        // Login username and email remain unchanged.
        player.setDisplayName(newDisplayName);

        playerRepository.save(player);

        return ResponseEntity.ok(
                new UpdateDisplayNameResponse(
                        newDisplayName,
                        "Profile updated successfully"
                )
        );
    }


        // UPLOAD PLAYER PROFILE PICTURE

        public record AvatarUploadResponse(
                boolean uploaded,
                String message
        ) {}

        @PostMapping(
                value = "/avatar",
                consumes = MediaType.MULTIPART_FORM_DATA_VALUE
        )
        public ResponseEntity<AvatarUploadResponse> uploadAvatar(
                @RequestParam("file") MultipartFile file,
                Authentication authentication) {

            // Require a valid authenticated session.
            if (
                authentication == null ||
                !authentication.isAuthenticated() ||
                "anonymousUser".equals(
                        authentication.getPrincipal())
            ) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Please log in to upload a profile picture"
                );
            }

            // Identify the authenticated player.
            Player player = playerRepository
                    .findByUsername(authentication.getName())
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                 "Player account not found"
                            )
                    );

            // Validate, normalize and store the image.
            // The storage service creates a safe random filename.
            String filename = avatarStorageService.saveAvatar(file);

            // Save the image reference against this player.
            player.setAvatarFilename(filename);

            playerRepository.save(player);

            return ResponseEntity.ok(
                    new AvatarUploadResponse(
                        true,
                        "Profile picture uploaded successfully"
                    )
            );
        }



    // GET AUTHENTICATED PLAYER'S AVATAR

    @GetMapping(
            value = "/avatar",
            produces = MediaType.IMAGE_PNG_VALUE
    )
    public ResponseEntity<Resource> getMyAvatar(
            Authentication authentication) {

        // Require an authenticated player.
        if (
            authentication == null ||
            !authentication.isAuthenticated() ||
            "anonymousUser".equals(
                    authentication.getPrincipal()
            )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in to view your profile picture"
            );
        }

        // Identify the currently logged-in player.
        Player player = playerRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Player account not found"
                        )
                );

        String filename = player.getAvatarFilename();

        // No picture uploaded yet.
        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No profile picture uploaded"
            );
        }

        // Retrieve only this player's stored picture.
        Resource image = avatarStorageService.loadAvatar(
                filename
        );

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore())
                .body(image);
    }


}
