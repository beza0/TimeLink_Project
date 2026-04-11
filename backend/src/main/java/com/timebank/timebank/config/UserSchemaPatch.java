package com.timebank.timebank.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.DependsOn;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@DependsOn("entityManagerFactory")
@Order(Ordered.LOWEST_PRECEDENCE - 1)
public class UserSchemaPatch implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UserSchemaPatch.class);

    private final JdbcTemplate jdbcTemplate;

    public UserSchemaPatch(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT");
            log.info("users.avatar_url column verified");
        } catch (Exception e) {
            log.warn("Could not patch users.avatar_url: {}", e.getMessage());
        }
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT USING (avatar_url::text)");
            log.info("users.avatar_url type set to TEXT");
        } catch (Exception e) {
            log.debug("users.avatar_url TEXT alter skipped or already TEXT: {}", e.getMessage());
        }
    }
}
