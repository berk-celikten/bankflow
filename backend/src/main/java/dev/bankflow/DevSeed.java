package dev.bankflow;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Component @Profile("dev")
class DevSeed implements ApplicationRunner {
    private final UserRepository users;
    private final AccountRepository accounts;
    private final BeneficiaryRepository beneficiaries;
    private final PasswordEncoder encoder;
    private final Environment environment;
    DevSeed(UserRepository users, AccountRepository accounts, BeneficiaryRepository beneficiaries, PasswordEncoder encoder, Environment environment) {
        this.users = users; this.accounts = accounts; this.beneficiaries = beneficiaries; this.encoder = encoder; this.environment = environment;
    }
    @Override @Transactional
    public void run(ApplicationArguments args) {
        String password = environment.getProperty("BANKFLOW_DEMO_PASSWORD");
        if (password == null || password.length() < 12 || password.isBlank())
            throw new IllegalStateException("dev profili için en az 12 karakterli BANKFLOW_DEMO_PASSWORD ortam değişkeni zorunludur.");
        if (users.count() > 0) return;
        String encoded = encoder.encode(password);
        BankUser ayse = users.save(new BankUser("ayse", encoded, "Ayşe Yılmaz", "CUSTOMER"));
        BankUser mehmet = users.save(new BankUser("mehmet", encoded, "Mehmet Kaya", "CUSTOMER"));
        BankUser operator = users.save(new BankUser("operator", encoded, "Deniz Demir", "CUSTOMER,OPERATOR"));
        BankUser supervisor = users.save(new BankUser("supervisor", encoded, "Ece Aksoy", "CUSTOMER,OPERATOR"));
        List<Account> all = accounts.saveAll(List.of(
            new Account(ayse, "BF-0001-TRY", "Günlük Hesabım", "125000.00"),
            new Account(ayse, "BF-0002-TRY", "Birikim Hesabım", "35000.00"),
            new Account(mehmet, "BF-0003-TRY", "Günlük Hesabım", "82500.00"),
            new Account(operator, "BF-0004-TRY", "Günlük Hesabım", "60000.00"),
            new Account(supervisor, "BF-0005-TRY", "Günlük Hesabım", "75000.00")));
        for (BankUser user : List.of(ayse, mehmet, operator, supervisor)) {
            for (Account target : all) {
                if (!target.owner.id.equals(user.id)) beneficiaries.save(new Beneficiary(user, target, target.owner.fullName));
            }
        }
    }
}
