/**
 * @file loglevel.ts
 * @author vicentefelipechile
 * @description Provides logging utilities including log levels enumeration and database logging function
 */

/**
 * Enumeration representing different log levels for categorizing log messages by severity.
 * These values must match the log_level_id from the log_level table in the database.
 * @enum {number}
 */
export enum LogLevel {
    /** System-level messages, typically for internal operations. */
    SYSTEM = 1,
    /** Debug messages for detailed troubleshooting information. */
    DEBUG = 2,
    /** Informational messages about general application flow. */
    INFO = 3,
    /** Warning messages indicating potential issues that do not stop execution. */
    WARNING = 4,
    /** Error messages for failures that affect functionality. */
    ERROR = 5,
    /** Critical messages for severe errors requiring immediate attention. */
    CRITICAL = 6
}

/**
 * Logs a message to the database with the specified log level.
 * @param {D1Database} db - The D1Database instance to use for logging.
 * @param {LogLevel} level - The log level for the message.
 * @param {string} message - The log message to store.
 * @returns A promise that resolves when the log entry is inserted.
 */

const SQL_INSERT_LOG = 'INSERT INTO log (log_level_id, log_message, created_by) VALUES (?, ?, ?)';

export async function LogIt(db: D1Database, level: LogLevel, message: string, createdBy?: string | 'system'): Promise<void> {
    await db
        .prepare(SQL_INSERT_LOG)
        .bind(level, message, createdBy)
        .run();
}