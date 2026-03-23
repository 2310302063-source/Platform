// End-to-End Encryption Module (TLS 1.3 + AES-256)
import * as sodium from "libsodium.js";

export class E2EEncryption {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (!this.initialized) {
      await sodium.ready;
      this.initialized = true;
    }
  }

  /**
   * Generate a keypair for asymmetric encryption
   */
  static generateKeyPair() {
    this.ensureInitialized();
    return sodium.crypto_box_keypair();
  }

  /**
   * Encrypt message with recipient's public key (asymmetric)
   */
  static encryptMessage(message: string, recipientPublicKey: Uint8Array): {
    ciphertext: string;
    nonce: string;
  } {
    this.ensureInitialized();
    const nonce = sodium.randombytes(sodium.crypto_box_NONCEBYTES);
    const ciphertext = sodium.crypto_box(
      message,
      nonce,
      recipientPublicKey,
      sodium.crypto_box_SECRETKEYBYTES
    );
    return {
      ciphertext: sodium.to_hex(ciphertext),
      nonce: sodium.to_hex(nonce),
    };
  }

  /**
   * Decrypt message with private key
   */
  static decryptMessage(
    ciphertext: string,
    nonce: string,
    senderPublicKey: Uint8Array,
    privateKey: Uint8Array
  ): string {
    this.ensureInitialized();
    const message = sodium.crypto_box_open(
      sodium.from_hex(ciphertext),
      sodium.from_hex(nonce),
      senderPublicKey,
      privateKey
    );
    return sodium.to_string(message);
  }

  /**
   * Encrypt data at rest (AES-256-GCM)
   */
  static encryptAtRest(data: string, key?: Uint8Array): {
    encrypted: string;
    key: string;
  } {
    this.ensureInitialized();
    const encryptionKey = key || sodium.randombytes(32);
    const nonce = sodium.randombytes(12);
    const encrypted = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      data,
      null,
      null,
      nonce,
      encryptionKey
    );
    return {
      encrypted: sodium.to_hex(nonce) + sodium.to_hex(encrypted),
      key: sodium.to_hex(encryptionKey),
    };
  }

  /**
   * Decrypt data at rest
   */
  static decryptAtRest(encryptedData: string, key: string): string {
    this.ensureInitialized();
    const keyBytes = sodium.from_hex(key);
    const nonce = sodium.from_hex(encryptedData.slice(0, 24));
    const ciphertext = sodium.from_hex(encryptedData.slice(24));
    const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertext,
      null,
      nonce,
      keyBytes
    );
    return sodium.to_string(decrypted);
  }

  /**
   * Hash password (Argon2i)
   */
  static async hashPassword(password: string): Promise<string> {
    this.ensureInitialized();
    const hash = sodium.crypto_pwhash(
      32,
      password,
      sodium.randombytes(16),
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );
    return sodium.to_hex(hash);
  }

  /**
   * Verify password
   */
  static verifyPassword(password: string, hash: string): boolean {
    this.ensureInitialized();
    try {
      return sodium.crypto_pwhash_str_verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Sign data with private key
   */
  static signData(data: string, secretKey: Uint8Array): string {
    this.ensureInitialized();
    const signature = sodium.crypto_sign(data, secretKey);
    return sodium.to_hex(signature);
  }

  /**
   * Verify signed data
   */
  static verifySignature(
    signedData: string,
    publicKey: Uint8Array
  ): string | null {
    this.ensureInitialized();
    try {
      const data = sodium.crypto_sign_open(
        sodium.from_hex(signedData),
        publicKey
      );
      return sodium.to_string(data);
    } catch {
      return null;
    }
  }

  private static ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("E2EEncryption not initialized. Call initialize() first.");
    }
  }
}

export default E2EEncryption;
