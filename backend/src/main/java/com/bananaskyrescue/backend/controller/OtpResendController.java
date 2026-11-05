
package com.bananaskyrescue.backend.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bananaskyrescue.backend.dto.ResendOtpRequest;
import com.bananaskyrescue.backend.service.ClientIdentificationService;
import com.bananaskyrescue.backend.service.OtpResendService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class OtpResendController {

    private final OtpResendService otpResendService;
    private final ClientIdentificationService clientIdentificationService;

    public OtpResendController(
            OtpResendService otpResendService,
            ClientIdentificationService clientIdentificationService) {

        this.otpResendService = otpResendService;
        this.clientIdentificationService = clientIdentificationService;
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(
            @Valid @RequestBody ResendOtpRequest request,
            HttpServletRequest httpRequest) {

        String clientKey =
                clientIdentificationService.getClientKey(httpRequest);

        otpResendService.resendVerificationOtp(
                request.email(),
                clientKey
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "If the email is eligible, a verification code will be sent."
                )
        );
    }
}
