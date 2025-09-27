export interface Profile {
    vrchat_id: string;
    discord_id: string;
    vrchat_name: string;
    added_at: Date;
    updated_at: Date;
    is_banned: boolean;
    banned_at: Date | null;
    banned_reason: string | null;
}