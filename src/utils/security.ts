import { logger } from './logger';

/**
 * 生成稳定的浏览器标识
 * 注意：只使用不会因系统更新而变化的因素
 * 避免使用 userAgent（浏览器版本变化）、屏幕分辨率（可能切换显示器）等
 */
const getStableIdentifier = (): string => {
  try {
    // 使用稳定的因素：
    // 1. 语言设置（很少变化）
    // 2. 时区（几乎不变）
    // 3. 固定盐值（保证一致性）
    const components = [
      navigator.language || 'zh-CN',
      new Date().getTimezoneOffset()?.toString() || '0',
      'haui-stable-key-v1',  // 版本化的固定盐值
    ];
    return components.join('|');
  } catch {
    return 'haui-default-key';
  }
};

/**
 * 获取或创建持久化加密密钥
 * 存储在 localStorage 中，系统更新、浏览器升级均不影响
 */
const getOrCreateEncryptionKey = (): string => {
  const KEY_STORAGE_NAME = 'haui_ek_v2';
  try {
    let storedKey = localStorage.getItem(KEY_STORAGE_NAME);
    if (storedKey) return storedKey;

    // 首次使用：生成随机密钥并持久化
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    storedKey = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(KEY_STORAGE_NAME, storedKey);
    return storedKey;
  } catch {
    // localStorage 不可用时使用固定密钥
    return 'haui-static-fallback-key-v2';
  }
};

/**
 * 简单的字符串哈希函数
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32bit 整数
  }
  return Math.abs(hash);
};

/**
 * 生成 XOR 密钥
 */
const generateXorKey = (seed: string): number[] => {
  const hash = simpleHash(seed);
  const key: number[] = [];
  // 生成 16 字节的密钥
  for (let i = 0; i < 16; i++) {
    key.push((hash + i * 31) % 256);
  }
  return key;
};

/**
 * XOR 加密/解密（对称操作）
 */
const xorEncrypt = (data: string, key: number[]): string => {
  const chars: number[] = [];
  for (let i = 0; i < data.length; i++) {
    chars.push(data.charCodeAt(i) ^ key[i % key.length]);
  }
  return String.fromCharCode(...chars);
};

/**
 * 将字符串转换为 Base64URL 格式（更安全的 URL 编码）
 */
