
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "player_level_scores",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_player_level_scores_player_level",
            columnNames = {
                "player_id",
                "main_level_id",
                "sublevel_id"
            }
        )
    }
)
public class PlayerLevelScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "player_id", nullable = false)
    private Player player;

    @Column(name = "main_level_id", nullable = false)
    private Integer mainLevelId;

    @Column(name = "sublevel_id", nullable = false)
    private Integer sublevelId;

    @Column(name = "score", nullable = false)
    private Integer score;

    @Column(name = "rescued_animals", nullable = false)
    private Integer rescuedAnimals;

    @Column(name = "active_seconds", nullable = false)
    private Integer activeSeconds;

    @Column(name = "remaining_energy", nullable = false)
    private Integer remainingEnergy;

    @Column(name = "achieved_at", nullable = false)
    private LocalDateTime achievedAt;

    // Required by JPA
    protected PlayerLevelScore() {
    }

    public PlayerLevelScore(
            Player player,
            Integer mainLevelId,
            Integer sublevelId,
            Integer score,
            Integer rescuedAnimals,
            Integer activeSeconds,
            Integer remainingEnergy) {

        this.player = player;
        this.mainLevelId = mainLevelId;
        this.sublevelId = sublevelId;
        this.score = score;
        this.rescuedAnimals = rescuedAnimals;
        this.activeSeconds = activeSeconds;
        this.remainingEnergy = remainingEnergy;
    }

    @PrePersist
    @PreUpdate
    protected void updateTimestamp() {
        this.achievedAt = LocalDateTime.now();
    }

    // Update an existing record only for a better score.
    public boolean updateBestScore(
            int newScore,
            int newRescuedAnimals,
            int newActiveSeconds,
            int newRemainingEnergy) {

        if (newScore <= this.score) {
            return false;
        }

        this.score = newScore;
        this.rescuedAnimals = newRescuedAnimals;
        this.activeSeconds = newActiveSeconds;
        this.remainingEnergy = newRemainingEnergy;

        return true;
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

    public Integer getScore() {
        return score;
    }

    public Integer getRescuedAnimals() {
        return rescuedAnimals;
    }

    public Integer getActiveSeconds() {
        return activeSeconds;
    }

    public Integer getRemainingEnergy() {
        return remainingEnergy;
    }

    public LocalDateTime getAchievedAt() {
        return achievedAt;
    }
}
