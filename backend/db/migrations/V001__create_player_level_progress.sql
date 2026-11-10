
-- Banana Sky Rescue
-- Player Level Progress Migration
-- Stores successfully completed sublevels for each player.

CREATE TABLE player_level_progress (
    id BIGINT NOT NULL AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    main_level_id INT NOT NULL,
    sublevel_id INT NOT NULL,
    completed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (id),

    CONSTRAINT uq_player_level_progress
        UNIQUE (player_id, main_level_id, sublevel_id),

    CONSTRAINT fk_progress_player
        FOREIGN KEY (player_id)
        REFERENCES players(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_main_level
        CHECK (main_level_id BETWEEN 1 AND 4),

    CONSTRAINT chk_sublevel
        CHECK (sublevel_id BETWEEN 1 AND 3)
) ENGINE=InnoDB;
