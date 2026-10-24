package dev.bankflow;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
abstract class TransferContractTests {
    @Autowired TransferService service;
    @Autowired UserRepository users;
    @Autowired AccountRepository accounts;
    @Autowired BeneficiaryRepository beneficiaries;
    @Autowired TransferRepository transfers;
    @Autowired LedgerRepository ledger;
    @MockitoSpyBean AuditRepository audit;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    @Autowired PlatformTransactionManager transactions;
    Account ayseAccount, mehmetAccount, operatorAccount;
    BankUser ayse, mehmet, operator;
    String testPassword;

    @BeforeEach void fixtures() {
        reset(audit);
        testPassword = UUID.randomUUID().toString();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            audit.deleteAllInBatch(); ledger.deleteAllInBatch(); transfers.deleteAllInBatch();
            beneficiaries.deleteAllInBatch(); accounts.deleteAllInBatch(); users.deleteAllInBatch();
            String hash = encoder.encode(testPassword);
            ayse = users.save(new BankUser("ayse", hash, "Ayşe Test", "CUSTOMER"));
            mehmet = users.save(new BankUser("mehmet", hash, "Mehmet Test", "CUSTOMER"));
            operator = users.save(new BankUser("operator", hash, "Operatör Test", "CUSTOMER,OPERATOR"));
            users.save(new BankUser("supervisor", hash, "Kontrol Test", "CUSTOMER,OPERATOR"));
            ayseAccount = accounts.save(new Account(ayse, "BF-0001-TRY", "Günlük", "25000.00"));
            mehmetAccount = accounts.save(new Account(mehmet, "BF-0003-TRY", "Günlük", "25000.00"));
            operatorAccount = accounts.save(new Account(operator, "BF-0004-TRY", "Günlük", "25000.00"));
            beneficiaries.save(new Beneficiary(ayse, mehmetAccount, "Mehmet"));
        });
    }
    Api.TransferRequest request(Account source, Account target, String amount) {
        return new Api.TransferRequest(source.id, target.accountNumber, amount, "Sanal transfer");
    }
    Api.TransferDto create(String key, String amount) { return service.create("ayse", key, request(ayseAccount, mehmetAccount, amount)); }
    BigDecimal balance(Account account) { return accounts.findById(account.id).orElseThrow().balance; }
    void setBalance(Account account, String value) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            Account current = accounts.findById(account.id).orElseThrow(); current.balance = new BigDecimal(value); accounts.save(current);
        });
    }

    @Test void successfulTransferWritesTwoEntriesAndAudit() {
        Api.TransferDto result = create("success", "1500.25");
        assertThat(result.status()).isEqualTo(TransferStatus.COMPLETED);
        assertThat(result.amount()).isEqualTo("1500.25");
        assertThat(result.sourceHolderName()).isEqualTo("Ayşe Test");
        assertThat(balance(ayseAccount)).isEqualByComparingTo("23499.75");
        assertThat(balance(mehmetAccount)).isEqualByComparingTo("26500.25");
        assertThat(ledger.count()).isEqualTo(2); assertThat(audit.count()).isEqualTo(1);
        assertThat(ledger.findByAccountIdOrderByCreatedAtDescIdDesc(ayseAccount.id).getFirst().balanceAfter).isEqualByComparingTo("23499.75");
    }
    @Test void insufficientInitialBalanceLeavesNoRows() {
        assertThatThrownBy(() -> create("insufficient", "30000.00")).isInstanceOf(ApiException.class)
            .extracting("code").isEqualTo("INSUFFICIENT_BALANCE");
        assertThat(balance(ayseAccount)).isEqualByComparingTo("25000.00");
        assertThat(transfers.count()).isZero(); assertThat(ledger.count()).isZero(); assertThat(audit.count()).isZero();
    }
    @Test void rejectsZeroNegativePrecisionExponentAndOverflow() {
        for (String value : List.of("0", "-1.00", "1.001", "1e3", "100000000000000000.00", "NaN")) {
            assertThatThrownBy(() -> create("bad-" + value, value)).isInstanceOf(ApiException.class);
        }
        assertThat(transfers.count()).isZero();
    }
    @Test void sameKeyReturnsSameTransferAndDifferentPayloadConflicts() {
        var first = create("duplicate", "100.00");
        assertThat(create("duplicate", "100")).isEqualTo(first);
        assertThatThrownBy(() -> create("duplicate", "101.00")).isInstanceOf(ApiException.class)
            .extracting("code").isEqualTo("IDEMPOTENCY_CONFLICT");
        assertThat(balance(ayseAccount)).isEqualByComparingTo("24900.00"); assertThat(ledger.count()).isEqualTo(2);
    }
    @Test void keyIsScopedToUser() {
        create("shared", "100");
        service.create("mehmet", "shared", request(mehmetAccount, ayseAccount, "100"));
        assertThat(transfers.count()).isEqualTo(2); assertThat(balance(ayseAccount)).isEqualByComparingTo("25000");
    }
    @Test void thresholdIsPendingAndApprovalMovesMoneyOnce() {
        var pending = create("pending", "10000.00");
        assertThat(pending.status()).isEqualTo(TransferStatus.PENDING_APPROVAL);
        assertThat(balance(ayseAccount)).isEqualByComparingTo("25000"); assertThat(ledger.count()).isZero();
        var complete = service.decide("operator", pending.id(), true, null);
        assertThat(complete.status()).isEqualTo(TransferStatus.COMPLETED); assertThat(complete.decidedBy()).isEqualTo(operator.id);
        assertThat(complete.createdBy()).isEqualTo(ayse.id);
        assertThat(balance(ayseAccount)).isEqualByComparingTo("15000"); assertThat(ledger.count()).isEqualTo(2);
        assertThatThrownBy(() -> service.decide("supervisor", pending.id(), true, null)).isInstanceOf(ApiException.class)
            .extracting("code").isEqualTo("ALREADY_DECIDED");
    }
    @Test void selfApprovalAndSelfRejectionForbidden() {
        var pending = service.create("operator", "own", request(operatorAccount, ayseAccount, "10000"));
        assertThatThrownBy(() -> service.decide("operator", pending.id(), true, null)).isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        assertThatThrownBy(() -> service.decide("operator", pending.id(), false, "ret")).isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
        assertThat(ledger.count()).isZero();
    }
    @Test void changedBalanceAtApprovalLeavesPending() {
        var pending = create("pending", "20000");
        create("spend", "9000");
        assertThatThrownBy(() -> service.decide("operator", pending.id(), true, null)).isInstanceOf(ApiException.class)
            .extracting("code").isEqualTo("INSUFFICIENT_BALANCE");
        assertThat(transfers.findById(pending.id()).orElseThrow().status).isEqualTo(TransferStatus.PENDING_APPROVAL);
        assertThat(balance(ayseAccount)).isEqualByComparingTo("16000"); assertThat(ledger.count()).isEqualTo(2);
    }
    @Test void rejectionRequiresReasonAndDoesNotMoveMoney() {
        var pending = create("reject", "10000");
        assertThatThrownBy(() -> service.decide("operator", pending.id(), false, " ")).isInstanceOf(ApiException.class);
        var rejected = service.decide("operator", pending.id(), false, "Uygun değil");
        assertThat(rejected.status()).isEqualTo(TransferStatus.REJECTED); assertThat(rejected.decisionReason()).isEqualTo("Uygun değil");
        assertThat(balance(ayseAccount)).isEqualByComparingTo("25000"); assertThat(ledger.count()).isZero();
        assertThat(audit.count()).isEqualTo(2);
    }
    @Test void failureAfterBalancesAndLedgerRollsBackEverything() {
        doThrow(new IllegalStateException("Injected audit failure")).when(audit).save(any(AuditEntry.class));
        assertThatThrownBy(() -> create("rollback", "100")).isInstanceOf(IllegalStateException.class);
        assertThat(balance(ayseAccount)).isEqualByComparingTo("25000"); assertThat(balance(mehmetAccount)).isEqualByComparingTo("25000");
        assertThat(transfers.count()).isZero(); assertThat(ledger.count()).isZero(); assertThat(audit.count()).isZero();
    }
    @Test void failedApprovalRollsBackDecisionAndMoney() {
        var pending = create("pending", "10000");
        doThrow(new IllegalStateException("Injected audit failure")).when(audit).save(any(AuditEntry.class));
        assertThatThrownBy(() -> service.decide("operator", pending.id(), true, null)).isInstanceOf(IllegalStateException.class);
        Transfer after = transfers.findById(pending.id()).orElseThrow();
        assertThat(after.status).isEqualTo(TransferStatus.PENDING_APPROVAL); assertThat(after.decidedAt).isNull();
        assertThat(balance(ayseAccount)).isEqualByComparingTo("25000"); assertThat(ledger.count()).isZero(); assertThat(audit.count()).isEqualTo(1);
    }
    @Test void concurrentSameKeySpendsOnce() throws Exception {
        var results = race(() -> create("race", "9000"), () -> create("race", "9000"));
        assertThat(results.get(0).id()).isEqualTo(results.get(1).id());
        assertThat(balance(ayseAccount)).isEqualByComparingTo("16000"); assertThat(ledger.count()).isEqualTo(2);
    }
    @Test void concurrentSpendingCannotOverdraw() throws Exception {
        setBalance(ayseAccount, "10000");
        var results = race(() -> attempt("first"), () -> attempt("second"));
        assertThat(results).containsExactlyInAnyOrder("COMPLETED", "INSUFFICIENT_BALANCE");
        assertThat(balance(ayseAccount)).isEqualByComparingTo("1000"); assertThat(ledger.count()).isEqualTo(2);
    }
    String attempt(String key) {
        try { return create(key, "9000").status().name(); }
        catch (ApiException e) { return e.code; }
    }
    @Test void reciprocalTransfersDoNotDeadlockAndConserveTotal() throws Exception {
        race(() -> create("forward", "3000"), () -> service.create("mehmet", "backward", request(mehmetAccount, ayseAccount, "2000")));
        assertThat(balance(ayseAccount)).isEqualByComparingTo("24000");
        assertThat(balance(mehmetAccount)).isEqualByComparingTo("26000"); assertThat(ledger.count()).isEqualTo(4);
    }
    @Test void concurrentDecisionsExecuteOnlyOnce() throws Exception {
        var pending = create("pending", "10000");
        var results = race(() -> decision("operator", pending.id()), () -> decision("supervisor", pending.id()));
        assertThat(results).containsExactlyInAnyOrder("COMPLETED", "ALREADY_DECIDED");
        assertThat(ledger.count()).isEqualTo(2); assertThat(balance(ayseAccount)).isEqualByComparingTo("15000");
    }
    String decision(String username, Long id) {
        try { return service.decide(username, id, true, null).status().name(); }
        catch (ApiException e) { return e.code; }
    }
    <T> List<T> race(Supplier<T> first, Supplier<T> second) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2), start = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (Supplier<T> action : List.of(first, second)) futures.add(pool.submit(() -> {
                ready.countDown(); if (!start.await(10, TimeUnit.SECONDS)) throw new TimeoutException(); return action.get();
            }));
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue(); start.countDown();
            return List.of(futures.get(0).get(30, TimeUnit.SECONDS), futures.get(1).get(30, TimeUnit.SECONDS));
        } finally { pool.shutdownNow(); }
    }

    @Test void unauthenticatedAndCsrfAndOperatorBoundaries() throws Exception {
        mvc.perform(get("/api/accounts")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(post("/api/transfers").with(user("ayse").roles("CUSTOMER")).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get("/api/operations/transfers").with(user("ayse").roles("CUSTOMER"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/operations/audit").with(user("ayse").roles("CUSTOMER"))).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").param("username", "ayse").param("password", testPassword)).andExpect(status().isForbidden());
    }
    @Test void realSessionLoginFreshCsrfAndLogout() throws Exception {
        MvcResult csrfResult = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) csrfResult.getRequest().getSession(false);
        JsonNode token = json.readTree(csrfResult.getResponse().getContentAsString());
        mvc.perform(post("/api/auth/login").session(session).header(token.get("headerName").asText(), token.get("token").asText())
                .param("username", "ayse").param("password", testPassword))
            .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("ayse")).andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.fullName").value("Ayşe Test"));
        MvcResult refreshed = mvc.perform(get("/api/auth/csrf").session(session)).andExpect(status().isOk()).andReturn();
        JsonNode fresh = json.readTree(refreshed.getResponse().getContentAsString());
        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").session(session).header(fresh.get("headerName").asText(), fresh.get("token").asText())).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void wrongPasswordReturnsJson401() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).param("username", "ayse").param("password", "wrong"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
    @Test void accountDataIsIsolatedEvenForOperators() throws Exception {
        mvc.perform(get("/api/accounts").with(user("ayse").roles("CUSTOMER")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].accountNumber").value("BF-0001-TRY")).andExpect(jsonPath("$[0].balance").value("25000.00"));
        mvc.perform(get("/api/accounts/" + mehmetAccount.id + "/transactions").with(user("ayse").roles("CUSTOMER"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/accounts/" + ayseAccount.id + "/transactions").with(user("operator").roles("CUSTOMER", "OPERATOR"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/accounts").with(user("operator").roles("CUSTOMER", "OPERATOR")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].accountNumber").value("BF-0004-TRY"));
        assertThatThrownBy(() -> service.create("mehmet", "idor", request(ayseAccount, mehmetAccount, "10")))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
    }
    @Test void historyBeneficiariesAndDashboardFollowContract() throws Exception {
        create("done", "125.50"); create("pending", "10000");
        mvc.perform(get("/api/transfers").with(user("mehmet").roles("CUSTOMER"))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/beneficiaries").with(user("ayse").roles("CUSTOMER"))).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].accountNumber").value("BF-0003-TRY")).andExpect(jsonPath("$[0].balance").doesNotExist());
        mvc.perform(get("/api/dashboard").with(user("ayse").roles("CUSTOMER"))).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalBalance").value("24874.50")).andExpect(jsonPath("$.outgoingTotal").value("125.50"))
            .andExpect(jsonPath("$.pendingCount").value(1));
        mvc.perform(get("/api/accounts/" + ayseAccount.id + "/transactions").with(user("ayse").roles("CUSTOMER")))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].type").value("DEBIT")).andExpect(jsonPath("$[0].amount").value("125.50"));
    }
    @Test void validationAndMissingAndBusinessErrorsHaveJsonStatus() throws Exception {
        mvc.perform(post("/api/transfers").with(user("ayse")).with(csrf()).contentType("application/json").content("{}"))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        mvc.perform(post("/api/transfers").with(user("ayse")).with(csrf()).header("Idempotency-Key", "bad")
            .contentType("application/json").content(json.writeValueAsString(request(ayseAccount, mehmetAccount, "1.001"))))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.fieldErrors.amount").exists());
        mvc.perform(get("/api/accounts/999999/transactions").with(user("ayse"))).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(post("/api/transfers").with(user("ayse")).with(csrf()).header("Idempotency-Key", "low")
            .contentType("application/json").content(json.writeValueAsString(request(ayseAccount, mehmetAccount, "30000"))))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("INSUFFICIENT_BALANCE"));
    }
    @Test void operationEndpointsApproveRejectAndAudit() throws Exception {
        var pending = create("api-approve", "10000");
        mvc.perform(post("/api/operations/transfers/" + pending.id() + "/approve").with(user("operator").roles("OPERATOR")).with(csrf())
            .contentType("application/json").content("{}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.createdBy").value(ayse.id)).andExpect(jsonPath("$.decidedBy").value(operator.id));
        var reject = create("api-reject", "10000");
        mvc.perform(post("/api/operations/transfers/" + reject.id() + "/reject").with(user("operator").roles("OPERATOR")).with(csrf())
            .contentType("application/json").content("{\"reason\":\"Kontrol sonucu\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        mvc.perform(get("/api/operations/transfers").with(user("operator").roles("OPERATOR"))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/operations/audit").with(user("operator").roles("OPERATOR"))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
    }
    @Test void moneyMustBeJsonText() throws Exception {
        String body = "{\"sourceAccountId\":" + ayseAccount.id + ",\"targetAccountNumber\":\"BF-0003-TRY\",\"amount\":1.25}";
        mvc.perform(post("/api/transfers").with(user("ayse")).with(csrf()).header("Idempotency-Key", "number")
            .contentType("application/json").content(body)).andExpect(status().isUnprocessableEntity());
        assertThat(transfers.count()).isZero();
    }
    @Test void sameAccountAndTargetOverflowAreRejected() {
        assertThatThrownBy(() -> service.create("ayse", "same-account", request(ayseAccount, ayseAccount, "1")))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(422);
        setBalance(mehmetAccount, "99999999999999999.99");
        assertThatThrownBy(() -> create("overflow", "0.01")).isInstanceOf(ApiException.class)
            .extracting("code").isEqualTo("BALANCE_LIMIT");
        assertThat(balance(ayseAccount)).isEqualByComparingTo("25000"); assertThat(ledger.count()).isZero();
    }
    @Test void belowThresholdIsImmediateAndRejectedDecisionIsTerminal() {
        assertThat(create("below", "9999.99").status()).isEqualTo(TransferStatus.COMPLETED);
        var pending = create("pending", "10000");
        service.decide("operator", pending.id(), false, "Ret");
        assertThatThrownBy(() -> service.decide("supervisor", pending.id(), true, null))
            .isInstanceOf(ApiException.class).extracting("code").isEqualTo("ALREADY_DECIDED");
        assertThatThrownBy(() -> service.decide("ayse", pending.id(), false, "Ret"))
            .isInstanceOf(ApiException.class).extracting("status").isEqualTo(403);
    }
}
