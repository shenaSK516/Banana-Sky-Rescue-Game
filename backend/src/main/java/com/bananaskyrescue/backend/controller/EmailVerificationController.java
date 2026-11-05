
package com.bananaskyrescue.backend.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bananaskyrescue.backend.dto.EmailVerificationRequest;
import com.bananaskyrescue.backend.service.OtpService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class EmailVerificationController {

    private final OtpService otpService;

    public EmailVerificationController(OtpService otpService) {
        this.otpService = otpService;
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(
            @Valid @RequestBody EmailVerificationRequest request) {

        boolean verified = otpService.verifyOtp(
                request.email(),
                request.otp()
        );

        if (!verified) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "Invalid or expired verification code."
                    )
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Email verified successfully."
                )
        );
    }
}
