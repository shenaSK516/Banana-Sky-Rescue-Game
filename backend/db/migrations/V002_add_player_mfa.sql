
-- Banana Sky Rescue
-- V002: Add Multi-Factor Authentication

-- 1. Store authenticator configuration
CREATE TABLE player_mfa (
    player_id BIGINT NOT NULL,

    secret_encrypted VARCHAR(512) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT FALSE,

    enrollment_expires_at DATETIME(6) NULL,

    last_used_time_step BIGINT NULL,

    created_at DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    updated_at DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (player_id),

    CONSTRAINT fk_player_mfa_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- 2. Store hashed recovery codes
CREATE TABLE player_mfa_recovery_codes (
    id BIGINT NOT NULL AUTO_INCREMENT,

    player_id BIGINT NOT NULL,

    code_hash VARCHAR(255) NOT NULL,

    used_at DATETIME(6) NULL,

    created_at DATETIME(6) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),

    INDEX idx_mfa_recovery_player_used
        (player_id, used_at),

    CONSTRAINT fk_mfa_recovery_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
