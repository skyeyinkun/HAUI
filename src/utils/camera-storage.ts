/**
 * 摄像头配置持久化工具
 * 使用 AES 加密敏感信息后存储到 localStorage
 */
import { CameraConfig, CameraWallLayout } from '@/types/camera';
import { encryptToken, decryptToken } from '@/utils/security';

/** localStorage 存储键 */
const STORAGE_KEY = 'camera_configs';
/** 画面墙布局存储键 */
const WALL_STORAGE_KEY = 'camera_wall_layout';

/** 需要加密的敏感字段路径（section.field 格式） */
const SENSITIVE_FIELDS = [
    'rtsp.password',
    'onvif.password',
    'ezviz.appSecret',
    'ezviz.validateCode',
    'aqara.appKey',
    'aqara.accessToken',
    'aqara.password',
] as const;

/**
 * 深拷贝对象并对敏感字段执行加密/解密
 * @param config 摄像头配置
 * @param fn 加密或解密函数
 */
function processConfig(
    config: CameraConfig,
    fn: (val: string) => string
): CameraConfig {
    // 深拷贝避免污染原对象
    const c = JSON.parse(JSON.stringify(config)) as CameraConfig;

    for (const path of SENSITIVE_FIELDS) {
        const [section, field] = path.split('.') as [keyof CameraConfig, string];
        const sub = c[section] as Record<string, any> | undefined;
        if (sub && typeof sub[field] === 'string' && sub[field]) {
            sub[field] = fn(sub[field]);
        }
    }
    return c;
}

/** 读取所有摄像头配置（自动解密） */
export function loadCameraConfigs(): CameraConfig[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        let list: CameraConfig[] = JSON.parse(raw);
        // 自动修复：确保每个配置都有唯一 ID
        let changed = false;
        list = list.map(c => {
            if (!c.id) {
                c.id = `cam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                changed = true;
            }
            return processConfig(c, decryptToken);
        });
        if (changed) {
            saveCameraConfigs(list);
        }
        return list;
    } catch {
        return [];
    }
}

/** 保存所有摄像头配置（自动加密） */
export function saveCameraConfigs(configs: CameraConfig[]): void {
    const encrypted = configs.map((c) => processConfig(c, encryptToken));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
}

/** 新增一条配置 */
export function addCameraConfig(config: CameraConfig): CameraConfig[] {
    const list = loadCameraConfigs();
    list.push(config);
    saveCameraConfigs(list);
    return list;
}

/** 更新一条配置 */
export function updateCameraConfig(config: CameraConfig): CameraConfig[] {
    let list = loadCameraConfigs();
    list = list.map((c) => (c.id === config.id ? config : c));
    saveCameraConfigs(list);
    return list;
}

/** 删除一条配置 */
export function deleteCameraConfig(id: string): CameraConfig[] {
    let list = loadCameraConfigs();
    list = list.filter((c) => c.id !== id);
    saveCameraConfigs(list);
    return list;
}

/** 读取画面墙布局配置 */
export function loadCameraWallLayout(): CameraWallLayout | null {
    try {
        const raw = localStorage.getItem(WALL_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CameraWallLayout;
    } catch {
        return null;
    }
}

/** 保存画面墙布局配置 */
export function saveCameraWallLayout(layout: CameraWallLayout): void {
    localStorage.setItem(WALL_STORAGE_KEY, JSON.stringify(layout));
}
