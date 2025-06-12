# CREATE TABLE IF NOT EXISTS states_by_country (
#     id INTEGER PRIMARY KEY,
#     name VARCHAR(100),
#     state_id INTEGER,
#     state_code VARCHAR(10),
#     state_name VARCHAR(100),
#     country_id INTEGER,
#     country_code VARCHAR(10),
#     country_name VARCHAR(100),
#     latitude VARCHAR(50),
#     longitude VARCHAR(50),
#     wiki_data_id VARCHAR(50)
# );

import psycopg2
import json
import os

# PostgreSQL connection parameters
DB_NAME = "PlatformAdminDB"
DB_USER = "postgres"
DB_PASSWORD = "Qu1ckAss1st@123"
DB_HOST = "localhost"
DB_PORT = "5432"

# JSON file path
json_file_path = os.path.expanduser(r"C:\ApplicationTurtle\IAM_Tenant\backend\shared\countries-state-cities.json")

try:
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    cursor = conn.cursor()
    print("Connected to the database.")

    with open(json_file_path, mode='r', encoding='utf-8') as file:
        data = json.load(file)

    insert_query = '''
        INSERT INTO states_by_country (
            id, name, state_id, state_code, state_name,
            country_id, country_code, country_name,
            latitude, longitude, wiki_data_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    '''

    for index, item in enumerate(data, start=1):
        try:
            values = (
                item.get('id'),
                item.get('name'),
                item.get('state_id'),
                item.get('state_code'),
                item.get('state_name'),
                item.get('country_id'),
                item.get('country_code'),
                item.get('country_name'),
                item.get('latitude'),
                item.get('longitude'),
                item.get('wikiDataId')
            )
            cursor.execute(insert_query, values)
            conn.commit()
        except Exception as e:
            print(f"\n❌ Error on record {index}: {item}")
            print("Exception:", e)
            conn.rollback()

    print("\n✅ Data import completed.")

except Exception as e:
    print("❌ Connection Error:", e)
    if 'conn' in locals():
        conn.rollback()

finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close()
    print("🔒 Database connection closed.")
