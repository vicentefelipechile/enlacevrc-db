INSERT INTO bot_admin (admin_id, discord_id, added_by) VALUES ('adm_test', '122333', 'vicentefelipechile');
INSERT INTO staff (staff_id, discord_id, discord_name, added_by) VALUES ('stf_test', '987654321', 'TestStaff', 'adm_test');
INSERT INTO discord_server (server_id, discord_server_id, server_name, added_by) VALUES ('srv_test', '123456789', 'TestServer', 'adm_test');

INSERT INTO setting (setting_name, setting_type_name, created_by) VALUES (
    'prefix',
    'string',
    'adm_test'
);

INSERT INTO setting (setting_name, setting_type_name, created_by) VALUES (
    'welcome_message',
    'string',
    'adm_test'
);

INSERT INTO setting (setting_name, setting_type_name, created_by) VALUES (
    'notification_channel',
    'string',
    'adm_test'
);

INSERT INTO discord_settings (discord_server_id, setting_key, setting_value) VALUES (
    '123456789',
    'prefix',
    '!'
);

INSERT INTO discord_settings (discord_server_id, setting_key, setting_value) VALUES (
    '123456789',
    'welcome_message',
    'Welcome to the server!'
);

INSERT INTO profiles (profile_id, vrchat_id, discord_id, vrchat_name, created_by) VALUES (
    'prf_test',
    'usr_test',
    '333221',
    'TestUser',
    'prf_test'
);

INSERT INTO profiles (
    profile_id,
    vrchat_id,
    discord_id,
    vrchat_name,
    created_by,

    is_banned,
    banned_at,
    banned_reason,
    banned_by
) VALUES (
    'prf_test_banned',
    'usr_test_banned',
    '333222',
    'TestUserBanned',
    'prf_test_banned',

    TRUE,
    CURRENT_TIMESTAMP,
    'Violation of terms',
    'stf_test'
);

INSERT INTO profiles (
    profile_id, 
    vrchat_id,
    discord_id,
    vrchat_name,
    created_by,

    is_verified,
    verification_id,
    verified_at,
    verified_from,
    verified_by
) VALUES (
    'prf_test_verified',
    'usr_test_verified',
    'discord_unique',
    'UniqueUser',
    'prf_test_verified',

    TRUE,
    3,
    CURRENT_TIMESTAMP,
    '123456789',
    'stf_test'
);