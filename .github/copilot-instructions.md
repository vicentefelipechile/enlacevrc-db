<coding-guidelines>
    <!-- Global Rules Applied to All Files -->
    <global-rules applyTo="All Files">
        <metadata>
            <rule>Each script must begin with JSDoc meta-information using /** */ comments</rule>
            <rule>When handling database models, the corresponding interface must be imported from '../models'</rule>
            <required-fields>
                <field name="@file">Relative script path from src/ (e.g., "discord/add.ts", "profile/get.ts")</field>
                <field name="@author">Author name (use "vicentefelipechile" as default)</field>
                <field name="@description">Brief description of the script's functionality</field>
            </required-fields>
        </metadata>
    </global-rules>
    <!-- TypeScript Specific Rules -->
    <typescript-rules applyTo="src/**/*.ts">
        <structure>
            <imports>
                <rule>Group imports in sections with clear comment headers</rule>
                <rule>Import models from '../models' (Profile, DiscordSetting)</rule>
                <rule>Import response functions from '../responses' (ErrorResponse, SuccessResponse, JsonResponse)</rule>
                <rule>Use section comment: "// Import Statements"</rule>
            </imports>
            <sections>
                <rule>Use comment separators with "=" characters for major sections</rule>
                <rule>Each function should have its own section with descriptive title</rule>
                <rule>Example: "// AddDiscordSetting Function", "// GetProfile Function"</rule>
            </sections>
        </structure>
        <naming-conventions>
            <functions>PascalCase (AddProfile, GetDiscordSetting, UpdateProfile)</functions>
            <variables>camelCase (profileId, settingKey, settingValue)</variables>
            <database-fields>snake_case (vrchat_id, discord_id, setting_key, setting_value)</database-fields>
            <extracted-data>camelCase when destructuring from database objects</extracted-data>
        </naming-conventions>
        <function-implementation>
            <step number="1">Data extraction with proper TypeScript typing (use Partial&lt;Model&gt; for request data)</step>
            <step number="2">Input validation - return ErrorResponse(message, 400) for missing required fields</step>
            <step number="3">Variable extraction using destructuring with camelCase renaming</step>
            <step number="4">Database statement preparation using env.DB.prepare()</step>
            <step number="5">Statement execution with proper parameter binding</step>
            <step number="6">Result handling and response with appropriate status codes</step>
            <step number="7">Error handling with try-catch and console.error logging</step>
        </function-implementation>
        <response-handling>
            <success>
                <rule>Use SuccessResponse(message, statusCode) for operations without data return</rule>
                <rule>Use JsonResponse({success: true, data: result}) for data queries</rule>
                <rule>Common status codes: 200 (success), 201 (created), 204 (no content)</rule>
            </success>
            <errors>
                <rule>Use ErrorResponse(message, statusCode) for all error cases</rule>
                <rule>400 for validation errors with format: "Missing required fields: field1, field2"</rule>
                <rule>404 for not found resources (e.g., "Profile not found")</rule>
                <rule>409 for conflict/database operation failures</rule>
                <rule>500 for unexpected errors with generic message "Internal Server Error"</rule>
            </errors>
            <messages>
                <rule>Messages must NOT end with periods</rule>
                <rule>Use clear, descriptive error messages</rule>
                <rule>Success messages should indicate the action performed (e.g., "Profile updated successfully")</rule>
            </messages>
        </response-handling>
        <database-operations>
            <rule>Use boolean conversion for database integer flags: profile.is_banned = profile.is_banned === 1</rule>
            <rule>Handle both VRChat ID and Discord ID searches in profile operations</rule>
            <rule>Always use parameter binding with .bind() method for SQL queries</rule>
            <rule>Check .success property for INSERT/UPDATE/DELETE operations</rule>
            <rule>Use .first&lt;Model&gt;() for single record queries</rule>
        </database-operations>
        <error-handling>
            <rule>Wrap all operations in try-catch blocks</rule>
            <rule>Extract error messages: error instanceof Error ? error.message : 'An unexpected error occurred'</rule>
            <rule>Log errors to console with descriptive context</rule>
            <rule>Always return ErrorResponse('Internal Server Error', 500) for unexpected errors</rule>
        </error-handling>
    </typescript-rules>
</coding-guidelines>