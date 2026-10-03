// Compact, collision-resistant id generation (crypto-backed when available).
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function createId(prefix = 'ex') {
    let random = '';
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        const bytes = new Uint8Array(12);
        globalThis.crypto.getRandomValues(bytes);
        for (const byte of bytes) {
            random += ALPHABET[byte % ALPHABET.length];
        }
    }
    else {
        for (let i = 0; i < 12; i++) {
            random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
        }
    }
    return `${prefix}_${random}`;
}
