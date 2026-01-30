import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

export const encrypt = (text) => {
  if (!text) return text;
  if (!SECRET_KEY) {
    console.warn('VITE_ENCRYPTION_KEY is missing. Data will be saved as plain text.');
    return text;
  }
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (text) => {
  if (!text) return text;
  if (!SECRET_KEY) return text;
  
  try {
    const bytes = CryptoJS.AES.decrypt(text, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    // If we get an empty string but the input wasn't empty, it might mean decryption failed
    // (e.g. wrong key) or the input was not encrypted data.
    // In many cases, CryptoJS returns empty string for failed decryption of non-ciphertext.
    if (!originalText && text.length > 0) {
      return text;
    }
    return originalText;
  } catch {
    // If error occurs (e.g. Malformed UTF-8), assume it's plain text
    return text;
  }
};
