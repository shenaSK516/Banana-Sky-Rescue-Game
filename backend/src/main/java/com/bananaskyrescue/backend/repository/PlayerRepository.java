package com.bananaskyrescue.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bananaskyrescue.backend.entity.Player;

import jakarta.persistence.LockModeType;

public interface PlayerRepository extends JpaRepository<Player, Long> {

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<Player> findByUsername(String username);

    Optional<Player> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT p
        FROM Player p
        WHERE p.email = :email
        """)
    Optional<Player> findByEmailForUpdate(
            @Param("email") String email
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT p
        FROM Player p
        WHERE p.username = :username
        """)

        Optional<Player> findByUsernameForUpdate(
            @Param("username") String username
        );
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("""
            SELECT p
            FROM Player p
            WHERE p.id = :playerId
            """)
        Optional<Player> findByIdForUpdate(
            @Param("playerId") Long playerId
        );
    }
