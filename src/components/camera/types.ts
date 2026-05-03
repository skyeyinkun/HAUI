// 摄像头布局项接口
export interface CameraLayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface CameraConfig {
    id: string; // Camera Entity ID 或者是 设备的序列号
    name: string;
    type: 'ezviz' | 'ha-hls' | 'rtsp';
    url?: string; // Home Assistant 的代理 HLS URL 或是 萤石云的 ezopen:// url
    accessToken?: string; // 仅萤石云设备需要 accessToken
    go2rtcUrl?: string; // go2rtc 服务地址，如 http://192.168.1.100:1984
    streamName?: string; // go2rtc 中配置的流名称
    entityId?: string; // 可选：Home Assistant camera/entity_id，用于测试和 PTZ 控制
    mutedByDefault?: boolean; // 墙屏/公共空间默认静音
    privacyMode?: boolean; // 隐私模式：默认不自动预览
}

export interface CameraDashboardState {
    layouts: CameraLayoutItem[];
    activeCameras: CameraConfig[];
}
