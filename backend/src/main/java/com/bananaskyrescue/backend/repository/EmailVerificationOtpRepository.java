
package com.bananaskyrescue.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bananaskyrescue.backend.entity.EmailVerificationOtp;

import jakarta.persistence.LockModeType;

public interface EmailVerificationOtpRepository
        extends JpaRepository<EmailVerificationOtp, Long> {

    Optional<EmailVerificationOtp> findByPlayerId(Long playerId);

    void deleteByPlayerId(Long playerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT otp
        FROM EmailVerificationOtp otp
        WHERE otp.player.id = :playerId
        """)
    Optional<EmailVerificationOtp> findByPlayerIdForUpdate(
            @Param("playerId") Long playerId
    );
}
