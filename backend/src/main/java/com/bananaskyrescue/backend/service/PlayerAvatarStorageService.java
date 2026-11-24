
package com.bananaskyrescue.backend.service;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PlayerAvatarStorageService {

    private static final long MAX_FILE_SIZE = 2L * 1024 * 1024;
    private static final int MAX_DIMENSION = 2048;

    private final Path storageDirectory;

    public PlayerAvatarStorageService(
            @Value("${app.profile.avatar-dir:uploads/profile-avatars}")
            String directory) {

        this.storageDirectory =
                Path.of(directory).toAbsolutePath().normalize();

        try {
            Files.createDirectories(storageDirectory);
        } catch (IOException e) {
            throw new IllegalStateException(
                    "Unable to initialize avatar storage", e
            );
        }
    }

    public String saveAvatar(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a profile picture"
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Profile picture must be 2 MB or smaller"
            );
        }

        try (ImageInputStream input =
                ImageIO.createImageInputStream(
                        file.getInputStream())) {

            if (input == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid image file"
                );
            }

            Iterator<ImageReader> readers =
                    ImageIO.getImageReaders(input);

            if (!readers.hasNext()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Unsupported image file"
                );
            }

            ImageReader reader = readers.next();

            try {
                reader.setInput(input);

                String format = reader.getFormatName()
                        .toLowerCase(Locale.ROOT);

                if (!format.equals("png") &&
                    !format.equals("jpeg") &&
                    !format.equals("jpg")) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Only PNG and JPEG images are allowed"
                    );
                }

                int width = reader.getWidth(0);
                int height = reader.getHeight(0);

                if (width < 1 || height < 1 ||
                    width > MAX_DIMENSION ||
                    height > MAX_DIMENSION) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Image dimensions are too large"
                    );
                }

                BufferedImage original = reader.read(0);

                if (original == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Unable to read image"
                    );
                }

                // Re-encode image to a clean PNG.
                BufferedImage normalized = new BufferedImage(
                        width,
                        height,
                        BufferedImage.TYPE_INT_ARGB
                );

                Graphics2D graphics = normalized.createGraphics();

                try {
                    graphics.drawImage(original, 0, 0, null);
                } finally {
                    graphics.dispose();
                }

                // Never use the user's original filename.
                String filename = UUID.randomUUID() + ".png";

                Path destination = storageDirectory.resolve(filename);

                if (!ImageIO.write(
                        normalized,
                        "png",
                        destination.toFile())) {

                    throw new IOException("PNG encoding failed");
                }

                return filename;

            } finally {
                reader.dispose();
            }

        } catch (IOException e) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to store profile picture"
            );
        }
    }

    // RETRIEVE SAVED PROFILE PICTURE

    public Resource loadAvatar(String filename) {

        // Only allow server-generated UUID PNG filenames.
        if (
            filename == null ||
            !filename.matches(
                "(?i)[0-9a-f]{8}-[0-9a-f]{4}-" +
                "[0-9a-f]{4}-[0-9a-f]{4}-" +
                "[0-9a-f]{12}\\.png"
            )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Profile picture not found"
            );
        }

        // Resolve safely inside the storage directory.
        Path imagePath = storageDirectory
                .resolve(filename)
                .normalize();

        if (!imagePath.startsWith(storageDirectory) ||
            !Files.isRegularFile(imagePath) ||
            !Files.isReadable(imagePath)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Profile picture not found"
            );
        }

        return new FileSystemResource(imagePath);
    }

}
