package dev.bankflow;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;

interface UserRepository extends JpaRepository<BankUser, Long> {
    Optional<BankUser> findByUsername(String username);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from BankUser u where u.username = :username")
    Optional<BankUser> lockByUsername(@Param("username") String username);
}
interface AccountRepository extends JpaRepository<Account, Long> {
    List<Account> findByOwnerIdOrderById(Long ownerId);
    Optional<Account> findByAccountNumber(String number);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.id = :id")
    Optional<Account> lockById(@Param("id") Long id);
}
interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {
    List<Beneficiary> findByOwnerIdOrderById(Long ownerId);
}
interface TransferRepository extends JpaRepository<Transfer, Long> {
    Optional<Transfer> findByCreatorIdAndIdempotencyKey(Long userId, String key);
    List<Transfer> findByCreatorIdOrderByCreatedAtDesc(Long userId);
    List<Transfer> findAllByOrderByCreatedAtDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Transfer t where t.id = :id")
    Optional<Transfer> lockById(@Param("id") Long id);
}
interface LedgerRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByAccountIdOrderByCreatedAtDescIdDesc(Long accountId);
}
interface AuditRepository extends JpaRepository<AuditEntry, Long> {
    List<AuditEntry> findAllByOrderByCreatedAtDescIdDesc();
}
