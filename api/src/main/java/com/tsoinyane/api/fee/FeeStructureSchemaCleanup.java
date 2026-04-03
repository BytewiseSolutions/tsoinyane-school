package com.tsoinyane.api.fee;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class FeeStructureSchemaCleanup implements ApplicationRunner {

    private static final List<String> LEGACY_DATE_COLUMNS = List.of(
            "registration_start_date",
            "registration_closing_date",
            "school_fee_start_date",
            "school_fee_closing_date",
            "exam_fee_start_date",
            "exam_fee_closing_date"
    );

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!tableExists("fee_structure") || !tableExists("fee_term_window")) {
            return;
        }

        List<String> existingLegacyColumns = LEGACY_DATE_COLUMNS.stream()
                .filter(this::columnExists)
                .toList();

        if (existingLegacyColumns.isEmpty()) {
            return;
        }

        backfillTermWindows();
        dropLegacyColumns(existingLegacyColumns);
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.tables
                        where table_schema = database()
                          and table_name = ?
                        """,
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }

    private boolean columnExists(String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.columns
                        where table_schema = database()
                          and table_name = 'fee_structure'
                          and column_name = ?
                        """,
                Integer.class,
                columnName
        );
        return count != null && count > 0;
    }

    private void backfillTermWindows() {
        jdbcTemplate.execute(
                """
                        insert into fee_term_window (
                            school_id,
                            term,
                            academic_year,
                            opening_date,
                            closing_date,
                            created_at,
                            updated_at
                        )
                        select
                            fs.school_id,
                            fs.term,
                            fs.academic_year,
                            max(coalesce(fs.registration_start_date, fs.school_fee_start_date, fs.exam_fee_start_date)),
                            max(coalesce(fs.registration_closing_date, fs.school_fee_closing_date, fs.exam_fee_closing_date)),
                            current_timestamp(6),
                            current_timestamp(6)
                        from fee_structure fs
                        where coalesce(
                            fs.registration_start_date,
                            fs.school_fee_start_date,
                            fs.exam_fee_start_date,
                            fs.registration_closing_date,
                            fs.school_fee_closing_date,
                            fs.exam_fee_closing_date
                        ) is not null
                        group by fs.school_id, fs.term, fs.academic_year
                        on duplicate key update
                            opening_date = coalesce(fee_term_window.opening_date, values(opening_date)),
                            closing_date = coalesce(fee_term_window.closing_date, values(closing_date)),
                            updated_at = current_timestamp(6)
                        """
        );
    }

    private void dropLegacyColumns(List<String> existingLegacyColumns) {
        for (String columnName : existingLegacyColumns) {
            jdbcTemplate.execute("alter table fee_structure drop column " + columnName);
            log.info("Dropped legacy fee_structure column {}", columnName);
        }
    }
}
