
package com.bananaskyrescue.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(

    @NotBlank(message = "Username is required")
    @Pattern(
        regexp = "^[A-Za-z0-9_]{3,30}$",
        message = "Username must be 3-30 letters, numbers or underscores"
    )
    String username,

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 254, message = "Email is too long")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must contain at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+$",
        message = "Password must contain uppercase, lowercase and a number"
    )
    String password

) {}
