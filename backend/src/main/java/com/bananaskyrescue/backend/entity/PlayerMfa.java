
package com.bananaskyrescue.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "player_mfa")
public class PlayerMfa {

    @Id
    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "secret_encrypted", nullable = false, length = 512)
    private String secretEncrypted;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;

    @Column(name = "enrollment_expires_at")
    private LocalDateTime enrollmentExpiresAt;

    @Column(name = "last_used_time_step")
    private Long lastUsedTimeStep;


    @Column(
        name = "created_at",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime createdAt;

    @Column(
        name = "updated_at",
        nullable = false,
        insertable = false,
        updatable = false
    )
    private LocalDateTime updatedAt;

    // Required by JPA
    public PlayerMfa() {
    }

    public Long getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Long playerId) {
        this.playerId = playerId;
    }

    public String getSecretEncrypted() {
        return secretEncrypted;
    }

    public void setSecretEncrypted(String secretEncrypted) {
        this.secretEncrypted = secretEncrypted;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public LocalDateTime getEnrollmentExpiresAt() {
        return enrollmentExpiresAt;
    }

    public void setEnrollmentExpiresAt(
            LocalDateTime enrollmentExpiresAt) {
        this.enrollmentExpiresAt = enrollmentExpiresAt;
    }

    public Long getLastUsedTimeStep() {
        return lastUsedTimeStep;
    }

    public void setLastUsedTimeStep(Long lastUsedTimeStep) {
        this.lastUsedTimeStep = lastUsedTimeStep;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "pending_secret_encrypted", length = 512)
    private String pendingSecretEncrypted;

    @Column(name = "pending_enrollment_expires_at")
    private LocalDateTime pendingEnrollmentExpiresAt;

    public int getFailedAttempts() {
        return failedAttempts;
    }

    public void setFailedAttempts(int failedAttempts) {
        this.failedAttempts = failedAttempts;
    }

    public LocalDateTime getLockedUntil() {
    return lockedUntil;
    }

    public void setLockedUntil(LocalDateTime lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public String getPendingSecretEncrypted() {
    return pendingSecretEncrypted;
    }

    public void setPendingSecretEncrypted(String pendingSecretEncrypted) {
        this.pendingSecretEncrypted = pendingSecretEncrypted;
    }

    public LocalDateTime getPendingEnrollmentExpiresAt() {
        return pendingEnrollmentExpiresAt;
    }

    public void setPendingEnrollmentExpiresAt(
            LocalDateTime pendingEnrollmentExpiresAt) {
        this.pendingEnrollmentExpiresAt = pendingEnrollmentExpiresAt;
    }
}
