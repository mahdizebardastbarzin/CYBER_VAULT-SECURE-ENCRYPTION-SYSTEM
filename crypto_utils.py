"""
Cryptographic Utilities Module
Provides functions for encryption and decryption using Fernet symmetric encryption.

ماژول ابزارهای رمزنگاری
توابعی برای رمزنگاری و رمزگشایی با استفاده از رمزنگاری متقارن Fernet ارائه می‌دهد.
"""

import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

def generate_key():
    """
    Generate a new encryption key.
    
    Returns:
        str: A new Fernet encryption key as a UTF-8 string.
        
    تولید کلید رمزنگاری جدید.
    
    برمی‌گرداند:
        str: یک کلید رمزنگاری Fernet جدید به صورت رشته UTF-8.
    """
    return Fernet.generate_key().decode('utf-8')

def derive_key(password: str, salt: bytes = None) -> bytes:
    """
    Derive a key from a password using PBKDF2.
    
    Args:
        password: The password to derive the key from.
        salt: Optional salt value. If not provided, a random one will be generated.
        
    Returns:
        bytes: A derived key suitable for encryption.
        
    استخراج کلید از رمز عبور با استفاده از PBKDF2.
    
    پارامترها:
        password: رمز عبوری که کلید از آن استخراج می‌شود.
        salt: مقدار نمک اختیاری. در صورت عدم ارائه، به صورت تصادفی تولید می‌شود.
        
    برمی‌گرداند:
        bytes: یک کلید استخراج شده مناسب برای رمزنگاری.
    """
    if salt is None:
        # Generate a secure random salt if none provided
        salt = os.urandom(16)
    
    # Create a key derivation function with secure parameters
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),  # Use SHA-256 hash algorithm
        length=32,                  # 32 bytes = 256 bits
        salt=salt,                  # Cryptographic salt
        iterations=100000,          # Number of iterations (work factor)
    )
    
    # Derive and return the key
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def encrypt_file(file_content: bytes, key: str, original_filename: str) -> dict:
    """
    Encrypt file content using Fernet symmetric encryption.
    
    Args:
        file_content: Raw bytes of the file to encrypt
        key: Encryption key as a string
        original_filename: Original filename for metadata
        
    Returns:
        dict: {
            'success': bool,
            'data': str (base64 encoded encrypted data),
            'filename': str (suggested filename),
            'error': str (if any)
        }
        
    رمزنگاری محتوای فایل با استفاده از رمزنگاری متقارن Fernet.
    
    پارامترها:
        file_content: بایت‌های خام فایل برای رمزنگاری
        key: کلید رمزنگاری به صورت رشته
        original_filename: نام فایل اصلی برای متادیتا
        
    برمی‌گرداند:
        dict: {
            'success': وضعیت موفقیت (صحیح/نادرست),
            'data': رشته (داده‌های رمزنگاری شده با کدگذاری base64),
            'filename': رشته (نام پیشنهادی فایل),
            'error': رشته (در صورت بروز خطا)
        }
    """
    try:
        # Ensure the key is in the correct format
        f = Fernet(key.encode('utf-8'))
        
        # Encrypt the file content
        encrypted_data = f.encrypt(file_content)
        
        # Create a suggested filename
        filename = f"{original_filename}.enc"
        
        return {
            'success': True,
            'data': base64.b64encode(encrypted_data).decode('utf-8'),
            'filename': filename,
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'data': None,
            'filename': None,
            'error': str(e)
        }

def decrypt_file(encrypted_content: bytes, key: str, original_filename: str) -> dict:
    """
    Decrypt file content using Fernet symmetric encryption.
    
    Args:
        encrypted_content: Encrypted bytes to decrypt
        key: Encryption key as a string
        original_filename: Original filename for metadata
        
    Returns:
        dict: {
            'success': bool,
            'data': str (base64 encoded decrypted data),
            'filename': str (suggested filename),
            'error': str (if any)
        }
        
    رمزگشایی محتوای فایل با استفاده از رمزنگاری متقارن Fernet.
    
    پارامترها:
        encrypted_content: بایت‌های رمزنگاری شده برای رمزگشایی
        key: کلید رمزنگاری به صورت رشته
        original_filename: نام فایل اصلی برای متادیتا
        
    برمی‌گرداند:
        dict: {
            'success': وضعیت موفقیت (صحیح/نادرست),
            'data': رشته (داده‌های رمزگشایی شده با کدگذاری base64),
            'filename': رشته (نام پیشنهادی فایل),
            'error': رشته (در صورت بروز خطا)
        }
    """
    try:
        # Ensure the key is in the correct format
        f = Fernet(key.encode('utf-8'))
        
        # Decrypt the content
        decrypted_data = f.decrypt(encrypted_content)
        
        # Remove .enc extension if present
        filename = original_filename
        if filename.endswith('.enc'):
            filename = filename[:-4]
        
        return {
            'success': True,
            'data': base64.b64encode(decrypted_data).decode('utf-8'),
            'filename': filename,
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'data': None,
            'filename': None,
            'error': str(e)
        }
