/**
 * /notes/ 内容加密（构建时，Node 侧）。
 *
 * 算法与前端 WebCrypto 对齐：AES-256-GCM，key = SHA-256(密码)，
 * 每次构建随机 12 字节 IV。密文布局：base64( IV(12) || ciphertext+tag )。
 * 前端用同一密码 SHA-256 出 key 解密；密码错则 GCM 校验失败，看不到明文。
 */
import { createHash, createCipheriv, randomBytes } from 'node:crypto';

export function encryptNotes(html: string, passcode: string): string {
  const key = createHash('sha256').update(passcode, 'utf8').digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(html, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // WebCrypto 的 decrypt 期望 ciphertext 后紧跟 16 字节 tag
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}
