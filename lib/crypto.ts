import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getDerivedKey(userId: string): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET!
  return createHmac('sha256', secret).update(userId).digest()
}

export function encryptApiKey(plaintext: string, userId: string): string {
  const key = getDerivedKey(userId)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: base64(iv + authTag + ciphertext)
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

export function decryptApiKey(encryptedBase64: string, userId: string): string {
  const key = getDerivedKey(userId)
  const combined = Buffer.from(encryptedBase64, 'base64')
  const iv = combined.subarray(0, 12)
  const authTag = combined.subarray(12, 28)
  const ciphertext = combined.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}
