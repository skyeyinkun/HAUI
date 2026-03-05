export const encryptToken = (token: string): string => {
  if (!token) return '';
  try {
    // 采用 Base64 混淆方式，仅为了防止屏幕截图中直接泄露原始凭证
    // 在真实 HA 本地环境中前端加密是无实际防盗取意义的
    return btoa(unescape(encodeURIComponent(token)));
  } catch (e) {
    console.error('编码失败', e);
    return token;
  }
};

export const decryptToken = (encryptedToken: string): string => {
  if (!encryptedToken) return '';
  try {
    // 尝试识别是否为旧版的 AES 加密特征，如果是，则可能解密失败，返回截断或回退为原文本
    if (encryptedToken.startsWith('U2FsdGVkX1')) {
      console.warn('检测到旧版 AES 密钥，为避免依赖丢失，将返回原始令牌以供重置。请重新输入 HA Token。');
    }
    return decodeURIComponent(escape(atob(encryptedToken)));
  } catch (e) {
    // 若无法解码，则判定其可能是明文或者旧加密物，直接返回
    return encryptedToken;
  }
};

