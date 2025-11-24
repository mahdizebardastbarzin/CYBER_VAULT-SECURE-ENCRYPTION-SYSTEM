/**
 * Main application state
 * Contains all the global variables and configurations
 * 
 * وضعیت اصلی برنامه
 * شامل تمام متغیرها و پیکربندی‌های سراسری
 */
const state = {
    currentTab: 'text',
    encryptionKey: null,
    isPyodideReady: false,
    pyodide: null,
    fileContent: null,
    folderFiles: [],
    audioContext: null,
    audioBuffers: {}
};

/**
 * DOM Elements
 * Cached references to all interactive elements
 * 
 * عناصر DOM
 * مراجع کش شده به تمام عناصر تعاملی
 */
const elements = {
    // Tabs
    tabs: {
        text: document.getElementById('text-tab'),
        file: document.getElementById('file-tab'),
        folder: document.getElementById('folder-tab')
    },
    tabButtons: document.querySelectorAll('.tab-btn'),
    
    // Inputs
    textInput: document.getElementById('input-text'),
    fileInput: document.getElementById('file-input'),
    folderInput: document.getElementById('folder-picker'),
    keyInput: document.getElementById('key-input'),
    
    // Buttons
    generateKeyBtn: document.getElementById('generate-key'),
    copyKeyBtn: document.getElementById('copy-key'),
    saveKeyBtn: document.getElementById('save-key'),
    loadKeyBtn: document.getElementById('load-key'),
    encryptBtn: document.getElementById('encrypt-btn'),
    decryptBtn: document.getElementById('decrypt-btn'),
    copyOutputBtn: document.getElementById('copy-output'),
    downloadOutputBtn: document.getElementById('download-output'),
    shareOutputBtn: document.getElementById('share-output'),
    clearOutputBtn: document.getElementById('clear-output'),
    
    // Output
    outputText: document.getElementById('output-text'),
    fileName: document.getElementById('file-name'),
    folderName: document.getElementById('folder-name'),
    folderStats: document.getElementById('folder-stats'),
    statusMessage: document.getElementById('status-message'),
    modeIndicator: document.getElementById('mode-indicator'),
    terminalOutput: document.getElementById('terminal-output')
};

/**
 * Sound effects configuration
 * Defines all sound effects used in the application
 * 
 * پیکربندی افکت‌های صوتی
 * تعریف تمام افکت‌های صوتی مورد استفاده در برنامه
 */
const soundConfig = {
    click: { type: 'sine', frequency: 880, duration: 0.1, volume: 0.3 },
    hover: { type: 'sine', frequency: 660, duration: 0.05, volume: 0.2 },
    encrypt: { 
        type: 'custom', 
        frequencies: [440, 880, 1320], 
        duration: 0.5, 
        volume: 0.4 
    },
    decrypt: { 
        type: 'custom',
        frequencies: [1320, 880, 440],
        duration: 0.5,
        volume: 0.4
    },
    error: {
        type: 'square',
        frequency: 220,
        duration: 0.3,
        volume: 0.5
    }
};

// Initialize the application
async function init() {
    showLoadingOverlay('Initializing CyberVault...');
    
    try {
        // Initialize audio context on first interaction
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
        
        logToTerminal('Initializing CyberVault...');
        
        // Initialize Pyodide
        await initPyodide();
        
        // Set up event listeners
        setupEventListeners();
        
        // Set initial tab
        switchTab('text');
        
        logToTerminal('CyberVault ready. Select a mode to begin.');
        updateStatus('READY');
    } catch (error) {
        console.error('Initialization error:', error);
        logToTerminal(`Error: ${error.message}`, 'error');
        updateStatus('ERROR');
        playSound('error');
    } finally {
        // Hide loading overlay after a short delay for better UX
        setTimeout(hideLoadingOverlay, 500);
    }
}

/**
 * Show loading overlay with message
 * Displays a loading screen with the specified message
 * 
 * نمایش صفحه بارگذاری با پیام
 * صفحه بارگذاری را با پیام مشخص شده نمایش می‌دهد
 * 
 * @param {string} message - The message to display / پیامی که نمایش داده می‌شود
 */
function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const status = overlay.querySelector('.status');
    const progress = overlay.querySelector('.progress');
    
    status.textContent = message;
    progress.style.animation = 'progress 2s ease-in-out infinite';
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
}

// Hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 500);
}

// Initialize audio context
function initAudio() {
    if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        logToTerminal('Audio system initialized');
    }
    return state.audioContext;
}

