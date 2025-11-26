/* =================================================================================================
// Script to Populate EnlaceVRC Discord Bot Database
// This script inserts initial data into the tables for ban reasons, settings, user profiles,
// Discord server settings, and staff members.
// ===============================================================================================*/

/* ==============================================================================================
// Log Data
// ============================================================================================== */

INSERT INTO log_level (level_name, description) VALUES
    ('SYSTEM', 'System-level messages'),
    ('DEBUG', 'Detailed information for diagnosing issues'),
    ('INFO', 'General operational messages'),
    ('ADDITION', 'Records of additions to the database'),
    ('CHANGE', 'Records of changes in the database'),
    ('REMOVAL', 'Records of deletions from the database'),
    ('WARNING', 'Indications of potential issues'),
    ('ERROR', 'Error events that might still allow the application to continue running'),
    ('CRITICAL', 'Severe error events that will presumably lead the application to abort');

/* ==============================================================================================
// Add Default Data
// ============================================================================================== */

INSERT INTO log (log_level_id, log_message) VALUES
    (1, 'VRChat Discord Bot database schema initialized');

INSERT INTO setting_type (type_name, description) VALUES
    ('boolean', 'A setting that can be true or false'),
    ('string', 'A setting that holds a string value');

INSERT INTO log (log_level_id, log_message) VALUES
    (2, 'Added "boolean" type to setting_type table'),
    (2, 'Added "string" type to setting_type table');

INSERT INTO setting (setting_name, setting_type_name, default_value) VALUES
    ('verification_role', 'boolean', '0'),
    ('verification_plus_role', 'string', ''),
    ('verification_channel', 'string', ''),
    ('auto_nickname', 'boolean', '0');

INSERT INTO log (log_level_id, log_message) VALUES
    (2, 'Added "verification_role" with type "boolean" to setting table'),
    (2, 'Added "verification_plus_role" with type "string" to setting table'),
    (2, 'Added "verification_channel" with type "string" to setting table'),
    (2, 'Added "auto_nickname" with type "boolean" to setting table');

INSERT INTO verification_type (type_name, description) VALUES
    ('Discord Staff', 'Verification through Discord Staff status'),
    ('VRChat Plus', 'Verification by gifting VRChat Plus membership to the bot'),
    ('Manual Insertion', 'Manual insertion by the developer or staff member'),
    ('Manual Insertion Web', 'Manual insertion through the web interface by staff member');

INSERT INTO log (log_level_id, log_message) VALUES
    (2, 'Added verification types to verification_type table');

INSERT INTO bot_admin (discord_id, added_by) VALUES
    ('356253258613915663', 'system');

INSERT INTO staff (discord_id, discord_name, added_by) VALUES
    ('356253258613915663', 'vicentefelipechile', '356253258613915663');

INSERT INTO log (log_level_id, log_message) VALUES
    (2, 'Added initial bot admin and staff member');

INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES
    ('web', 'Admin Web Panel', '356253258613915663'),
    ('1392882468704489552', 'El Refugio Nocturno', '356253258613915663');

INSERT INTO log (log_level_id, log_message) VALUES
    (2, 'Added initial Discord server for Admin Web Panel');

INSERT INTO log (log_level_id, log_message) VALUES
    (1, 'Database population script completed successfully');