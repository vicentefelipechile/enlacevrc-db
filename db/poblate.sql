/* =================================================================================================
// Script to Populate EnlaceVRC Discord Bot Database
// This script inserts initial data into the tables for ban reasons, settings, user profiles,
// Discord server settings, and staff members.
// ===============================================================================================*/

/* ==============================================================================================
// Log Data
// ============================================================================================== */

INSERT INTO log_level (level_name, description, created_by) VALUES
    ('SYSTEM', 'System-level messages', 'system'),
    ('DEBUG', 'Detailed information for diagnosing issues', 'system'),
    ('INFO', 'General operational messages', 'system'),
    ('WARNING', 'Indications of potential issues', 'system'),
    ('ERROR', 'Error events that might still allow the application to continue running', 'system'),
    ('CRITICAL', 'Severe error events that will presumably lead the application to abort', 'system');

/* ==============================================================================================
// Add Default Data
// ============================================================================================== */

INSERT INTO log (log_level, log_message) VALUES
    (1, 'VRChat Discord Bot database schema initialized');

INSERT INTO setting_type (type_name, description) VALUES
    ('boolean', 'A setting that can be true or false'),
    ('string', 'A setting that holds a string value');

INSERT INTO log (log_level, log_message) VALUES
    (2, 'Added "boolean" type to setting_type table'),
    (2, 'Added "string" type to setting_type table');

INSERT INTO setting (setting_name, setting_type_id) VALUES
    ('verification_role', 1),
    ('verification_plus_role', 2),
    ('verification_channel', 2),
    ('auto_nickname', 1);

INSERT INTO log (log_level, log_message) VALUES
    (2, 'Added "verification_role" with type "boolean" to setting table'),
    (2, 'Added "verification_plus_role" with type "string" to setting table'),
    (2, 'Added "verification_channel" with type "string" to setting table'),
    (2, 'Added "auto_nickname" with type "boolean" to setting table');

INSERT INTO ban_reason (reason_text) VALUES
    ('Admitting minors to Discord servers'),
    ('Sharing or distributing illegal content'),
    ('Grooming or predatory behavior'),
    ('Harassment or abusive conduct'),
    ('Engaging in illegal activities in VRChat'),
    ('Exploiting vulnerabilities or hacking'),
    ('Severe violation of social norms and safety');

INSERT INTO log (log_level, log_message) VALUES
    (2, 'Added predefined ban reasons to ban_reason table');

INSERT INTO bot_admin (discord_id, added_by) VALUES
    ('356253258613915663', 'system');

INSERT INTO staff (discord_id, staff_name, added_by) VALUES
    ('356253258613915663', 'vicentefelipechile', 1);

INSERT INTO log (log_level, log_message) VALUES
    (2, 'Added initial bot admin and staff member'),
    (1, 'Database population script completed successfully');