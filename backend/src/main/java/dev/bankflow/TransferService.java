package dev.bankflow;

import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static dev.bankflow.Api.*;

@Service
class TransferService {
    static final BigDecimal APPROVAL_THRESHOLD = new BigDecimal("10000.00");
    private final UserRepository users;
    private final AccountRepository accounts;
    private final TransferRepository transfers;
    private final LedgerRepository ledger;
    private final AuditRepository audit;
    TransferService(UserRepository users, AccountRepository accounts, TransferRepository transfers, LedgerRepository ledger, AuditRepository audit) {
        this.users = users; this.accounts = accounts; this.transfers = transfers; this.ledger = ledger; this.audit = audit;
    }

    @Transactional
    public TransferDto create(String username, String key, TransferRequest request) {
        if (key == null || !key.matches("[A-Za-z0-9._:-]{1,128}")) throw ApiException.invalid("Geçerli Idempotency-Key zorunludur (1–128 karakter).");
        BigDecimal amount = amount(request.amount());
        String description = request.description() == null || request.description().isBlank() ? null : request.description().strip();
        if (description != null && description.length() > 240) throw ApiException.invalid("Açıklama en fazla 240 karakter olabilir.");
        // One user lock serializes duplicate submissions before examining the unique key.
        BankUser actor = users.lockByUsername(username).orElseThrow(ApiException::missing);
        String hash = hash(request.sourceAccountId() + "\n" + request.targetAccountNumber() + "\n" + money(amount) + "\n" + (description == null ? "" : description));
        Optional<Transfer> previous = transfers.findByCreatorIdAndIdempotencyKey(actor.id, key);
        if (previous.isPresent()) {
            if (!previous.get().contentHash.equals(hash)) throw ApiException.conflict("IDEMPOTENCY_CONFLICT", "Bu anahtar farklı bir istek için kullanılmış.");
            return TransferDto.of(previous.get());
        }
        Account sourceView = accounts.findById(request.sourceAccountId()).orElseThrow(ApiException::missing);
        if (!sourceView.owner.getId().equals(actor.id)) throw ApiException.forbidden();
        Account targetView = accounts.findByAccountNumber(request.targetAccountNumber()).orElseThrow(ApiException::missing);
        if (sourceView.id.equals(targetView.id)) throw ApiException.invalid("Aynı hesaba transfer yapılamaz.");
        Map<Long, Account> locked = lockAccounts(sourceView.id, targetView.id);
        Account source = locked.get(sourceView.id), target = locked.get(targetView.id);
        requireBalance(source, amount);
        ensureTargetCapacity(target, amount);
        Transfer transfer = new Transfer();
        transfer.reference = "BF-" + UUID.randomUUID(); transfer.source = source; transfer.target = target;
        transfer.creator = actor; transfer.amount = amount; transfer.description = description;
        transfer.idempotencyKey = key; transfer.contentHash = hash; transfer.createdAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        transfer.status = amount.compareTo(APPROVAL_THRESHOLD) >= 0 ? TransferStatus.PENDING_APPROVAL : TransferStatus.COMPLETED;
        transfers.saveAndFlush(transfer);
        if (transfer.status == TransferStatus.COMPLETED) execute(transfer, actor);
        else audit.save(new AuditEntry("TRANSFER_REQUESTED", actor, transfer, "Operasyon onayı bekleniyor."));
        return TransferDto.of(transfer);
    }

    @Transactional
    public TransferDto decide(String username, Long id, boolean approve, String reason) {
        BankUser actor = users.findByUsername(username).orElseThrow(ApiException::missing);
        if (!actor.operator()) throw ApiException.forbidden();
        Transfer transfer = transfers.lockById(id).orElseThrow(ApiException::missing);
        if (transfer.creator.getId().equals(actor.id)) throw ApiException.forbidden();
        if (transfer.status != TransferStatus.PENDING_APPROVAL) throw ApiException.conflict("ALREADY_DECIDED", "Bu talep daha önce sonuçlandırılmış.");
        if (approve) {
            Map<Long, Account> locked = lockAccounts(transfer.source.getId(), transfer.target.getId());
            transfer.source = locked.get(transfer.source.getId()); transfer.target = locked.get(transfer.target.getId());
            requireBalance(transfer.source, transfer.amount);
            ensureTargetCapacity(transfer.target, transfer.amount);
            transfer.status = TransferStatus.COMPLETED;
            execute(transfer, actor);
        } else {
            if (reason == null || reason.isBlank() || reason.strip().length() > 240) throw ApiException.invalid("Ret gerekçesi zorunludur (en fazla 240 karakter).");
            transfer.status = TransferStatus.REJECTED; transfer.decisionReason = reason.strip();
            audit.save(new AuditEntry("TRANSFER_REJECTED", actor, transfer, transfer.decisionReason));
        }
        transfer.decider = actor; transfer.decidedAt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        return TransferDto.of(transfer);
    }

    private Map<Long, Account> lockAccounts(Long source, Long target) {
        Map<Long, Account> result = new HashMap<>();
        // Always take the two account locks in ascending ID order, including reciprocal transfers.
        for (Long id : java.util.stream.Stream.of(source, target).sorted().toList()) {
            Account account = accounts.lockById(id).orElseThrow(ApiException::missing);
            // A prior nonlocking lookup may already have loaded this entity in this persistence context.
            entityManager.refresh(account, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            account = org.hibernate.Hibernate.unproxy(account, Account.class);
            result.put(id, account);
        }
        return result;
    }
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

    private void execute(Transfer transfer, BankUser actor) {
        transfer.source.balance = transfer.source.balance.subtract(transfer.amount);
        transfer.target.balance = transfer.target.balance.add(transfer.amount);
        accounts.flush();
        ledger.save(new LedgerEntry(transfer.source, transfer, "DEBIT"));
        ledger.save(new LedgerEntry(transfer.target, transfer, "CREDIT"));
        ledger.flush();
        audit.save(new AuditEntry("TRANSFER_COMPLETED", actor, transfer, "İki hesap ve iki hareket tek transaction içinde işlendi."));
        audit.flush();
    }
    private static void requireBalance(Account source, BigDecimal amount) {
        if (source.balance.compareTo(amount) < 0) throw ApiException.conflict("INSUFFICIENT_BALANCE", "Kullanılabilir bakiye yetersiz.");
    }
    private static void ensureTargetCapacity(Account target, BigDecimal amount) {
        if (target.balance.add(amount).compareTo(new BigDecimal("99999999999999999.99")) > 0)
            throw ApiException.conflict("BALANCE_LIMIT", "Hedef hesabın bakiye sınırı aşılıyor.");
    }
    static BigDecimal amount(String text) {
        if (text == null || !text.matches("[0-9]{1,17}(\\.[0-9]{1,2})?")) throw ApiException.invalid("Tutar pozitif ve en fazla iki ondalıklı olmalı.");
        BigDecimal value = new BigDecimal(text).setScale(2, RoundingMode.UNNECESSARY);
        if (value.signum() <= 0) throw ApiException.invalid("Tutar sıfırdan büyük olmalı.");
        return value;
    }
    private static String hash(String text) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