// Initialize Pyodide
async function initPyodide() {
    const updateProgress = (progress) => {
        const status = document.querySelector('#loading-overlay .status');
        if (status) {
            status.textContent = `Loading Python environment... ${Math.round(progress * 100)}%`;
        }
    };

    try {
        updateProgress(0.1);
        logToTerminal('Loading Python environment...');
        
        // Load Pyodide
        state.pyodide = await loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
        });
        
        updateProgress(0.3);
        logToTerminal('Installing cryptography package...');
        
        // Install required packages with progress callback
        await state.pyodide.loadPackage('cryptography', { 
            messageCallback: updateProgress,
            errorCallback: (e) => console.error('Package load error:', e)
        });
        
        updateProgress(0.7);
        logToTerminal('Loading Python modules...');
        
        // Load our Python modules
        await loadPythonModules();
        
        state.isPyodideReady = true;
        updateProgress(1);
        logToTerminal('Python environment ready');
        playSound('encrypt');
        
        return true;
    } catch (error) {
        console.error('Failed to initialize Pyodide:', error);
        logToTerminal(`Error: ${error.message}`, 'error');
        updateStatus('ERROR');
        playSound('error');
        return false;
    }
}

/**
 * Load Python modules
 * Imports and configures required Python modules
 * 
 * بارگذاری ماژول‌های پایتون
 * ماژول‌های مورد نیاز پایتون را وارد و پیکربندی می‌کند
 */
async function loadPythonModules() {
    try {
        // First, install required packages
        await state.pyodide.loadPackage('cryptography', {
            errorCallback: (e) => console.error('Package load error:', e)
        });
        
        // Define our Python module directly as a string
        const cryptoUtilsCode = `
import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

def generate_key():
    """Generate a new encryption key."""
    return Fernet.generate_key().decode('utf-8')

def derive_key(password: str, salt: bytes = None) -> bytes:
    """Derive a key from a password using PBKDF2."""
    if salt is None:
        salt = os.urandom(16)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def encrypt_text(text, key):
    """Encrypt text using the provided key."""
    try:
        f = Fernet(key)
        encrypted = f.encrypt(text.encode())
        return encrypted.decode('utf-8')
    except Exception as e:
        return f"Error: {str(e)}"

def decrypt_text(encrypted_text, key):
    """Decrypt text using the provided key."""
    try:
        f = Fernet(key)
        decrypted = f.decrypt(encrypted_text.encode())
        return decrypted.decode('utf-8')
    except Exception as e:
        return f"Error: {str(e)}"

def encrypt_file(file_content, key, filename):
    """Encrypt file content."""
    try:
        f = Fernet(key)
        encrypted = f.encrypt(file_content)
        return {
            'success': True,
            'data': base64.b64encode(encrypted).decode('utf-8'),
            'filename': f"{filename}.enc"
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def decrypt_file(encrypted_content, key, filename):
    """Decrypt file content."""
    try:
        f = Fernet(key)
        # Decode base64 first
        encrypted_bytes = base64.b64decode(encrypted_content)
        decrypted = f.decrypt(encrypted_bytes)
        
        # Remove .enc extension if present
        if filename.endswith('.enc'):
            filename = filename[:-4]
        
        return {
            'success': True,
            'data': base64.b64encode(decrypted).decode('utf-8'),
            'filename': filename
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
`;
        
        // Load the crypto module
        await state.pyodide.runPythonAsync(cryptoUtilsCode);
        logToTerminal('Python modules loaded successfully');
    } catch (error) {
        console.error('Error loading Python modules:', error);
        logToTerminal(`Error loading encryption module: ${error.message}`, 'error');
        throw error;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Tab switching
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            playSound('click');
            const tab = button.dataset.tab;
            switchTab(tab);
        });
    });
    
    // File input
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Folder input (using webkitDirectory for folder selection)
    elements.folderInput.addEventListener('change', handleFolderSelect);
    
    // Key management
    elements.generateKeyBtn.addEventListener('click', generateKey);
    elements.copyKeyBtn.addEventListener('click', copyKeyToClipboard);
    elements.saveKeyBtn.addEventListener('click', saveKeyToFile);
    elements.loadKeyBtn.addEventListener('click', loadKeyFromFile);
    
    // Initialize the key file input
    window.keyFileInput = createKeyFileInput();
    
    // Action buttons
    elements.encryptBtn.addEventListener('click', handleEncrypt);
    elements.decryptBtn.addEventListener('click', handleDecrypt);
    elements.copyOutputBtn.addEventListener('click', copyOutput);
    elements.downloadOutputBtn.addEventListener('click', downloadOutput);
    elements.shareOutputBtn.addEventListener('click', shareOutput);
    elements.clearOutputBtn.addEventListener('click', clearOutput);
    
    // Hover effects
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => playSound('hover'));
    });
}

