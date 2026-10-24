package dev.bankflow;

import org.springframework.test.context.ActiveProfiles;

/** Isolated H2 tests: never evidence of Oracle locking or migration compatibility. */
@ActiveProfiles("test")
class H2IntegrationTest extends TransferContractTests {}
