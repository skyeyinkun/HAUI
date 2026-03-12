import React, { useEffect, useRef } from 'react';

interface EzvizStreamPlayerProps {
    cameraId: string;
    url: string;
    accessToken: string;
}

export const EzvizStreamPlayer: React.FC<EzvizStreamPlayerProps> = ({ cameraId, url, accessToken }) => {
    // DOM 节点 ID，为了确保不受特殊字符影响，过滤掉乱码转横杠
    const containerId = `ezviz-${cameraId.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const playerInstanceRef = useRef<any>(null);

    useEffect(() => {
        const initPlayer = async () => {
            try {
                // 动态导入 ezuikit-js，避免构建时缺包报错
                let EZUIKit: any = null;
                try {
                    const mod = 'ezuikit-js';
                    EZUIKit = (await import(/* @vite-ignore */ mod)).default;
                } catch {
                    // 模块未安装时，回退到全局挂载
                    console.warn('ezuikit-js 模块未安装，尝试使用全局 EZUIKit');
                }

                // 兼容有些环境挂在 window 上或是 npm 模块导入
                const PlayerClass = (window as any).EZUIKit?.EZUIKitPlayer || EZUIKit?.EZUIKitPlayer || EZUIKit;
                if (!PlayerClass) {
                    console.error("未能找到 EZUIKit 构造函数, 检查库包被正确导入", PlayerClass);
                    return;
                }
                
                playerInstanceRef.current = new PlayerClass({
                    id: containerId, // 直接绑定到底下的 DOM
                    accessToken: accessToken,
                    url: url,
                    template: 'standard', // simple, standard, standard_live, security 
                    audio: 0, // 初始静音，保证自动播放成功
                    width: '100%',
                    height: '100%',
                });
            } catch (e) {
                console.error("EZUIKit.EZUIKitPlayer 初始化抛错: ", e);
            }
        };

        // DOM 真实尺寸由于 Grid 可能会推迟，稍微加上一个延时保证尺寸正确计算
        const timer = setTimeout(initPlayer, 200);

        // =========================================================
        // 【核心生命周期析构】关闭该组件时，务必定点清除 WebSocket 长链接
        // =========================================================
        return () => {
            clearTimeout(timer);
            if (playerInstanceRef.current) {
                try {
                    if (typeof playerInstanceRef.current.stop === 'function') {
                        playerInstanceRef.current.stop();
                    }
                    if (typeof playerInstanceRef.current.destroy === 'function') {
                        playerInstanceRef.current.destroy();
                    }
                } catch(e) {
                    // 有的 EZUI 版本 destroy 可能实现瑕疵抛错，要 catch 住并释放对象避免阻塞 React 卸载
                    console.error("解绑和销毁 EZUIKitPlayer 过程中抛错: ", e);
                }
                playerInstanceRef.current = null;
            }
        };
    }, [containerId, url, accessToken]);

    return (
        <div 
            id={containerId} 
            className="w-full h-full bg-black overflow-hidden flex items-center justify-center pointer-events-auto"
        />
    );
};
