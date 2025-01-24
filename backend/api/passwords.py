# passwords.py

import secrets
import string

def generate_confirmation_code():
    return ''.join(secrets.choice(string.ascii_uppercase) for _ in range(6))

