/* =================================================================================================
// Clear Tables Script for EnlaceVRC Discord Bot Database
// This script deletes ALL tables in the database and must be executed with extreme caution.
// Ensure you have backups before running this script.
// ===============================================================================================*/

DROP TABLE IF EXISTS log CASCADE;
DROP TABLE IF EXISTS log_level CASCADE;
DROP TABLE IF EXISTS setting CASCADE;
DROP TABLE IF EXISTS setting_type CASCADE;
DROP TABLE IF EXISTS ban_reason CASCADE;
DROP TABLE IF EXISTS discord_settings CASCADE;
DROP TABLE IF EXISTS discord_server CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;