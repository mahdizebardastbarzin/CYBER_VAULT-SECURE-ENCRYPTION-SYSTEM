"""
Sound Generation Module
Generates and exports sound effects for the application.

ماژول تولید صدا
تولید و صادر کردن افکت‌های صوتی برای برنامه.
"""

import numpy as np
import base64
from io import BytesIO
import soundfile as sf
import os

def generate_click():
    """
    Generate a simple click sound.
    
    Returns:
        tuple: A tuple containing (audio_data, sample_rate)
        
    تولید صدای کلیک ساده.
    
    برمی‌گرداند:
        tuple: یک تاپل حاوی (داده‌های صوتی، نرخ نمونه‌برداری)
    """
    sample_rate = 44100  # CD quality sample rate
    t = np.linspace(0, 0.1, int(0.1 * sample_rate), False)
    # Generate a short 880Hz tone with exponential decay
    click = 0.5 * np.sin(2 * np.pi * 880 * t) * np.exp(-20 * t)
    return click, sample_rate

def generate_encrypt():
    """
    Generate an ascending tone for encryption feedback.
    
    Returns:
        tuple: A tuple containing (audio_data, sample_rate)
        
    تولید صدای زیر رونده برای بازخورد عملیات رمزنگاری.
    
    برمی‌گرداند:
        tuple: یک تاپل حاوی (داده‌های صوتی، نرخ نمونه‌برداری)
    """
    sample_rate = 44100  # CD quality sample rate
    t = np.linspace(0, 0.5, int(0.5 * sample_rate), False)
    # Generate a tone that ascends from 440Hz to 1440Hz
    tone = 0.5 * np.sin(2 * np.pi * (440 + 1000 * t) * t)
    return tone, sample_rate

def generate_decrypt():
    """
    Generate a descending tone for decryption feedback.
    
    Returns:
        tuple: A tuple containing (audio_data, sample_rate)
        
    تولید صدای بم‌رونده برای بازخورد عملیات رمزگشایی.
    
    برمی‌گرداند:
        tuple: یک تاپل حاوی (داده‌های صوتی، نرخ نمونه‌برداری)
    """
    sample_rate = 44100  # CD quality sample rate
    t = np.linspace(0, 0.5, int(0.5 * sample_rate), False)
    # Generate a tone that descends from 1440Hz to 440Hz
    tone = 0.5 * np.sin(2 * np.pi * (1440 - 1000 * t) * t)
    return tone, sample_rate

def generate_hover():
    """
    Generate a short blip sound for hover events.
    
    Returns:
        tuple: A tuple containing (audio_data, sample_rate)
        
    تولید صدای بیپ کوتاه برای رویدادهای هاور.
    
    برمی‌گرداند:
        tuple: یک تاپل حاوی (داده‌های صوتی، نرخ نمونه‌برداری)
    """
    sample_rate = 44100  # CD quality sample rate
    t = np.linspace(0, 0.05, int(0.05 * sample_rate), False)
    # Generate a short 660Hz tone with quick decay
    blip = 0.3 * np.sin(2 * np.pi * 660 * t) * np.exp(-30 * t)
    return blip, sample_rate

def generate_error():
    """
    Generate an error notification sound.
    
    Returns:
        tuple: A tuple containing (audio_data, sample_rate)
        
    تولید صدای هشدار خطا.
    
    برمی‌گرداند:
        tuple: یک تاپل حاوی (داده‌های صوتی، نرخ نمونه‌برداری)
    """
    sample_rate = 44100  # CD quality sample rate
    t = np.linspace(0, 0.3, int(0.3 * sample_rate), False)
    # Generate a low-frequency (220Hz) tone with slow decay
    error = 0.5 * np.sin(2 * np.pi * 220 * t) * np.exp(-5 * t)
    return error, sample_rate

def save_sound(audio, sample_rate, filename):
    """
    Convert audio data to a base64 data URL.
    
    Args:
        audio: Numpy array containing audio samples
        sample_rate: Sample rate in Hz
        filename: Output filename (unused in this function but kept for compatibility)
        
    Returns:
        str: A data URL containing the base64-encoded WAV audio
        
    تبدیل داده‌های صوتی به آدرس داده base64.
    
    پارامترها:
        audio: آرایه‌ی نامپای حاوی نمونه‌های صوتی
        sample_rate: نرخ نمونه‌برداری بر حسب هرتز
        filename: نام فایل خروجی (در این تابع استفاده نمی‌شود اما برای سازگاری حفظ شده است)
        
    برمی‌گرداند:
        str: یک آدرس داده حاوی صوت WAV کدگذاری شده با base64
    """
    # Write audio to an in-memory buffer
    with BytesIO() as buffer:
        sf.write(buffer, audio, sample_rate, format='WAV')
        wav_data = buffer.getvalue()
    
    # Encode the WAV data as base64
    base64_audio = base64.b64encode(wav_data).decode('utf-8')
    
    # Return as a data URL
    return f"data:audio/wav;base64,{base64_audio}"

def main():
    """
    Main function to generate and export all sound effects.
    
    تابع اصلی برای تولید و صادر کردن تمام افکت‌های صوتی.
    """
    # Create sounds directory if it doesn't exist
    os.makedirs('assets/sounds', exist_ok=True)
    
    # Dictionary of sound generation functions and their parameters
    sounds = {
        'click': generate_click(),   # For button clicks
        'encrypt': generate_encrypt(),  # For encryption operations
        'decrypt': generate_decrypt(),  # For decryption operations
        'hover': generate_hover(),   # For hover events
        'error': generate_error()    # For error notifications
    }
    
    # Save sounds as data URLs in a JavaScript file
    with open('sounds.js', 'w', encoding='utf-8') as f:
        f.write('// Auto-generated sound data\n')
        f.write('// داده‌های صوتی تولید شده به صورت خودکار\n\n')
        f.write('/*\n * Sound effects data URLs\n * \n * آدرس‌های داده افکت‌های صوتی\n */\n')
        f.write('const SOUNDS = {\n')
        
        for name, (audio, sr) in sounds.items():
            data_url = save_sound(audio, sr, f'{name}.wav')
            f.write(f"    '{name}': '{data_url}',\n")
            
            # Also save as WAV files
            sf.write(f'assets/sounds/{name}.wav', audio, sr)
        
        f.write('};\n')
        f.write('\n// Function to preload sounds\n')
        f.write('function preloadSounds() {\n')
        f.write('    for (const [name, dataUrl] of Object.entries(SOUNDS)) {\n')
        f.write('        const audio = new Audio();\n')
        f.write('        audio.src = dataUrl;\n')
        f.write('        audio.load();\n')
        f.write('    }\n')
        f.write('}\n')
    
    print("Sounds generated successfully! | صداها با موفقیت تولید شدند!")
    print("\nUsage | راهنمای استفاده:")
    print("1. Add this to your HTML before script.js:")
    print("   این را قبل از script.js به HTML خود اضافه کنید:")
    print("   <script src=\"sounds.js\"></script>")
    print("\n2. Call preloadSounds() when your app loads")
    print("   تابع preloadSounds() را هنگام بارگذاری برنامه فراخوانی کنید")

if __name__ == "__main__":
    # Run the main function when the script is executed directly
    main()
