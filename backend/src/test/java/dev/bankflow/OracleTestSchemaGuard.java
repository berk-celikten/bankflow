package dev.bankflow;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.bind.Bindable;
import com.zaxxer.hikari.HikariConfig;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import java.util.List;
import java.util.Map;

/** Runs before context refresh: no datasource, Flyway bean or fixture can run first. */
class OracleTestSchemaGuard implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    @Override
    public void initialize(ConfigurableApplicationContext context) {
        Environment environment = context.getEnvironment();
        Binder binder = Binder.get(environment);
        DataSourceProperties datasource = binder.bind("spring.datasource", Bindable.of(DataSourceProperties.class))
            .orElseGet(DataSourceProperties::new);
        String requestedUser = environment.getProperty("BANKFLOW_DB_USER");
        String datasourceUser = datasource.getUsername() == null ? requestedUser : datasource.getUsername();
        if (!testSchema(requestedUser) || !testSchema(datasourceUser)
                || !requestedUser.equalsIgnoreCase(datasourceUser)) {
            throw unsafeConfiguration();
        }
        String requestedUrl = environment.getProperty("BANKFLOW_DB_URL");
        String datasourceUrl = datasource.getUrl() == null ? requestedUrl : datasource.getUrl();
        // Only credential-free Easy Connect URLs are accepted; no inline user, query or TNS overrides.
        if (!plainOracleUrl(requestedUrl) || !requestedUrl.equals(datasourceUrl)) throw unsafeConfiguration();

        // Bind the same relaxed properties as Boot, without constructing/starting a connection pool.
        HikariConfig effective = new HikariConfig();
        effective.setUsername(datasourceUser);
        effective.setJdbcUrl(datasourceUrl);
        binder.bind("spring.datasource.hikari", Bindable.ofInstance(effective));
        if (!requestedUser.equalsIgnoreCase(effective.getUsername())
                || !requestedUrl.equals(effective.getJdbcUrl())
                || !effective.getDataSourceProperties().isEmpty()
                || effective.getDataSourceClassName() != null || effective.getDataSourceJNDI() != null
                || effective.getDataSource() != null || effective.getConnectionInitSql() != null
                || effective.getSchema() != null || effective.getCatalog() != null
                || datasource.getJndiName() != null) throw unsafeConfiguration();
        if (datasource.getType() != null && !datasource.getType().equals(com.zaxxer.hikari.HikariDataSource.class))
            throw unsafeConfiguration();

        // Flyway can open a separate connection; it must not escape the same test schema either.
        String flywayUser = binder.bind("spring.flyway.user", String.class).orElse(requestedUser);
        String flywayUrl = binder.bind("spring.flyway.url", String.class).orElse(requestedUrl);
        String flywaySchema = binder.bind("spring.flyway.default-schema", String.class).orElse(requestedUser);
        List<String> flywaySchemas = binder.bind("spring.flyway.schemas", Bindable.listOf(String.class)).orElse(List.of());
        if (!requestedUser.equalsIgnoreCase(flywayUser) || !requestedUrl.equals(flywayUrl)
                || !requestedUser.equalsIgnoreCase(flywaySchema)
                || flywaySchemas.stream().anyMatch(schema -> !requestedUser.equalsIgnoreCase(schema))
                || !binder.bind("spring.flyway.init-sqls", Bindable.listOf(String.class)).orElse(List.of()).isEmpty()
                || !binder.bind("spring.flyway.jdbc-properties", Bindable.mapOf(String.class, String.class)).orElse(Map.of()).isEmpty())
            throw unsafeConfiguration();

        Map<String, String> jpaProperties = binder.bind("spring.jpa.properties", Bindable.mapOf(String.class, String.class)).orElse(Map.of());
        for (String key : jpaProperties.keySet()) {
            String normalized = key.replaceAll("[^A-Za-z]", "").toLowerCase(java.util.Locale.ROOT);
            if (List.of("hibernatedefaultschema", "hibernatedefaultcatalog", "hibernateconnectionusername",
                "hibernateconnectionurl", "jakartapersistencejdbcuser", "jakartapersistencejdbcurl").contains(normalized))
                throw unsafeConfiguration();
        }
    }

    private static boolean plainOracleUrl(String url) {
        return url != null && url.matches("(?i)jdbc:oracle:thin:@//(?:[a-z0-9.-]+|\\[[0-9a-f:]+\\]):[0-9]{1,5}/[a-z0-9_.-]+");
    }

    private static IllegalStateException unsafeConfiguration() {
        return new IllegalStateException("Oracle integration tests require a separate schema ending in _test; "
            + "BANKFLOW_DB_USER, datasource and effective Hikari username must identify the same test schema. "
            + "Only the same credential-free BANKFLOW_DB_URL is allowed; alternative datasource, connection "
            + "properties and schema/session overrides are rejected. "
            + "Stopped before database connection, migration and fixture DELETE.");
    }

    private static boolean testSchema(String username) {
        return username != null && username.length() <= 128
            && username.matches("(?i)[a-z][a-z0-9_]*_test");
    }
}
