"""
Conversion script: TSV to SQL INSERT statements

Format: output, <= input

INSERT INTO profiles (
    discord_id,     <= discord_id
    vrchat_id,      <= vrchat_id
    vrchat_name,    <= vrchat_name
    added_at,       <= added_at
    updated_at,     <= CURRENT_TIMESTAMP
    created_by,     <= discord_id
    updated_by,     <= '356253258613915663'

    is_verified,        <= TRUE
    verification_id,    <= 1
    verified_at,        <= added_at
    verified_from,      <= '1392882468704489552'
    verified_by         <= '356253258613915663'
)
"""

import csv
from datetime import datetime

# Configuration
INPUT_FILE = 'data.tsv'
OUTPUT_FILE = 'poblate-prod.sql'
ADMIN_ID = '356253258613915663'
GROUP_ID = '1392882468704489552'

def escape_sql_string(value):
    """Escape single quotes for SQL"""
    if value is None or value == '':
        return 'NULL'
    return "'" + str(value).replace("'", "''") + "'"

def convert_tsv_to_sql():
    """Convert TSV data to SQL INSERT statement"""
    
    values_rows = []
    
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file, delimiter='\t')
            
            for row_num, row in enumerate(reader, start=2):  # start=2 because row 1 is header
                try:
                    # Extract data from TSV columns
                    discord_id = (row.get('discord_id') or '').strip()
                    vrchat_id = (row.get('vrchat_id') or '').strip()
                    vrchat_name = (row.get('vrchat_name') or '').strip()
                    added_at = (row.get('added_at') or '').strip()
                    
                    # Validate required fields
                    if not all([discord_id, vrchat_id, vrchat_name, added_at]):
                        print(f"Warning: Row {row_num} skipped due to missing required fields")
                        continue
                    
                    # Build VALUES row
                    values_row = f"""({escape_sql_string(discord_id)}, {escape_sql_string(vrchat_id)}, {escape_sql_string(vrchat_name)}, {escape_sql_string(added_at)}, CURRENT_TIMESTAMP, {escape_sql_string(discord_id)}, {escape_sql_string(ADMIN_ID)}, TRUE, 1, {escape_sql_string(added_at)}, {escape_sql_string(GROUP_ID)}, {escape_sql_string(ADMIN_ID)})"""
                    
                    values_rows.append(values_row)
                    
                except Exception as e:
                    print(f"Error processing row {row_num}: {str(e)}")
                    continue
        
        # Write to output file
        if values_rows:
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as output:
                output.write("""INSERT INTO profiles (
    discord_id,
    vrchat_id,
    vrchat_name,
    added_at,
    updated_at,
    created_by,
    updated_by,
    is_verified,
    verification_id,
    verified_at,
    verified_from,
    verified_by
) VALUES
""")
                output.write(',\n'.join(values_rows))
                output.write(';')
            
            print(f"Success! Generated INSERT statement with {len(values_rows)} records")
            print(f"Output saved to: {OUTPUT_FILE}")
        else:
            print("No valid records found to convert")
            
    except FileNotFoundError:
        print(f"Error: File '{INPUT_FILE}' not found")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == '__main__':
    convert_tsv_to_sql()