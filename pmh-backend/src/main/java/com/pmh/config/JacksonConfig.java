package com.pmh.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;

@Configuration
public class JacksonConfig {

    /**
     * Formatter linh hoạt: chấp nhận ISO 8601 có/không có milliseconds và timezone Z.
     * Ví dụ hợp lệ:
     * "2026-10-02T04:03:00.000Z"
     * "2026-10-02T04:03:00Z"
     * "2026-10-02T04:03:00"
     * "2026-10-02T04:03:00.123"
     */
    public static final DateTimeFormatter FLEXIBLE_DATE_TIME_FORMATTER = new DateTimeFormatterBuilder()
            .appendPattern("yyyy-MM-dd'T'HH:mm:ss")
            .optionalStart()
            .appendFraction(ChronoField.MILLI_OF_SECOND, 0, 3, true)
            .optionalEnd()
            .optionalStart()
            .appendLiteral('Z')
            .optionalEnd()
            .toFormatter();

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        JavaTimeModule javaTimeModule = new JavaTimeModule();

        // Deserializer: chấp nhận cả "2026-10-02T04:03:00.000Z" lẫn "2026-10-02T04:03:00"
        javaTimeModule.addDeserializer(
                LocalDateTime.class,
                new LocalDateTimeDeserializer(FLEXIBLE_DATE_TIME_FORMATTER)
        );

        // Serializer: trả về dạng "2026-10-02T04:03:00" (không có Z)
        javaTimeModule.addSerializer(
                LocalDateTime.class,
                new LocalDateTimeSerializer(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"))
        );

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(javaTimeModule);
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        return mapper;
    }
}