const toBase64Url = (str: string): string => {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * 从 Base64URL 格式还原字符串
 */
const fromBase64Url = (str: string): string => {
  // 还原填充
  const padding = 4 - (str.length % 4);
  if (padding !== 4) {
    str += '='.repeat(padding);
  }
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
};

/**
 * 添加随机前缀混淆
 */
const addObfuscation = (data: string): string => {
  const randomPrefix = Math.random().toString(36).substring(2, 6);
  return randomPrefix + data;
};

/**
 * 移除混淆前缀
 */
const removeObfuscation = (data: string): string => {
  return data.substring(4); // 移除 4 字符前缀
};

/**
 * 增强版 Token 加密
 * 使用多层混淆：XOR + Base64URL + 随机前缀
 * 注意：使用稳定标识符而非浏览器指纹，避免系统更新后解密失败
 */
export const encryptToken = (token: string): string => {
  if (!token) return '';
  try {
    // 第一层：XOR 加密（使用持久化密钥，不受系统更新影响）
    const encryptionKey = getOrCreateEncryptionKey();
    const xorKey = generateXorKey(encryptionKey);
    const xorEncrypted = xorEncrypt(token, xorKey);

    // 第二层：Base64URL 编码
    const base64Encoded = toBase64Url(xorEncrypted);

    // 第三层：添加随机前缀混淆
    const obfuscated = addObfuscation(base64Encoded);

    // 第四层：再次 Base64URL 编码（包装层）
    return toBase64Url(obfuscated);
  } catch (e) {
    logger.error('Token 加密失败', e);
    // 降级为简单 Base64
    try {
      return btoa(unescape(encodeURIComponent(token)));
    } catch {
      return token;
    }
  }
};

/**
 * 检测 Token 是否为有效格式（非乱码）
 * 有效的 HA Token 应该是可打印 ASCII 字符
 */
const isValidDecodedToken = (token: string): boolean => {
  if (!token || token.length < 20) return false;

  // 严格校验：有效 HA Token (JWT) 只包含可打印 ASCII 字符
  // 任何控制字符或高位字符都说明解密结果是乱码
  for (let i = 0; i < token.length; i++) {
    const code = token.charCodeAt(i);
    if (code < 32 || code > 126) {
      return false;
    }
  }

  return true;
};

/**
 * 增强版 Token 解密
 * 支持多版本兼容和乱码检测
 */
export const decryptToken = (encryptedToken: string): string => {
  if (!encryptedToken) return '';

  // 尝试识别是否为旧版的 AES 加密特征
  if (encryptedToken.startsWith('U2FsdGVkX1')) {
    logger.warn('检测到旧版 AES 密钥，为避免依赖丢失，将返回空值以供重置。请重新输入 HA Token。');
    return '';
  }
  
  // 检测是否已经是明文 Token（以 eyJ 开头的 JWT 格式）
  if (encryptedToken.startsWith('eyJ') && isValidDecodedToken(encryptedToken)) {
    return encryptedToken;
  }

  // 优先使用持久化密钥解密（最可靠，不受系统更新影响）
  try {
    const outerDecoded1 = fromBase64Url(encryptedToken);
    const deobfuscated1 = removeObfuscation(outerDecoded1);
    const innerDecoded1 = fromBase64Url(deobfuscated1);
    const storedKey = getOrCreateEncryptionKey();
    const xorKey1 = generateXorKey(storedKey);
    const decrypted1 = xorEncrypt(innerDecoded1, xorKey1);
    if (isValidDecodedToken(decrypted1)) return decrypted1;
  } catch {
    // 持久化密钥解密失败，继续尝试旧格式
  }

  // 尝试旧版稳定标识符解密（兼容迁移前数据）
  try {
    // 第一层：Base64URL 解码（外层）
    const outerDecoded = fromBase64Url(encryptedToken);

    // 第二层：移除混淆前缀
    const deobfuscated = removeObfuscation(outerDecoded);

    // 第三层：Base64URL 解码（内层）
    const innerDecoded = fromBase64Url(deobfuscated);

    // 第四层：XOR 解密（使用稳定标识符）
    const stableId = getStableIdentifier();
    const xorKey = generateXorKey(stableId);
    const decrypted = xorEncrypt(innerDecoded, xorKey);

    // 验证解密结果是否有效
    if (isValidDecodedToken(decrypted)) {
      return decrypted;
    }
    
    // 如果新版解密得到乱码，尝试使用旧版浏览器指纹解密
    logger.warn('Token 解密结果疑似乱码，尝试旧版指纹解密...');
    throw new Error('New format decryption produced invalid result');
  } catch (e) {
    // 尝试旧版浏览器指纹解密（兼容已存储的旧数据）
    try {
      const outerDecoded = fromBase64Url(encryptedToken);
      const deobfuscated = removeObfuscation(outerDecoded);
      const innerDecoded = fromBase64Url(deobfuscated);
      
      // 使用旧版浏览器指纹
      const oldFingerprint = getOldBrowserFingerprint();
      const xorKey = generateXorKey(oldFingerprint);
      const decrypted = xorEncrypt(innerDecoded, xorKey);
      
      if (isValidDecodedToken(decrypted)) {
        logger.info('Token 使用旧版指纹解密成功');
        return decrypted;
      }
    } catch {
      // 旧版解密也失败
    }
    
    // 尝试简单 Base64 解码
    try {
      const decoded = decodeURIComponent(escape(atob(encryptedToken)));
      if (isValidDecodedToken(decoded)) {
        return decoded;
      }
    } catch {
      // Base64 解码失败
    }
    
    // 所有解密方式都失败，返回空字符串触发重新配置
    logger.warn('Token 解密失败，可能因系统更新导致加密密钥变化。请重新输入 Token。');
    return '';
  }
};

/**
 * 旧版浏览器指纹（用于兼容已存储的旧数据）
 * 注意：这个函数会返回当前浏览器指纹，用于尝试解密旧数据
 */
const getOldBrowserFingerprint = (): string => {
  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth?.toString(),
      new Date().getTimezoneOffset()?.toString(),
      navigator.hardwareConcurrency?.toString(),
    ].filter(Boolean);
    return components.join('|');
  } catch {
    return 'default-key';
  }
};

