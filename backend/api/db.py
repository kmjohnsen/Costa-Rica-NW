# api/db.py
import os
import mysql.connector
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306)),
}

for k, v in DB_CONFIG.items():
    if v in (None, ""):
        raise RuntimeError(f"Missing DB config variable: {k}")

@contextmanager
def get_db_connection(dictionary=False):
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=dictionary)
        yield conn, cursor
    except mysql.connector.Error as err:
        print(f"MySQL Error: {err}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
