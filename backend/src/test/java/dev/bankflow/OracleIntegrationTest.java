package dev.bankflow;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

/** Runs the same contract against real Oracle, using Flyway and Hibernate validation.
 * Use a DEDICATED EMPTY TEST SCHEMA: fixtures delete all BankFlow data before each test.
 */
@EnabledIfEnvironmentVariable(named = "BANKFLOW_DB_URL", matches = "jdbc:oracle:.*")
@EnabledIfEnvironmentVariable(named = "BANKFLOW_DB_USER", matches = ".+")
@EnabledIfEnvironmentVariable(named = "BANKFLOW_DB_PASSWORD", matches = ".+")
@ActiveProfiles("oracle-test")
@ContextConfiguration(initializers = OracleTestSchemaGuard.class)
class OracleIntegrationTest extends TransferContractTests {}
