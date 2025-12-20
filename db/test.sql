INSERT INTO bot_admin (discord_id, added_by) VALUES ('10203040', 'vicentefelipechile');
INSERT INTO staff (discord_id, discord_name, added_by) VALUES ('987654321', 'TestStaff', '10203040');
INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES ('123456789', 'TestServer', '10203040');

INSERT INTO setting (setting_name, setting_type_name, created_by, default_value) VALUES (
    'prefix',
    'string',
    '10203040',
    '!'
);

INSERT INTO setting (setting_name, setting_type_name, created_by, default_value) VALUES (
    'welcome_message',
    'string',
    '10203040',
    'Welcome to the server!'
);

INSERT INTO setting (setting_name, setting_type_name, created_by, default_value) VALUES (
    'notification_channel',
    'string',
    '10203040',
    ''
);

INSERT INTO setting (setting_name, setting_type_name, created_by, default_value) VALUES (
    'verification_role',
    'string',
    '10203040',
    ''
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

INSERT INTO profiles (discord_id, vrchat_id, vrchat_name, created_by) VALUES (
    '11213141',
    'usr_test',
    'TestUser',
    '11213141'
);

INSERT INTO profiles (
    discord_id,
    vrchat_id,
    vrchat_name,
    created_by,
    updated_by,

    is_banned,
    banned_at,
    banned_reason,
    banned_by
) VALUES (
    '12223242',
    'usr_test_banned',
    'TestUserBanned',
    '12223242',
    '987654321',

    TRUE,
    CURRENT_TIMESTAMP,
    'Violation of terms',
    '987654321'
);

INSERT INTO profiles (
    discord_id,
    vrchat_id,
    vrchat_name,
    created_by,
    updated_by,

    is_verified,
    verification_id,
    verified_at,
    verified_from,
    verified_by
) VALUES (
    '13233443',
    'usr_test_verified',
    'UniqueUser',
    '13233443',
    '987654321',

    TRUE,
    3,
    CURRENT_TIMESTAMP,
    '123456789',
    '987654321'
);

/* Created on 2025-12-19 19:18 */
INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (
    'grp_test_default',
    '123456789',
    'TestGroup',
    '987654321'
);
