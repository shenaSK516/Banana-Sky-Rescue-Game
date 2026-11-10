
package com.bananaskyrescue.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "player_level_progress")
public class PlayerLevelProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Column(name = "main_level_id", nullable = false)
    private Integer mainLevelId;

    @Column(name = "sublevel_id", nullable = false)
    private Integer sublevelId;

    @Column(name = "completed_at", nullable = false,
            insertable = false, updatable = false)
    private LocalDateTime completedAt;

    // Required by JPA
    protected PlayerLevelProgress() {
    }

    public PlayerLevelProgress(
            Player player,
            Integer mainLevelId,
            Integer sublevelId) {

        this.player = player;
        this.mainLevelId = mainLevelId;
        this.sublevelId = sublevelId;
    }

    public Long getId() {
        return id;
    }

    public Player getPlayer() {
        return player;
    }

    public Integer getMainLevelId() {
        return mainLevelId;
    }

    public Integer getSublevelId() {
        return sublevelId;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
}