// Tab switching
function switchTab(tab) {
    // Hide all tabs
    Object.values(elements.tabs).forEach(t => t.classList.remove('active'));
    
    // Show selected tab
    elements.tabs[tab].classList.add('active');
    
    // Update active tab button
    elements.tabButtons.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
            elements.modeIndicator.textContent = tab.toUpperCase();
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update state
    state.currentTab = tab;
    
    // Clear any previous selection
    clearSelection();
    
    logToTerminal(`Switched to ${tab} mode`);
}

/**
 * Handle file selection
 * Processes the selected file and updates the UI
 * 
 * مدیریت انتخاب فایل
 * فایل انتخاب شده را پردازش و رابط کاربری را به‌روزرسانی می‌کند
 * 
 * @param {Event} event - The file selection event / رویداد انتخاب فایل
 */
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    elements.fileName.textContent = file.name;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        state.fileContent = new Uint8Array(arrayBuffer);
        logToTerminal(`File loaded: ${file.name} (${formatFileSize(file.size)})`);
    } catch (error) {
        console.error('Error reading file:', error);
        logToTerminal('Error: Failed to read file', 'error');
    }
}

/**
 * Handle folder selection
 * Processes the selected folder and its contents
 * 
 * مدیریت انتخاب پوشه
 * پوشه انتخاب شده و محتوای آن را پردازش می‌کند
 * 
 * @param {Event} event - The folder selection event / رویداد انتخاب پوشه
 */
async function handleFolderSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // Get folder name from the first file's path
    const folderPath = files[0].webkitRelativePath.split('/')[0];
    elements.folderName.textContent = folderPath;
    
    // Process files
    state.folderFiles = [];
    let totalSize = 0;
    
    for (const file of files) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const content = new Uint8Array(arrayBuffer);
            const relativePath = file.webkitRelativePath;
            
            state.folderFiles.push({
                name: file.name,
                path: relativePath,
                content: content,
                size: file.size
            });
            
            totalSize += file.size;
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            logToTerminal(`Error reading file: ${file.name}`, 'error');
        }
    }
    
    // Update UI
    elements.folderStats.textContent = `${files.length} files (${formatFileSize(totalSize)})`;
    logToTerminal(`Loaded folder: ${folderPath} (${files.length} files, ${formatFileSize(totalSize)})`);
}

/**
 * Generate a new encryption key
 * Creates a cryptographically secure random key
 * 
 * تولید کلید رمزنگاری جدید
 * یک کلید تصادفی امن از نظر رمزنگاری ایجاد می‌کند
 */
function generateKey() {
    playSound('click');
    
    if (!state.isPyodideReady) {
        logToTerminal('Error: Python environment not ready', 'error');
        return;
    }
    
    try {
        const key = state.pyodide.runPython('generate_key()');
        state.encryptionKey = key;
        elements.keyInput.value = key;
        logToTerminal('Generated new encryption key');
    } catch (error) {
        console.error('Error generating key:', error);
        logToTerminal('Error: Failed to generate key', 'error');
    }
}

/**
 * Copy key to clipboard
 * Copies the current encryption key to the clipboard
 * 
 * کپی کلید به حافظه موقت
 * کلید رمزنگاری فعلی را در حافظه موقت کپی می‌کند
 */
function copyKeyToClipboard() {
    playSound('click');
    
    if (!state.encryptionKey) {
        logToTerminal('No key to copy', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(state.encryptionKey)
        .then(() => {
            logToTerminal('Encryption key copied to clipboard');
        })
        .catch(err => {
            console.error('Failed to copy key:', err);
            logToTerminal('Error: Failed to copy key', 'error');
        });
}

/**
 * Save key to file
 * Exports the current encryption key to a downloadable file
 * 
 * ذخیره کلید در فایل
 * کلید رمزنگاری فعلی را در یک فایل قابل دانلود ذخیره می‌کند
 */
function saveKeyToFile() {
    playSound('click');
    
    if (!state.encryptionKey) {
        logToTerminal('No key to save', 'warning');
        return;
    }
    
    const blob = new Blob([state.encryptionKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cybervault_key.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    logToTerminal('Encryption key saved to file');
}

/**
 * Create a hidden file input for loading keys
 * Dynamically creates a file input element for key import
 * 
 * ایجاد فایل اینپوت مخفی برای بارگذاری کلیدها
 * به صورت پویا یک المان فایل اینپوت برای وارد کردن کلید ایجاد می‌کند
 * 
 * @returns {HTMLInputElement} The created file input element / المان فایل اینپوت ایجاد شده
 */
function createKeyFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.key,.txt';
    input.style.display = 'none';
    input.addEventListener('change', handleKeyFileSelect);
    document.body.appendChild(input);
    return input;
}

/**
 * Handle key file selection
 * Processes the selected key file and updates the encryption key
 * 
 * مدیریت انتخاب فایل کلید
 * فایل کلید انتخاب شده را پردازش و کلید رمزنگاری را به‌روزرسانی می‌کند
 * 
 * @param {Event} event - The file selection event / رویداد انتخاب فایل
 */
function handleKeyFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const key = e.target.result.trim();
            // Basic validation of the key
            if (key.length < 40) {
                throw new Error('Invalid key format');
            }
            
            state.encryptionKey = key;
            elements.keyInput.value = key;
            logToTerminal('Encryption key loaded from file');
            playSound('decrypt');
        } catch (error) {
            console.error('Error loading key:', error);
            logToTerminal('Error: Invalid key file', 'error');
            playSound('error');
        }
    };
    
    reader.onerror = () => {
        logToTerminal('Error: Failed to read key file', 'error');
        playSound('error');
    };
    
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
}

