import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Lock, AlertTriangle } from 'lucide-react';
import { encryptToken, decryptToken } from '@/utils/security';

interface SecureActionConfirmProps {
  /** 是否显示对话框 */
  isOpen: boolean;
  /** 关闭对话框 */
  onClose: () => void;
  /** 确认后的回调 */
  onConfirm: () => void;
  /** 操作标题 */
  title?: string;
  /** 操作描述 */
  description?: string;
  /** 危险等级 */
  severity?: 'high' | 'medium' | 'low';
}

const STORAGE_KEY = 'haui_security_pin';

/**
 * 安全操作确认组件
 * 用于公网访问时的二次确认，支持 PIN 码验证
 */
export const SecureActionConfirm: React.FC<SecureActionConfirmProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '安全验证',
  description = '此操作涉及安全敏感功能，请输入 PIN 码继续',
  severity = 'high',
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');

  // 检查是否已设置 PIN 码
  const hasPinSet = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return !!stored && stored.length > 0;
    } catch {
      return false;
    }
  }, []);

  // 验证 PIN 码
  const verifyPin = useCallback((inputPin: string): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const decrypted = decryptToken(stored);
      return decrypted === inputPin;
    } catch {
      return false;
    }
  }, []);

  // 设置新 PIN 码
  const savePin = useCallback((pinToSave: string): boolean => {
    try {
      const encrypted = encryptToken(pinToSave);
      localStorage.setItem(STORAGE_KEY, encrypted);
      return true;
    } catch {
      return false;
    }
  }, []);

  // 重置状态当对话框打开时
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setNewPin('');
      setConfirmPin('');
      setIsSettingPin(!hasPinSet());
    }
  }, [isOpen, hasPinSet]);

  // 处理确认
  const handleConfirm = () => {
    if (isSettingPin) {
      // 设置新 PIN 码
      if (newPin.length < 4) {
        setError('PIN 码至少需要 4 位');
        return;
      }
      if (newPin !== confirmPin) {
        setError('两次输入的 PIN 码不一致');
        return;
      }
      if (savePin(newPin)) {
        setIsSettingPin(false);
        setError('');
        // 设置成功后继续验证流程
        setPin(newPin);
      } else {
        setError('PIN 码保存失败，请重试');
      }
    } else {
      // 验证 PIN 码
      if (pin.length === 0) {
        setError('请输入 PIN 码');
        return;
      }
      if (verifyPin(pin)) {
        setPin('');
        setError('');
        onConfirm();
        onClose();
      } else {
        setError('PIN 码错误，请重试');
        setPin('');
      }
    }
  };

  // 处理取消
  const handleCancel = () => {
    setPin('');
    setError('');
    setNewPin('');
    setConfirmPin('');
    onClose();
  };

  // 根据危险等级获取颜色
  const getSeverityColor = () => {
    switch (severity) {
      case 'high':
        return 'text-red-500 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-500 bg-blue-50 border-blue-200';
      default:
        return 'text-red-500 bg-red-50 border-red-200';
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleCancel}
          />

          {/* 对话框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            onKeyDown={handleKeyDown}
          >
            <div className="bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden mx-4">
              {/* 头部 */}
              <div className={`px-6 py-4 border-b ${getSeverityColor()}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-white/80`}>
                      {severity === 'high' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Shield className="w-5 h-5" />
                      )}
                    </div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-1 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 内容 */}
              <div className="p-6">
                <p className="text-muted-foreground mb-6">{description}</p>

                {isSettingPin ? (
                  // 设置 PIN 码界面
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Lock className="w-4 h-4 inline mr-1" />
                        设置 PIN 码
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="请输入 4-6 位数字"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">确认 PIN 码</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="再次输入 PIN 码"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PIN 码将在本地加密存储，用于验证敏感操作
                    </p>
                  </div>
                ) : (
                  // 验证 PIN 码界面
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Lock className="w-4 h-4 inline mr-1" />
                        输入 PIN 码
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => {
                        setIsSettingPin(true);
                        setPin('');
                        setError('');
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      忘记 PIN 码？重新设置
                    </button>
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-sm text-red-500 text-center"
                  >
                    {error}
                  </motion.p>
                )}

                {/* 按钮 */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-3 rounded-xl border border-input bg-background hover:bg-accent transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition-colors ${
                      severity === 'high'
                        ? 'bg-red-500 hover:bg-red-600'
                        : severity === 'medium'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isSettingPin ? '设置并继续' : '确认'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * 检查是否已设置安全 PIN 码
 */
export function hasSecurityPin(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return !!stored && stored.length > 0;
  } catch {
    return false;
  }
}

/**
 * 清除安全 PIN 码
 */
export function clearSecurityPin(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略错误
  }
}

export default SecureActionConfirm;
