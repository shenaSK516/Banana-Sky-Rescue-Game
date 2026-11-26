package com.bananaskyrescue.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bananaskyrescue.backend.entity.PlayerMfa;

import jakarta.persistence.LockModeType;

public interface PlayerMfaRepository
        extends JpaRepository<PlayerMfa, Long> {

    Optional<PlayerMfa> findByPlayerId(Long playerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT mfa
        FROM PlayerMfa mfa
        WHERE mfa.playerId = :playerId
        """)
    Optional<PlayerMfa> findByPlayerIdForUpdate(
        @Param("playerId") Long playerId
    );
}