/**
 * Load key from file
 * Triggers the file selection dialog for key import
 * 
 * بارگذاری کلید از فایل
 * دیالوگ انتخاب فایل را برای وارد کردن کلید فعال می‌کند
 */
function loadKeyFromFile() {
    // Create a new file input if it doesn't exist
    if (!window.keyFileInput) {
        window.keyFileInput = createKeyFileInput();
    }
    // Trigger the file selection dialog
    window.keyFileInput.click();
}

/**
 * Handle encryption
 * Manages the encryption process based on the current tab
 * 
 * مدیریت رمزنگاری
 * فرآیند رمزنگاری را بر اساس تب فعلی مدیریت می‌کند
 */
async function handleEncrypt() {
    playSound('encrypt');
    
    if (!validateKey()) return;
    
    updateStatus('ENCRYPTING...');
    
    try {
        switch (state.currentTab) {
            case 'text':
                await encryptText();
                break;
            case 'file':
                await encryptFile();
                break;
            case 'folder':
                await encryptFolder();
                break;
        }
        
        updateStatus('ENCRYPTION COMPLETE');
    } catch (error) {
        console.error('Encryption error:', error);
        logToTerminal(`Error: ${error.message}`, 'error');
        updateStatus('ENCRYPTION FAILED', 'error');
    }
}

/**
 * Handle decryption
 * Manages the decryption process based on the current tab
 * 
 * مدیریت رمزگشایی
 * فرآیند رمزگشایی را بر اساس تب فعلی مدیریت می‌کند
 */
async function handleDecrypt() {
    playSound('decrypt');
    
    if (!validateKey()) return;
    
    updateStatus('DECRYPTING...');
    
    try {
        switch (state.currentTab) {
            case 'text':
                await decryptText();
                break;
            case 'file':
                await decryptFile();
                break;
            case 'folder':
                await decryptFolder();
                break;
        }
        
        updateStatus('DECRYPTION COMPLETE');
    } catch (error) {
        console.error('Decryption error:', error);
        logToTerminal(`Error: ${error.message}`, 'error');
        updateStatus('DECRYPTION FAILED', 'error');
    }
}

/**
 * Encrypt text
 * Encrypts the text from the input field
 * 
 * رمزنگاری متن
 * متن موجود در فیلد ورودی را رمزنگاری می‌کند
 * 
 * @returns {Promise<string>} The encrypted text / متن رمزنگاری شده
 */
async function encryptText() {
    const text = elements.textInput.value.trim();
    if (!text) {
        logToTerminal('No text to encrypt', 'warning');
        return;
    }
    
    logToTerminal('Encrypting text...');
    
    try {
        const encrypted = state.pyodide.runPython(`
            encrypt_text("""${escapePythonString(text)}""", """${state.encryptionKey}""")
        `);
        
        elements.outputText.textContent = encrypted;
        updateOutputButtons(true);
        logToTerminal('Text encrypted successfully');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt text');
    }
}

/**
 * Decrypt text
 * Decrypts the text from the input field
 * 
 * رمزگشایی متن
 * متن رمزنگاری شده در فیلد ورودی را رمزگشایی می‌کند
 * 
 * @returns {Promise<string>} The decrypted text / متن رمزگشایی شده
 */
async function decryptText() {
    const text = elements.textInput.value.trim();
    if (!text) {
        logToTerminal('No text to decrypt', 'warning');
        return;
    }
    
    logToTerminal('Decrypting text...');
    
    try {
        const decrypted = state.pyodide.runPython(`
            decrypt_text("""${escapePythonString(text)}""", """${state.encryptionKey}""")
        `);
        
        elements.outputText.textContent = decrypted;
        updateOutputButtons(true);
        logToTerminal('Text decrypted successfully');
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt text. Check your key and try again.');
    }
}

/**
 * Encrypt file
 * Encrypts the selected file using the current key
 * 
 * رمزنگاری فایل
 * فایل انتخاب شده را با استفاده از کلید فعلی رمزنگاری می‌کند
 * 
 * @returns {Promise<Uint8Array>} The encrypted file data / داده‌های فایل رمزنگاری شده
 */
