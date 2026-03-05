/**
 * 摄像头相关类型定义
 * 支持：RTSP、ONVIF、Home Assistant、萤石云(Ezviz)、Aqara(绿米)
 * 所有需要在浏览器中播放的 RTSP/ONVIF 流均需通过 go2rtc 代理转码
 */

/** 摄像头接入方式枚举 */
export type CameraSourceType = 'rtsp' | 'onvif' | 'hass' | 'ezviz' | 'aqara';

/**
 * go2rtc 代理配置
 * go2rtc 是目前最主流的摄像头流媒体代理，支持 RTSP/ONVIF → WebRTC/HLS/FLV
 * 项目地址：https://github.com/AlexxIT/go2rtc
 * 在 HA 中可安装 go2rtc Add-on 或独立部署
 */
export interface Go2rtcConfig {
  /**
   * go2rtc 服务器地址（不含路径）
   * 例：http://192.168.1.100:1984  或  /go2rtc（反向代理路径）
   */
  apiUrl: string;
  /**
   * go2rtc 中该摄像头的流名称（stream name）
   * 在 go2rtc 配置文件中定义，例：front_door
   */
  streamName: string;
  /**
   * 优先使用的播放协议，默认 webrtc
   * - webrtc：最低延迟（< 200ms），需要浏览器支持 WebRTC
   * - hls：兼容性最好，延迟约 2~5s
   * - flv：延迟约 0.5~2s，需浏览器支持 MSE
   */
  preferredProtocol?: 'webrtc' | 'hls' | 'flv';
}

/** RTSP 配置 */
export interface RtspConfig {
  /** RTSP 流地址，例如 rtsp://192.168.1.100:554/stream1 */
  streamUrl: string;
  /** 用户名（可选，也可直接内嵌在 URL 中）*/
  username?: string;
  /** 密码（可选）*/
  password?: string;
  /**
   * 是否通过 go2rtc 代理播放（推荐）
   * 原生 rtsp:// 无法在浏览器直接播放，需要转码代理
   * 若 URL 是 http:// 开头（MJPEG/HTTP-FLV）则可不配置代理
   */
  go2rtc?: Go2rtcConfig;
}

/** ONVIF 配置 */
export interface OnvifConfig {
  /** 设备 IP 或主机名 */
  host: string;
  /** ONVIF 端口，默认 80，部分设备为 8080 */
  port: number;
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 视频流 Profile Token（可选，留空自动选择第一个 Profile）*/
  profileToken?: string;
  /**
   * go2rtc 代理配置（ONVIF 必须通过 go2rtc 代理播放）
   * go2rtc 原生支持 ONVIF 源，配置后可直接出 WebRTC/HLS/FLV
   */
  go2rtc?: Go2rtcConfig;
}

/** Home Assistant 摄像头配置 */
export interface HassConfig {
  /** HA 中的 entity_id，例如 camera.front_door */
  entityId: string;
  /**
   * 流类型偏好
   * - snapshot：静态图片（最兼容，通过 /api/camera_proxy）
   * - stream：HLS 直播流（通过 HA camera/stream API，需要 stream 集成）
   */
  streamMode?: 'snapshot' | 'stream';
}

/** 萤石云配置 */
export interface EzvizConfig {
  /** 萤石云 AppKey（在 https://open.ys7.com 申请）*/
  appKey: string;
  /** 萤石云 AppSecret */
  appSecret: string;
  /** 设备序列号（设备背面标签）*/
  deviceSerial: string;
  /** 通道号，默认 1 */
  channelNo: number;
  /** 设备验证码（部分加密型摄像头需要）*/
  validateCode?: string;
  /**
   * 视频质量
   * - 0: 最清晰
   * - 1: 均衡
   * - 2: 最流畅
   */
  quality?: 0 | 1 | 2;
  /**
   * 协议类型
   * - 1: 国标 ezopen（默认，萤石专用）
   * - 2: HLS
   * - 3: FLV（RTMP 转 HTTP-FLV）
   */
  protocol?: 1 | 2 | 3;
}

/**
 * Aqara（绿米）品牌摄像头配置
 * 支持通过 Aqara Home 开放平台 API 或直连方式接入
 */
export interface AqaraConfig {
  /** 接入方式：'cloud' 云端 API，'local' 局域网直连 */
  mode: 'cloud' | 'local';
  /** Aqara 开放平台设备类型字符串；摄像头对应 "Camera" */
  deviceType?: string;
  /** Aqara 开放平台 AppId（云端模式）*/
  appId?: string;
  /** Aqara 开放平台 AppKey（云端模式）*/
  appKey?: string;
  /** Aqara 账号 AccessToken（云端模式，需提前通过 OAuth 获取）*/
  accessToken?: string;
  /** 设备 DID / SubjectId（云端模式）*/
  deviceDid?: string;
  /** 设备 IP 地址（局域网直连模式）*/
  host?: string;
  /** HTTP 端口，默认 80（局域网模式）*/
  port?: number;
  /** 用户名（局域网模式）*/
  username?: string;
  /** 密码（局域网模式）*/
  password?: string;
  /**
   * 流类型：
   * - 'main' 主码流（高清）
   * - 'sub'  子码流（流畅）
   */
  streamType?: 'main' | 'sub';
}

/** 摄像头画面墙布局枚举 */
export type CameraLayout =
  | '1x1'   // 单画面
  | '2x2'   // 四画面
  | '3x3'   // 九画面
  | '1+2'   // 一大两小（左大右两小）
  | '1+3'   // 一大三小（上大下三小）
  | '2+4';  // 两大四小

/** 每种布局对应的格子数量 */
export const LAYOUT_SLOT_COUNT: Record<CameraLayout, number> = {
  '1x1': 1,
  '2x2': 4,
  '3x3': 9,
  '1+2': 3,
  '1+3': 4,
  '2+4': 6,
};

/** 摄像头配置联合类型 */
export interface CameraConfig {
  /** 唯一标识 */
  id: string;
  /** 用户自定义名称 */
  name: string;
  /** 接入方式 */
  sourceType: CameraSourceType;
  /** RTSP 配置 */
  rtsp?: RtspConfig;
  /** ONVIF 配置 */
  onvif?: OnvifConfig;
  /** Home Assistant 配置 */
  hass?: HassConfig;
  /** 萤石云配置 */
  ezviz?: EzvizConfig;
  /** Aqara（绿米）摄像头配置 */
  aqara?: AqaraConfig;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: number;
}

/** 画面墙布局配置 */
export interface CameraWallLayout {
  /** 布局类型 */
  layout: CameraLayout;
  /**
   * 各格子对应的摄像头 ID
   * 长度 = 布局中的格子数，null 表示空格
   */
  slots: (string | null)[];
}

/**
 * 萤石云 API 获取流地址的响应
 * 参考：https://open.ys7.com/help/video_open#live-address
 */
export interface EzvizStreamResponse {
  code: string;
  msg: string;
  data?: {
    id: string;
    deviceSerial: string;
    channelNo: number;
    url: string;         // HLS 或 FLV 地址
    expireTime: number;  // 过期时间戳（ms）
    supportedProtocols?: number[];
  };
}
