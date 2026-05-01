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
}

export interface CameraDashboardState {
    layouts: CameraLayoutItem[];
    activeCameras: CameraConfig[];
}