async function encryptFile() {
    if (!state.fileContent) {
        logToTerminal('No file selected', 'warning');
        return;
    }
    
    logToTerminal('Encrypting file...');
    
    try {
        const originalName = elements.fileName.textContent;
        const baseName = originalName.split('.').slice(0, -1).join('.');
        
        // Convert Uint8Array to base64 string
        let binary = '';
        const bytes = new Uint8Array(state.fileContent);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const fileContentBase64 = btoa(binary);
        
        // Set up Python globals - only set once
        state.pyodide.globals.set('fileContentBase64', fileContentBase64);
        state.pyodide.globals.set('encryptionKey', state.encryptionKey);
        state.pyodide.globals.set('baseName', baseName);
        
        // Run Python code
        const pythonCode = `
import json
import base64

try:
    # Get variables from JavaScript
    file_content_base64 = fileContentBase64
    key = encryptionKey
    filename = baseName
    
    # Debug info
    print("Starting encryption...")
    print(f"Filename: {filename}")
    print(f"Key length: {len(key) if key else 'None'}")
    print(f"Content length: {len(file_content_base64) if file_content_base64 else 'None'}")
    
    # Decode base64 back to bytes
    file_bytes = base64.b64decode(file_content_base64)
    
    # Call encryption function
    result = encrypt_file(file_bytes, key, filename)
    
    # Debug the result
    print(f"Encryption result type: {type(result)}")
    
    if isinstance(result, dict):
        result_json = json.dumps(result)
    else:
        # If result is not a dict, wrap it in a success response
        result_json = json.dumps({"success": True, "data": result, "filename": filename})
    
    print("Encryption completed successfully")
    print(result_json)  # This will be captured by Pyodide
    result_json  # This will be the return value

except Exception as e:
    import traceback
    error_msg = f"Python error: {e}\n{traceback.format_exc()}"
    error_json = json.dumps({"success": False, "error": error_msg})
    print(error_json)
    error_json
`;

        // Execute Python code and get the result
        const result = await state.pyodide.runPythonAsync(pythonCode);
        
        if (!result) {
            throw new Error('No response from Python code');
        }
        
        // Clean up globals
        state.pyodide.globals.delete('fileContentBase64');
        state.pyodide.globals.delete('encryptionKey');
        state.pyodide.globals.delete('baseName');
        
        // Parse the result
        const { success, data, filename, error } = JSON.parse(result);
        
        if (!success) {
            throw new Error(error || 'Unknown error during file encryption');
        }
        
        // Convert base64 string back to Uint8Array
        const binaryString = atob(data);
        const len2 = binaryString.length;
        const bytes2 = new Uint8Array(len2);
        for (let i = 0; i < len2; i++) {
            bytes2[i] = binaryString.charCodeAt(i);
        }
        
        // Create download link
        const blob = new Blob([bytes2], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logToTerminal(`File encrypted and saved as ${filename}`);
        return true;
    } catch (error) {
        console.error('File encryption error:', error);
        logToTerminal(`Encryption failed: ${error.message}`, 'error');
        updateStatus('ENCRYPTION FAILED');
        playSound('error');
        return false;
    }
}

/**
 * Decrypt file
 * Decrypts the selected file using the current key
 * 
 * رمزگشایی فایل
 * فایل رمزنگاری شده را با استفاده از کلید فعلی رمزگشایی می‌کند
 * 
 * @returns {Promise<Uint8Array>} The decrypted file data / داده‌های فایل رمزگشایی شده
 */
async function decryptFile() {
    if (!state.fileContent) {
        logToTerminal('No file selected', 'warning');
        return;
    }
    
    logToTerminal('Decrypting file...');
    
    try {
        const originalName = elements.fileName.textContent;
        
        // Convert Uint8Array to base64 string
        let binary = '';
        const bytes = new Uint8Array(state.fileContent);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const fileContentBase64 = btoa(binary);
        
        // Set up Python globals
        state.pyodide.globals.set('fileContentBase64', fileContentBase64);
        state.pyodide.globals.set('encryptionKey', state.encryptionKey);
        state.pyodide.globals.set('originalName', originalName);
        
        // Run Python code
        const pythonCode = `
import json
import base64

try:
    # Get variables from JavaScript
    file_content_base64 = fileContentBase64
    key = encryptionKey
    filename = originalName
    
    # Decode base64 back to bytes
    file_bytes = base64.b64decode(file_content_base64)
    
    # Call decryption function
    result = decrypt_file(file_bytes, key, filename)
    if isinstance(result, dict):
        result_json = json.dumps(result)
    else:
        # If result is not a dict, wrap it in a success response
        result_json = json.dumps({"success": True, "data": result, "filename": filename})
    print(result_json)  # This will be captured by Pyodide
    result_json  # This will be the return value

except Exception as e:
    import traceback
    error_msg = f"Python error: {str(e)}\n{traceback.format_exc()}"
    error_json = json.dumps({"success": False, "error": error_msg})
    print(error_json)  # This will be captured by Pyodide
    error_json  # This will be the return value
`;

        // Execute Python code and get the result
        const result = await state.pyodide.runPythonAsync(pythonCode);
        
        if (!result) {
            throw new Error('No response from Python code');
        }
        
        // Clean up globals
        state.pyodide.globals.delete('fileContentBase64');
        state.pyodide.globals.delete('encryptionKey');
        state.pyodide.globals.delete('originalName');
        
        // Parse the result
        const { success, data, filename, error } = JSON.parse(result);
        
        if (!success) {
            throw new Error(error || 'Unknown error during file decryption');
        }
        
        // Convert base64 string back to Uint8Array
        const binaryString = atob(data);
        const len2 = binaryString.length;
        const bytes2 = new Uint8Array(len2);
        for (let i = 0; i < len2; i++) {
            bytes2[i] = binaryString.charCodeAt(i);
        }
        
        // Create download link
        const blob = new Blob([bytes2], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logToTerminal(`File decrypted and saved as ${filename}`);
        return true;
    } catch (error) {
        console.error('File decryption error:', error);
        logToTerminal(`Decryption failed: ${error.message}`, 'error');
        updateStatus('DECRYPTION FAILED');
        playSound('error');
        return false;
    }
}

/**
 * Encrypt folder
 * Encrypts all files in the selected folder
 * 
 * رمزنگاری پوشه
 * تمام فایل‌های موجود در پوشه انتخاب شده را رمزنگاری می‌کند
 * 
 * @returns {Promise<Object>} An object containing the encrypted files and metadata / شیء حاوی فایل‌های رمزنگاری شده و متادیتا
 */
async function encryptFolder() {
    if (state.folderFiles.length === 0) {
        logToTerminal('No folder selected', 'warning');
        return;
    }
    
    logToTerminal(`Encrypting ${state.folderFiles.length} files...`);
    updateStatus(`ENCRYPTING ${state.folderFiles.length} FILES...`);
    
    try {
        // Create a zip file using JSZip
        const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
        const zip = new JSZip.default();
        
        // Add each file to the zip
        for (const file of state.folderFiles) {
            const filePath = file.path;
            const fileContent = file.content;
            
            // Encrypt each file
            const result = state.pyodide.runPython(`
                import json
                from js import fileContent
                
                file_bytes = bytes(fileContent.to_py())
                result = encrypt_file(file_bytes, """${state.encryptionKey}""", """${file.name}""")
                json.dumps(result)
            `, { fileContent: Array.from(fileContent) });
            
            const { success, data, error } = JSON.parse(result);
            
            if (!success) {
                throw new Error(`Failed to encrypt ${filePath}: ${error}`);
            }
            
            // Add encrypted file to zip
            zip.file(`${filePath}.mcrypt`, data);
            logToTerminal(`Encrypted: ${filePath}`);
        }
        
        // Generate zip file
        const zipContent = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // Create download link
        const url = URL.createObjectURL(zipContent);
        const folderName = elements.folderName.textContent || 'encrypted_folder';
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}_encrypted.zip`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logToTerminal(`Folder encrypted and saved as ${folderName}_encrypted.zip`);
        updateStatus('FOLDER ENCRYPTION COMPLETE');
    } catch (error) {
        console.error('Folder encryption error:', error);
        logToTerminal(`Error: ${error.message}`, 'error');
        updateStatus('FOLDER ENCRYPTION FAILED', 'error');
    }
}

/**
 * Decrypt folder
 * Decrypts all files in the selected folder
 * 
 * رمزگشایی پوشه
 * تمام فایل‌های رمزنگاری شده در پوشه انتخاب شده را رمزگشایی می‌کند
 * 
 * @returns {Promise<Object>} An object containing the decrypted files and metadata / شیء حاوی فایل‌های رمزگشایی شده و متادیتا
 */
async function decryptFolder() {
    if (state.folderFiles.length === 0) {
        logToTerminal('No folder selected', 'warning');
        return;
    }
    
    logToTerminal(`Decrypting ${state.folderFiles.length} files...`);
    updateStatus(`DECRYPTING ${state.folderFiles.length} FILES...`);
    
    try {
        // Create a zip file using JSZip
        const JSZip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
        const zip = new JSZip.default();
        
        // Add each decrypted file to the zip
        for (const file of state.folderFiles) {
            const filePath = file.path;
            const fileContent = file.content;
            
            // Skip non-.mcrypt files
            if (!filePath.endsWith('.mcrypt')) {
                logToTerminal(`Skipping non-encrypted file: ${filePath}`, 'warning');
                continue;
            }
            
            // Decrypt each file
            const result = state.pyodide.runPython(`
                import json
                from js import fileContent
                
                file_bytes = bytes(fileContent.to_py())
                result = decrypt_file(file_bytes, """${state.encryptionKey}""", """${filePath}""")
                json.dumps(result)
            `, { fileContent: Array.from(fileContent) });
            
            const { success, data, filename, error } = JSON.parse(result);
            
            if (!success) {
                logToTerminal(`Failed to decrypt ${filePath}: ${error}`, 'error');
                continue;
            }
            
            // Add decrypted file to zip
            zip.file(filename, data);
            logToTerminal(`Decrypted: ${filePath} -> ${filename}`);
        }
        
        // Generate zip file
        const zipContent = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // Create download link
        const url = URL.createObjectURL(zipContent);
        const folderName = elements.folderName.textContent || 'decrypted_folder';
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}_decrypted.zip`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logToTerminal(`Folder decrypted and saved as ${folderName}_decrypted.zip`);
        updateStatus('FOLDER DECRYPTION COMPLETE');
    } catch (error) {
        console.error('Folder decryption error:', error);
        logToTerminal(`Error: ${error.message}`, 'error');
        updateStatus('FOLDER DECRYPTION FAILED', 'error');
    }
}

/**
 * Copy output to clipboard
 * Copies the current output text to the clipboard
 * 
 * کپی خروجی به حافظه موقت
 * متن خروجی فعلی را در حافظه موقت کپی می‌کند
 */
function copyOutput() {
    playSound('click');
    
    const output = elements.outputText.textContent;
    if (!output) {
        logToTerminal('No output to copy', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(output)
        .then(() => {
            logToTerminal('Output copied to clipboard');
        })
        .catch(err => {
            console.error('Failed to copy output:', err);
            logToTerminal('Error: Failed to copy output', 'error');
        });
}

/**
 * Download output
 * Downloads the current output as a file
 * 
 * دانلود خروجی
 * خروجی فعلی را به صورت یک فایل دانلود می‌کند
 */
function downloadOutput() {
    playSound('click');
    
    const output = elements.outputText.textContent;
    if (!output) {
        logToTerminal('No output to download', 'warning');
        return;
    }
    
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cybervault_output.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    logToTerminal('Output downloaded');
}

/**
 * Share output
 * Shares the current output using the Web Share API
 * 
 * اشتراک‌گذاری خروجی
 * خروجی فعلی را با استفاده از Web Share API به اشتراک می‌گذارد
 */
async function shareOutput() {
    playSound('click');
    
    const output = elements.outputText.textContent;
    if (!output) {
        logToTerminal('No output to share', 'warning');
        return;
    }
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'CyberVault Output',
                text: output,
                url: window.location.href
            });
            logToTerminal('Output shared successfully');
        } else {
            // Fallback for browsers that don't support Web Share API
            await navigator.clipboard.writeText(output);
            logToTerminal('Output copied to clipboard (sharing not supported)');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
            logToTerminal('Error: Failed to share output', 'error');
        }
    }
}

