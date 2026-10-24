package dev.bankflow;

import java.security.Principal;
import java.math.BigDecimal;
import java.util.*;
import jakarta.validation.Valid;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import static dev.bankflow.Api.*;

@RestController
@RequestMapping("/api")
class BankController {
    private final UserRepository users;
    private final AccountRepository accounts;
    private final BeneficiaryRepository beneficiaries;
    private final TransferRepository transfers;
    private final LedgerRepository ledger;
    private final AuditRepository audit;
    private final TransferService service;
    BankController(UserRepository users, AccountRepository accounts, BeneficiaryRepository beneficiaries,
                   TransferRepository transfers, LedgerRepository ledger, AuditRepository audit, TransferService service) {
        this.users = users; this.accounts = accounts; this.beneficiaries = beneficiaries;
        this.transfers = transfers; this.ledger = ledger; this.audit = audit; this.service = service;
    }
    @GetMapping("/auth/csrf") Map<String, String> csrf(CsrfToken csrf) {
        return Map.of("token", csrf.getToken(), "headerName", csrf.getHeaderName());
    }
    @GetMapping("/auth/me") @Transactional(readOnly = true)
    UserDto me(Principal principal) { return UserDto.of(actor(principal)); }

    @GetMapping("/accounts") @Transactional(readOnly = true)
    List<AccountDto> accounts(Principal principal) {
        return accounts.findByOwnerIdOrderById(actor(principal).id).stream().map(AccountDto::of).toList();
    }
    @GetMapping("/accounts/{id}/transactions") @Transactional(readOnly = true)
    List<LedgerDto> transactions(Principal principal, @PathVariable Long id) {
        Account account = accounts.findById(id).orElseThrow(ApiException::missing);
        if (!account.owner.getId().equals(actor(principal).id)) throw ApiException.forbidden();
        return ledger.findByAccountIdOrderByCreatedAtDescIdDesc(id).stream().map(LedgerDto::of).toList();
    }
    @GetMapping("/beneficiaries") @Transactional(readOnly = true)
    List<BeneficiaryDto> beneficiaries(Principal principal) {
        return beneficiaries.findByOwnerIdOrderById(actor(principal).id).stream()
            .map(b -> new BeneficiaryDto(b.target.getAccountNumber(), b.target.getOwner().getFullName(), b.label)).toList();
    }
    @GetMapping("/transfers") @Transactional(readOnly = true)
    List<TransferDto> transfers(Principal principal) {
        return transfers.findByCreatorIdOrderByCreatedAtDesc(actor(principal).id).stream().map(TransferDto::of).toList();
    }
    @PostMapping("/transfers")
    TransferDto transfer(Principal principal, @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody TransferRequest request) {
        return service.create(principal.getName(), key, request);
    }
    @GetMapping("/dashboard") @Transactional(readOnly = true)
    DashboardDto dashboard(Principal principal) {
        BankUser user = actor(principal);
        List<Account> ownAccounts = accounts.findByOwnerIdOrderById(user.id);
        BigDecimal balance = BigDecimal.ZERO, incoming = BigDecimal.ZERO, outgoing = BigDecimal.ZERO;
        for (Account account : ownAccounts) {
            balance = balance.add(account.balance);
            for (LedgerEntry entry : ledger.findByAccountIdOrderByCreatedAtDescIdDesc(account.id)) {
                if (entry.type.equals("CREDIT")) incoming = incoming.add(entry.amount);
                else outgoing = outgoing.add(entry.amount);
            }
        }
        List<Transfer> ownTransfers = transfers.findByCreatorIdOrderByCreatedAtDesc(user.id).stream()
            .map(t -> org.hibernate.Hibernate.unproxy(t, Transfer.class)).toList();
        return new DashboardDto(money(balance), ownAccounts.size(), money(incoming), money(outgoing),
            ownTransfers.stream().filter(t -> t.status == TransferStatus.PENDING_APPROVAL).count(),
            ownTransfers.stream().limit(5).map(TransferDto::of).toList());
    }
    @GetMapping("/operations/transfers") @Transactional(readOnly = true)
    List<TransferDto> operationTransfers() { return transfers.findAllByOrderByCreatedAtDesc().stream().map(TransferDto::of).toList(); }

    @PostMapping("/operations/transfers/{id}/approve")
    TransferDto approve(Principal principal, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return service.decide(principal.getName(), id, true, null);
    }
    @PostMapping("/operations/transfers/{id}/reject")
    TransferDto reject(Principal principal, @PathVariable Long id, @Valid @RequestBody RejectRequest request) {
        return service.decide(principal.getName(), id, false, request.reason());
    }
    @GetMapping("/operations/audit") @Transactional(readOnly = true)
    List<AuditDto> audit() { return audit.findAllByOrderByCreatedAtDescIdDesc().stream().map(AuditDto::of).toList(); }

    private BankUser actor(Principal principal) {
        return org.hibernate.Hibernate.unproxy(users.findByUsername(principal.getName()).orElseThrow(ApiException::missing), BankUser.class);
    }
}
