import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface TouchableProps extends Omit<HTMLMotionProps<'div'>, 'whileTap'> {
  children: React.ReactNode;
  /** 点击时的缩放比例，默认 0.95 */
  scale?: number;
  /** 是否禁用触控反馈 */
  disabled?: boolean;
  /** 是否正在加载中 */
  loading?: boolean;
  /** 点击回调 */
  onClick?: (e: React.MouseEvent) => void;
  /** 自定义 className */
  className?: string;
}

/**
 * 触控反馈包装组件
 * 为卡片和按钮提供统一的触控反馈效果
 * 
 * @example
 * // 基础用法
 * <Touchable onClick={handleClick}>
 *   <div>卡片内容</div>
 * </Touchable>
 * 
 * // 自定义缩放比例
 * <Touchable scale={0.9} onClick={handleClick}>
 *   <button>按钮</button>
 * </Touchable>
 * 
 * // 禁用状态
 * <Touchable disabled onClick={handleClick}>
 *   <div>禁用状态</div>
 * </Touchable>
 */
export const Touchable: React.FC<TouchableProps> = ({
  children,
  scale = 0.95,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...motionProps
}) => {
  const { reduceMotion } = useReducedMotion();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || loading) return;
    
    // 添加触觉反馈（如果设备支持）
    if (window.navigator?.vibrate && !reduceMotion) {
      window.navigator.vibrate(10);
    }
    
    onClick?.(e);
  };

  // 如果减少动画或禁用，使用普通 div
  if (reduceMotion || disabled) {
    return (
      <div
        className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleClick}
        {...(motionProps as any)}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      whileTap={disabled || loading ? undefined : { scale }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

/**
 * 按钮专用的触控反馈组件
 * 包含涟漪效果（可选）
 */
interface TouchableButtonProps {
  children: React.ReactNode;
  /** 点击时的缩放比例 */
  scale?: number;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  'aria-label'?: string;
}

export const TouchableButton: React.FC<TouchableButtonProps> = ({
  children,
  scale = 0.95,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  title,
  'aria-label': ariaLabel,
}) => {
  const { reduceMotion } = useReducedMotion();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    // 触觉反馈
    if (window.navigator?.vibrate && !reduceMotion) {
      window.navigator.vibrate(10);
    }
    
    onClick?.(e);
  };

  const baseClasses = `
    relative overflow-hidden
    transition-all duration-150
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
    ${className}
  `;

  // 如果减少动画，使用普通按钮样式
  if (reduceMotion) {
    return (
      <button
        type={type}
        className={baseClasses}
        disabled={disabled}
        onClick={handleClick}
        title={title}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      type={type}
      className={baseClasses}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  );
};

export default Touchable;
