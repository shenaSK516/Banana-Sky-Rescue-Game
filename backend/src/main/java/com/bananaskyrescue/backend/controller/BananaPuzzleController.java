package com.bananaskyrescue.backend.controller;

import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.bananaskyrescue.backend.service.BananaPuzzleService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/banana-puzzles")
public class BananaPuzzleController {

    // =====================================
    // SESSION KEY
    // =====================================

    private static final String SESSION_KEY =
        "activeBananaPuzzle";

    private final BananaPuzzleService bananaPuzzleService;

    // =====================================
    // CONSTRUCTOR
    // =====================================

    public BananaPuzzleController(
        BananaPuzzleService bananaPuzzleService
    ) {
        this.bananaPuzzleService = bananaPuzzleService;
    }

    // =====================================
    // START BANANA PUZZLE
    // =====================================

    @PostMapping("/start")
    public PuzzleResponse startPuzzle(HttpSession session) {

        // Check whether an unanswered puzzle
        // already exists in the current session.
        ActivePuzzle active = (ActivePuzzle)
            session.getAttribute(SESSION_KEY);

        if (active == null) {

            // Request a mathematical puzzle
            // from the external Banana API.
            var puzzle = bananaPuzzleService.fetchPuzzle();

            // Create a unique puzzle identifier.
            active = new ActivePuzzle(
                UUID.randomUUID().toString(),
                puzzle.imageUrl(),
                puzzle.solution()
            );

            // Store the puzzle and correct answer
            // in the backend session.
            session.setAttribute(SESSION_KEY, active);
        }

        // Return only the puzzle ID and image URL.
        // Never expose the correct solution.
        return new PuzzleResponse(
            active.puzzleId(),
            active.imageUrl()
        );
    }

    // =====================================
    // SUBMIT BANANA PUZZLE ANSWER
    // =====================================

    @PostMapping("/submit")
    public PuzzleResult submitPuzzle(
        @RequestBody PuzzleSubmission request,
        HttpSession session
    ) {

        // =====================================
        // 1. VALIDATE USER INPUT
        // =====================================

        // Safely retrieve the submitted answer.
        Integer submittedAnswer =
            request == null ? null : request.answer();

        if (
            request == null ||
            request.puzzleId() == null ||
            request.puzzleId().isBlank() ||
            submittedAnswer == null
        ) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid puzzle submission"
            );
        }

        // =====================================
        // 2. RETRIEVE ACTIVE PUZZLE
        // =====================================

        ActivePuzzle active = (ActivePuzzle)
            session.getAttribute(SESSION_KEY);

        // Reject missing, expired, or mismatched
        // puzzle submissions.
        if (
            active == null ||
            !active.puzzleId().equals(request.puzzleId())
        ) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "No matching active puzzle"
            );
        }

        // =====================================
        // 3. VALIDATE THE ANSWER
        // =====================================

        // The submitted answer was already
        // checked for null above.
        boolean correct =
            submittedAnswer.equals(active.solution());

        // =====================================
        // 4. PREVENT REPEATED SUBMISSIONS
        // =====================================

        // Remove the active puzzle after one
        // submission, regardless of the answer.
        session.removeAttribute(SESSION_KEY);

        // =====================================
        // 5. CALCULATE ENERGY REWARD
        // =====================================

        // Correct answer: +20 Banana Energy.
        // Wrong answer: 0 Banana Energy.
        int energyReward = correct ? 20 : 0;

        // =====================================
        // 6. RETURN THE RESULT
        // =====================================

        return new PuzzleResult(
            correct,
            energyReward
        );
    }



    // =====================================
    // FETCH BANANA PUZZLE IMAGE
    // =====================================

    @GetMapping("/{puzzleId}/image")
    public ResponseEntity<byte[]> getPuzzleImage(
        @PathVariable String puzzleId,
        HttpSession session
    ) {

        // 1. Retrieve the current player's puzzle.
        ActivePuzzle active = (ActivePuzzle)
            session.getAttribute(SESSION_KEY);

        // 2. Verify that the requested puzzle
        // belongs to this authenticated session.
        if (
            active == null ||
            !active.puzzleId().equals(puzzleId)
        ) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Puzzle image not found"
            );
        }

        // 3. Download image through Spring Boot.
        // The service validates the trusted image URL.
        byte[] imageBytes =
            bananaPuzzleService.fetchPuzzleImage(
                active.imageUrl()
            );

        // 4. Return the PNG image to Phaser.
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .cacheControl(CacheControl.noStore())
            .body(imageBytes);
    }


    // =====================================
    // DATA TRANSFER OBJECTS
    // =====================================

    // Puzzle information sent to the frontend.
    // Correct solution is intentionally excluded.
    public record PuzzleResponse(
        String puzzleId,
        String imageUrl
    ) {}

    // Answer submitted by the player.
    public record PuzzleSubmission(
        String puzzleId,
        Integer answer
    ) {}

    // Answer-validation result.
    public record PuzzleResult(
        boolean correct,
        int energyReward
    ) {}

    // =====================================
    // INTERNAL SESSION PUZZLE
    // =====================================

    // Stores the correct answer on the backend.
    // This record is not returned to the frontend.
    private record ActivePuzzle(
        String puzzleId,
        String imageUrl,
        int solution
    ) {}
}
