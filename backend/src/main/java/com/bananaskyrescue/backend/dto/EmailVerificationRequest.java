
package com.bananaskyrescue.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EmailVerificationRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email address")
        @Size(max = 254, message = "Email is too long")
        String email,

        @NotBlank(message = "OTP is required")
        @Pattern(
            regexp = "^[0-9]{6}$",
            message = "OTP must contain exactly six digits"
        )
        String otp

) {
}