/**
 * Clear output
 * Clears the output area
 * 
 * پاک کردن خروجی
 * ناحیه خروجی را پاک می‌کند
 */
function clearOutput() {
    playSound('click');
    
    elements.outputText.textContent = '';
    updateOutputButtons(false);
    logToTerminal('Output cleared');
}

/**
 * Clear current selection
 * Resets the current file/folder selection
 * 
 * پاک کردن انتخاب فعلی
 * انتخاب فایل/پوشه فعلی را بازنشانی می‌کند
 */
function clearSelection() {
    if (state.currentTab === 'file') {
        elements.fileInput.value = '';
        elements.fileName.textContent = 'No file selected';
        state.fileContent = null;
    } else if (state.currentTab === 'folder') {
        elements.folderInput.value = '';
        elements.folderName.textContent = 'No folder selected';
        elements.folderStats.textContent = '';
        state.folderFiles = [];
    } else {
        elements.textInput.value = '';
    }
    
    elements.outputText.textContent = '';
    updateOutputButtons(false);
}

/**
 * Update output action buttons state
 * Enables or disables the output action buttons
 * 
 * به‌روزرسانی وضعیت دکمه‌های عملیات خروجی
 * دکمه‌های عملیات خروجی را فعال یا غیرفعال می‌کند
 * 
 * @param {boolean} enabled - Whether to enable or disable the buttons / فعال یا غیرفعال کردن دکمه‌ها
 */
