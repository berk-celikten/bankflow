package dev.bankflow;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@MappedSuperclass
abstract class EntityId {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "bf_seq")
    @SequenceGenerator(name = "bf_seq", sequenceName = "bf_seq", allocationSize = 1)
    Long id;
    public Long getId() { return id; }
}

@Entity @Table(name = "bf_users")
class BankUser extends EntityId {
    @Column(nullable = false, unique = true, length = 80) String username;
    @Column(nullable = false, length = 100) String passwordHash;
    @Column(nullable = false, length = 120) String fullName;
    @Column(nullable = false, length = 40) String roles;
    @Column(nullable = false, unique = true, length = 40) String customerId;
    protected BankUser() {}
    BankUser(String username, String passwordHash, String fullName, String roles) {
        this.username = username; this.passwordHash = passwordHash; this.fullName = fullName;
        this.roles = roles; this.customerId = "C-" + username;
    }
    boolean operator() { return java.util.Arrays.asList(roles.split(",")).contains("OPERATOR"); }
    public String getFullName() { return fullName; }
    public String getUsername() { return username; }
}

@Entity @Table(name = "bf_accounts")
class Account extends EntityId {
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "owner_id") BankUser owner;
    @Column(nullable = false, unique = true, length = 40) String accountNumber;
    @Column(nullable = false, length = 80) String name;
    @Column(nullable = false, precision = 19, scale = 2) BigDecimal balance;
    @Column(nullable = false, length = 3) String currency = "TRY";
    protected Account() {}
    Account(BankUser owner, String number, String name, String balance) {
        this.owner = owner; this.accountNumber = number; this.name = name; this.balance = new BigDecimal(balance);
    }
    public String getAccountNumber() { return accountNumber; }
    public BankUser getOwner() { return owner; }
}

@Entity @Table(name = "bf_beneficiaries", uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "target_id"}))
class Beneficiary extends EntityId {
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "owner_id") BankUser owner;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "target_id") Account target;
    @Column(nullable = false, length = 80) String label;
    protected Beneficiary() {}
    Beneficiary(BankUser owner, Account target, String label) { this.owner = owner; this.target = target; this.label = label; }
}

enum TransferStatus { COMPLETED, PENDING_APPROVAL, REJECTED }

@Entity @Table(name = "bf_transfers", uniqueConstraints = @UniqueConstraint(columnNames = {"created_by", "idempotency_key"}))
class Transfer extends EntityId {
    @Column(nullable = false, unique = true, length = 40) String reference;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "source_id") Account source;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "target_id") Account target;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "created_by") BankUser creator;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "decided_by") BankUser decider;
    @Column(nullable = false, precision = 19, scale = 2) BigDecimal amount;
    @Column(length = 240) String description;
    @Column(nullable = false, length = 128) String idempotencyKey;
    @Column(nullable = false, length = 64) String contentHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) TransferStatus status;
    @Column(nullable = false) Instant createdAt;
    Instant decidedAt;
    @Column(length = 240) String decisionReason;
    protected Transfer() {}
}

@Entity @Table(name = "bf_ledger")
class LedgerEntry extends EntityId {
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "account_id", updatable = false) Account account;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "transfer_id", updatable = false) Transfer transfer;
    @Column(nullable = false, length = 6, updatable = false) String type;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) BigDecimal amount;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) BigDecimal balanceAfter;
    @Column(length = 240, updatable = false) String description;
    @Column(nullable = false, updatable = false) Instant createdAt;
    protected LedgerEntry() {}
    LedgerEntry(Account account, Transfer transfer, String type) {
        this.account = account; this.transfer = transfer; this.type = type;
        this.amount = transfer.amount; this.balanceAfter = account.balance;
        this.description = transfer.description; this.createdAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    }
}

@Entity @Table(name = "bf_audit")
class AuditEntry extends EntityId {
    @Column(nullable = false, length = 40, updatable = false) String eventType;
    @Column(nullable = false, length = 80, updatable = false) String actorName;
    @Column(nullable = false, length = 40, updatable = false) String reference;
    @Column(nullable = false, length = 400, updatable = false) String details;
    @Column(nullable = false, updatable = false) Instant createdAt;
    protected AuditEntry() {}
    AuditEntry(String type, BankUser actor, Transfer transfer, String details) {
        this.eventType = type; this.actorName = actor.username; this.reference = transfer.reference;
        this.details = details; this.createdAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    }
}
