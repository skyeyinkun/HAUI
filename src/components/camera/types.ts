import { Layout } from 'react-grid-layout';

export interface CameraConfig {
    id: string; // Camera Entity ID 或者是 设备的序列号
    name: string;
    type: 'ezviz' | 'ha-hls';
    url?: string; // Home Assistant 的代理 HLS URL 或是 萤石云的 ezopen:// url
    accessToken?: string; // 仅萤石云设备需要 accessToken
}

export interface CameraDashboardState {
    layouts: Layout[];
    activeCameras: CameraConfig[];
}
