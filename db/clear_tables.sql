/* =================================================================================================
// Clear Tables Script for EnlaceVRC Discord Bot Database
// This script deletes ALL tables in the database and must be executed with extreme caution.
// Ensure you have backups before running this script.
// ===============================================================================================*/

DROP TABLE IF EXISTS log;
DROP TABLE IF EXISTS log_level;
DROP TABLE IF EXISTS setting;
DROP TABLE IF EXISTS setting_type;
DROP TABLE IF EXISTS ban_reason;
DROP TABLE IF EXISTS discord_settings;
DROP TABLE IF EXISTS discord_server;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS bot_admin;