function updateOutputButtons(enabled) {
    elements.copyOutputBtn.disabled = !enabled;
    elements.downloadOutputBtn.disabled = !enabled;
    elements.shareOutputBtn.disabled = !enabled || !navigator.share;
}

/**
 * Validate encryption key
 * Checks if the current key is valid
 * 
 * اعتبارسنجی کلید رمزنگاری
 * بررسی می‌کند که آیا کلید فعلی معتبر است یا خیر
 * 
 * @returns {boolean} True if the key is valid, false otherwise / در صورتی که کلید معتبر باشد true و در غیر این صورت false
 */
function validateKey() {
    if (!state.encryptionKey) {
        logToTerminal('Please generate or enter an encryption key', 'warning');
        playSound('error');
        return false;
    }
    
    // Basic key validation
    if (state.encryptionKey.length < 40) {
        logToTerminal('Invalid encryption key', 'error');
        playSound('error');
        return false;
    }
    
    return true;
}

/**
 * Play sound effect using Web Audio API
 * Plays the specified sound effect
 * 
 * پخش افکت صوتی با استفاده از Web Audio API
 * افکت صوتی مشخص شده را پخش می‌کند
 * 
 * @param {string} type - The type of sound to play / نوع صدای مورد نظر برای پخش
 * @returns {AudioNode} The audio node for the sound / نود صوتی ایجاد شده
 */
