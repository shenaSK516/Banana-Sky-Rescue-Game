
package com.bananaskyrescue.backend.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class SessionController {

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentPlayer(
            Authentication authentication) {

        return ResponseEntity.ok(
            Map.of(
                "authenticated", true,
                "username", authentication.getName()
            )
        );
    }
}
