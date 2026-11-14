
package com.bananaskyrescue.backend.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class BananaPuzzleService {

    // =====================================
    // BANANA API CONFIGURATION
    // =====================================

    private static final String API_URL =
        "https://marcconrad.com/uob/banana/api.php?out=json&base64=no";

    private final HttpClient httpClient;
    private final JsonMapper jsonMapper;

    // =====================================
    // CONSTRUCTOR
    // =====================================

    public BananaPuzzleService(JsonMapper jsonMapper) {

        this.jsonMapper = jsonMapper;

        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    }

    // =====================================
    // FETCH PUZZLE FROM EXTERNAL API
    // =====================================

    public BananaPuzzle fetchPuzzle() {

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(API_URL))
            .timeout(Duration.ofSeconds(10))
            .header("Accept", "application/json")
            .GET()
            .build();

        try {

            // 1. Send request to Banana API.
            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );

            // 2. Verify HTTP response.
            if (response.statusCode() != 200) {
                throw new IllegalStateException(
                    "Banana API returned status: " +
                    response.statusCode()
                );
            }

            // 3. Parse the JSON response.
            JsonNode json = jsonMapper.readTree(
                response.body()
            );

            JsonNode question = json.get("question");
            JsonNode solution = json.get("solution");

            // 4. Validate response fields.
            // Jackson 3 uses isString() instead of isTextual().
            if (
                question == null ||
                !question.isString() ||
                solution == null ||
                !solution.isIntegralNumber()
            ) {
                throw new IllegalStateException(
                    "Invalid Banana API response"
                );
            }

            // 5. Extract image URL.
            // Jackson 3 uses asString() instead of asText().
            String imageUrl = question.asString();

            // 6. Ensure image URL uses HTTPS.
            if (!"https".equalsIgnoreCase(
                URI.create(imageUrl).getScheme()
            )) {
                throw new IllegalStateException(
                    "Invalid puzzle image URL"
                );
            }

            // 7. Return puzzle data internally.
            return new BananaPuzzle(
                imageUrl,
                solution.intValue()
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                "Banana API request interrupted", e
            );

        } catch (IOException e) {

            throw new IllegalStateException(
                "Failed to communicate with Banana API", e
            );
        }
    }

    // =====================================
    // INTERNAL PUZZLE DATA
    // =====================================

    // Used by the backend controller.
    // The solution must not be returned
    // directly to the game frontend.



    // =====================================
    // FETCH PUZZLE IMAGE THROUGH BACKEND
    // =====================================

    public byte[] fetchPuzzleImage(String imageUrl) {

        // Only allow images from the trusted
        // Banana API image provider.
        URI imageUri;

        try {
            imageUri = URI.create(imageUrl);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Invalid puzzle image URL", e
            );
        }

        if (
            !"https".equalsIgnoreCase(imageUri.getScheme()) ||
            !"www.sanfoh.com".equalsIgnoreCase(imageUri.getHost()) ||
            !imageUri.getPath().matches(
                "/uob/banana/data/[A-Za-z0-9_-]+\\.png"
            ) ||
            imageUri.getPort() != -1
        ) {
            throw new IllegalArgumentException(
                "Untrusted puzzle image URL"
            );
        }

        HttpRequest request = HttpRequest.newBuilder()
            .uri(imageUri)
            .timeout(Duration.ofSeconds(10))
            .header("Accept", "image/png")
            .GET()
            .build();

        try {
            // The default client does not follow redirects.
            HttpResponse<byte[]> response =
                HttpClient.newHttpClient().send(
                    request,
                    HttpResponse.BodyHandlers.ofByteArray()
                );

            if (response.statusCode() != 200) {
                throw new IllegalStateException(
                    "Puzzle image request failed: " +
                    response.statusCode()
                );
            }

            byte[] imageBytes = response.body();

            if (
                imageBytes.length == 0 ||
                imageBytes.length > 5_000_000
            ) {
                throw new IllegalStateException(
                    "Invalid puzzle image size"
                );
            }

            return imageBytes;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                "Puzzle image request interrupted", e
            );

        } catch (IOException e) {
            throw new IllegalStateException(
                "Unable to download puzzle image", e
            );
        }
    }


    public record BananaPuzzle(
        String imageUrl,
        int solution
    ) {}
}
