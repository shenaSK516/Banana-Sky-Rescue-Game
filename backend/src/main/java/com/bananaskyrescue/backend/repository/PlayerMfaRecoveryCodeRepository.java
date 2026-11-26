
package com.bananaskyrescue.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bananaskyrescue.backend.entity.PlayerMfaRecoveryCode;

import jakarta.persistence.LockModeType;

public interface PlayerMfaRecoveryCodeRepository
        extends JpaRepository<PlayerMfaRecoveryCode, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT code
        FROM PlayerMfaRecoveryCode code
        WHERE code.playerId = :playerId
          AND code.usedAt IS NULL
        """)
    List<PlayerMfaRecoveryCode> findUnusedByPlayerIdForUpdate(
            @Param("playerId") Long playerId
    );

    void deleteAllByPlayerId(Long playerId);
}