function playSound(type) {
    // If audio context isn't initialized, try to initialize it
    if (!state.audioContext) {
        try {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            return;
        }
    }

    const config = soundConfig[type];
    if (!config) return;

    try {
        if (config.type === 'custom' && config.frequencies) {
            // Play a sequence of tones
            const time = state.audioContext.currentTime;
            const gainNode = state.audioContext.createGain();
            gainNode.gain.value = config.volume || 0.5;
            gainNode.connect(state.audioContext.destination);

            const duration = (config.duration || 0.5) / config.frequencies.length;
            
            config.frequencies.forEach((freq, i) => {
                const osc = state.audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time + (i * duration));
                
                const gain = state.audioContext.createGain();
                gain.gain.setValueAtTime(0, time + (i * duration));
                gain.gain.linearRampToValueAtTime(
                    config.volume || 0.5,
                    time + (i * duration) + 0.01
                );
                gain.gain.linearRampToValueAtTime(
                    0,
                    time + ((i + 1) * duration)
                );
                
                osc.connect(gain);
                gain.connect(state.audioContext.destination);
                osc.start(time + (i * duration));
                osc.stop(time + ((i + 1) * duration));
            });
        } else {
            // Play a single tone
            const oscillator = state.audioContext.createOscillator();
            const gainNode = state.audioContext.createGain();
            
            oscillator.type = config.type || 'sine';
            oscillator.frequency.value = config.frequency || 440;
            gainNode.gain.value = config.volume || 0.5;
            
            oscillator.connect(gainNode);
            gainNode.connect(state.audioContext.destination);
            
            const now = state.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(config.volume || 0.5, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + (config.duration || 0.5));
            
            oscillator.start(now);
            oscillator.stop(now + (config.duration || 0.5));
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

/**
 * Log message to terminal
 * Adds a message to the terminal output
 * 
 * ثبت پیام در ترمینال
 * یک پیام به خروجی ترمینال اضافه می‌کند
 * 
 * @param {string} message - The message to log / پیام مورد نظر برای ثبت
 * @param {string} type - The type of message (info, success, warning, error) / نوع پیام (اطلاعات، موفقیت، هشدار، خطا)
 */
function logToTerminal(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    
    elements.terminalOutput.appendChild(logEntry);
    elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
}

/**
 * Update status message
 * Updates the status message in the UI
 * 
 * به‌روزرسانی پیام وضعیت
 * پیام وضعیت را در رابط کاربری به‌روزرسانی می‌کند
 * 
 * @param {string} message - The status message / پیام وضعیت
 * @param {string} type - The type of status (info, success, warning, error) / نوع وضعیت (اطلاعات، موفقیت، هشدار، خطا)
 */
function updateStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-${type}`;
}

/**
 * Format file size
 * Converts bytes to a human-readable format
 * 
 * قالب‌بندی اندازه فایل
 * بایت‌ها را به فرمت قابل خواندن برای انسان تبدیل می‌کند
 * 
 * @param {number} bytes - The size in bytes / اندازه به بایت
 * @returns {string} The formatted file size / اندازه قالب‌بندی شده فایل
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Escape string for Python
 * Escapes special characters in a string for Python
 * 
 * فرار دادن کاراکترهای خاص برای پایتون
 * کاراکترهای خاص در رشته را برای استفاده در پایتون فرار می‌دهد
 * 
 * @param {string} str - The string to escape / رشته‌ای که باید فرار داده شود
 * @returns {string} The escaped string / رشته فرار داده شده
 */
function escapePythonString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
