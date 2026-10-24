package dev.bankflow;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.util.ArrayList;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.mock.env.MockEnvironment;
import com.zaxxer.hikari.HikariDataSource;

class OracleTestSchemaGuardTest {
    static final String SAFE_URL = "jdbc:oracle:thin:@//localhost:1521/FREEPDB1";
    record DatabaseSideEffect(String operation) {}

    ApplicationContextRunner guardedContext(List<String> executed) {
        return new ApplicationContextRunner()
            .withPropertyValues("BANKFLOW_DB_URL=" + SAFE_URL, "spring.datasource.url=" + SAFE_URL)
            .withInitializer(new OracleTestSchemaGuard())
            .withBean("dataSource", DatabaseSideEffect.class, () -> record(executed, "CONNECT"))
            .withBean("flyway", DatabaseSideEffect.class, () -> record(executed, "MIGRATE"))
            .withBean("fixtures", DatabaseSideEffect.class, () -> record(executed, "DELETE"));
    }

    DatabaseSideEffect record(List<String> executed, String operation) {
        executed.add(operation);
        return new DatabaseSideEffect(operation);
    }

    @ParameterizedTest
    @ValueSource(strings = {"bankflow", "BANKFLOW", "bankflow_test_backup", "\"bankflow_test\"", "main.bankflow_test"})
    void unsafeUsernameStopsContextBeforeAllDatabaseWork(String username) {
        List<String> executed = new ArrayList<>();
        guardedContext(executed).withPropertyValues("BANKFLOW_DB_USER=" + username,
            "spring.datasource.username=" + username).run(context -> {
                assertThat(context).hasFailed();
                assertThat(context.getStartupFailure()).hasMessageContaining("separate schema ending in _test");
                assertThat(executed).isEmpty();
            });
    }

    @Test void unsafeDatasourceOverrideIsAlsoRejectedBeforeDatabaseWork() {
        List<String> executed = new ArrayList<>();
        guardedContext(executed).withPropertyValues("BANKFLOW_DB_USER=bankflow_test",
            "spring.datasource.username=bankflow").run(context -> {
                assertThat(context).hasFailed();
                assertThat(context.getStartupFailure()).hasMessageContaining("Stopped before database connection");
                assertThat(executed).isEmpty();
            });
    }

    @Test void missingUsernameStopsBeforeDatabaseWork() {
        List<String> executed = new ArrayList<>();
        guardedContext(executed).withPropertyValues("BANKFLOW_DB_USER=", "spring.datasource.username=")
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(context.getStartupFailure()).hasMessageContaining("separate schema ending in _test");
                assertThat(executed).isEmpty();
            });
    }

    @ParameterizedTest
    @ValueSource(strings = {"bankflow_test", "BANKFLOW_TEST"})
    void separateTestSchemaAllowsContextRefresh(String username) {
        List<String> executed = new ArrayList<>();
        guardedContext(executed).withPropertyValues("BANKFLOW_DB_USER=" + username,
            "spring.datasource.username=" + username).run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(executed).containsExactlyInAnyOrder("CONNECT", "MIGRATE", "DELETE");
            });
    }

    @Test void realHikariUsernameOverrideIsRejectedBeforePoolStartup() {
        // Reproduce Boot's two-step datasource binding with an actual, unstarted HikariDataSource.
        DataSourceProperties datasource = new DataSourceProperties();
        datasource.setUsername("bankflow_test");
        datasource.setUrl(SAFE_URL);
        MockEnvironment environment = new MockEnvironment().withProperty("spring.datasource.hikari.username", "bankflow");
        try (HikariDataSource pool = datasource.initializeDataSourceBuilder().type(HikariDataSource.class).build()) {
            Binder.get(environment).bind("spring.datasource.hikari", Bindable.ofInstance(pool));
            assertThat(pool.getUsername()).isEqualTo("bankflow");
            assertThat(pool.isRunning()).isFalse();
        }
        assertRejectedBeforeDatabaseWork("spring.datasource.hikari.username=bankflow");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "spring.datasource.hikari.jdbc-url=jdbc:oracle:thin:bankflow/placeholder@//localhost:1521/FREEPDB1",
        "spring.datasource.hikari.jdbc-url=jdbc:oracle:thin:@//localhost:1521/FREEPDB1?user=bankflow",
        "spring.datasource.url=jdbc:oracle:thin:bankflow/placeholder@//localhost:1521/FREEPDB1",
        "spring.datasource.hikari.data-source-properties.user=bankflow",
        "spring.datasource.hikari.data-source-properties[oracle.jdbc.user]=bankflow",
        "spring.datasource.hikari.data-source-properties.url=jdbc:oracle:thin:bankflow/placeholder@//localhost:1521/FREEPDB1",
        "spring.datasource.hikari.data-source-class-name=oracle.jdbc.pool.OracleDataSource",
        "spring.datasource.hikari.connection-init-sql=ALTER SESSION SET CURRENT_SCHEMA=bankflow",
        "spring.datasource.hikari.schema=bankflow",
        "spring.datasource.jndi-name=java:comp/env/jdbc/main",
        "spring.datasource.type=org.springframework.jdbc.datasource.DriverManagerDataSource",
        "spring.flyway.user=bankflow",
        "spring.flyway.url=jdbc:oracle:thin:bankflow/placeholder@//localhost:1521/FREEPDB1",
        "spring.flyway.default-schema=bankflow",
        "spring.flyway.schemas=bankflow_test,bankflow",
        "spring.flyway.jdbc-properties.user=bankflow",
        "spring.flyway.init-sqls=ALTER SESSION SET CURRENT_SCHEMA=bankflow",
        "spring.jpa.properties.hibernate.default_schema=bankflow"
    })
    void connectionIdentityAndSchemaOverridesAreRejected(String override) {
        assertRejectedBeforeDatabaseWork(override);
    }

    @Test void inlineCredentialsInEnvironmentUrlAreRejected() {
        String url = "jdbc:oracle:thin:bankflow/placeholder@//localhost:1521/FREEPDB1";
        List<String> executed = new ArrayList<>();
        guardedContext(executed).withPropertyValues("BANKFLOW_DB_USER=bankflow_test",
            "spring.datasource.username=bankflow_test", "BANKFLOW_DB_URL=" + url, "spring.datasource.url=" + url)
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(context.getStartupFailure()).hasMessageContaining("credential-free");
                assertThat(executed).isEmpty();
            });
    }

    @Test void explicitSafeHikariIdentityAllowsContextRefresh() {
        List<String> executed = new ArrayList<>();
        guardedContext(executed).withPropertyValues("BANKFLOW_DB_USER=bankflow_test", "spring.datasource.username=bankflow_test",
            "spring.datasource.hikari.username=BANKFLOW_TEST", "spring.datasource.hikari.jdbc-url=" + SAFE_URL)
            .run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(executed).containsExactlyInAnyOrder("CONNECT", "MIGRATE", "DELETE");
            });
    }

    private void assertRejectedBeforeDatabaseWork(String override) {
        List<String> executed = new ArrayList<>();
        guardedContext(executed).withPropertyValues("BANKFLOW_DB_USER=bankflow_test",
            "spring.datasource.username=bankflow_test", override).run(context -> {
                assertThat(context).hasFailed();
                assertThat(context.getStartupFailure()).hasMessageContaining("Stopped before database connection");
                assertThat(executed).isEmpty();
            });
    }
}
