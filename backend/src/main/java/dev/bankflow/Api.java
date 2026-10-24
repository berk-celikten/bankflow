package dev.bankflow;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class Api {
    private Api() {}
    public record UserDto(Long id, String username, String fullName, List<String> roles) {
        static UserDto of(BankUser u) { return new UserDto(u.id, u.username, u.fullName, List.of(u.roles.split(","))); }
    }
    public record TransferRequest(@NotNull Long sourceAccountId,
                                  @NotBlank @Size(max = 40) String targetAccountNumber,
                                  @NotBlank @Pattern(regexp = "[0-9]{1,17}(\\.[0-9]{1,2})?") String amount,
                                  @Size(max = 240) String description) {}
    public record RejectRequest(@NotBlank @Size(max = 240) String reason) {}
    public record AccountDto(Long id, String accountNumber, String currency, String balance, String name, String holderName) {
        static AccountDto of(Account a) { return new AccountDto(a.id, a.accountNumber, a.currency, money(a.balance), a.name, a.owner.getFullName()); }
    }
    public record BeneficiaryDto(String accountNumber, String holderName, String label) {}
    public record LedgerDto(Long id, Long transferId, String type, String amount, String balanceAfter, String description, Instant createdAt) {
        static LedgerDto of(LedgerEntry l) { return new LedgerDto(l.id, l.transfer.getId(), l.type, money(l.amount), money(l.balanceAfter), l.description, l.createdAt); }
    }
    public record TransferDto(Long id, String reference, String sourceAccountNumber, String targetAccountNumber,
                              String sourceHolderName, String targetHolderName, String amount, String description,
                              TransferStatus status, Instant createdAt, Instant decidedAt, String decisionReason,
                              Long createdBy, Long decidedBy) {
        static TransferDto of(Transfer t) {
            t = org.hibernate.Hibernate.unproxy(t, Transfer.class);
            return new TransferDto(t.id, t.reference, t.source.getAccountNumber(), t.target.getAccountNumber(),
                t.source.getOwner().getFullName(), t.target.getOwner().getFullName(), money(t.amount), t.description,
                t.status, t.createdAt, t.decidedAt, t.decisionReason, t.creator.getId(),
                t.decider == null ? null : t.decider.getId());
        }
    }
    public record AuditDto(Long id, String eventType, String actorName, String reference, String details, Instant createdAt) {
        static AuditDto of(AuditEntry a) { return new AuditDto(a.id, a.eventType, a.actorName, a.reference, a.details, a.createdAt); }
    }
    public record DashboardDto(String totalBalance, int accountCount, String incomingTotal, String outgoingTotal,
                               long pendingCount, List<TransferDto> recentTransfers) {}
    static String money(java.math.BigDecimal value) { return value.setScale(2).toPlainString(); }
}
