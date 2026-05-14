import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, createVerify, randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// HA Add-on 持久化存储目录（HA Supervisor 会将 /data 映射为持久卷）
const DATA_DIR = '/data';
const CONFIG_FILE = path.join(DATA_DIR, 'haui_config.json');
const LICENSE_FILE_NAME = 'haui_license.json';
const BACKUP_DIR_NAME = 'backups';
// AI 配置独立存储，避免与面板数据混淆
const AI_CONFIG_FILE_NAME = 'haui_ai_config.json';
const INSTALL_ID_FILE_NAME = 'haui_install_id';
const DEFAULT_LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEuZo0V6xDaIWCHnIYawR2B46F4u6q
pM0ITabLwiVRmoOnChWTUQTX7WhXDwskuU/KfDpQplllG/p2OS90lj+Nqw==
-----END PUBLIC KEY-----`;

// 兼容本地开发时没有 /data 目录的情况
const LOCAL_DATA_DIR = path.join(__dirname, '.data');
const LOCAL_CONFIG_FILE = path.join(LOCAL_DATA_DIR, 'haui_config.json');
const ADDON_OPTIONS_FILE = '/data/options.json';

function getConfigFile() {
    return fs.existsSync(DATA_DIR) ? CONFIG_FILE : LOCAL_CONFIG_FILE;
}

function getAiConfigFile() {
    const dir = fs.existsSync(DATA_DIR) ? DATA_DIR : LOCAL_DATA_DIR;
    return path.join(dir, AI_CONFIG_FILE_NAME);
}

function getDataDir() {
    return fs.existsSync(DATA_DIR) ? DATA_DIR : LOCAL_DATA_DIR;
}

function getLicenseFile() {
    return path.join(getDataDir(), LICENSE_FILE_NAME);
}

function getBackupDir() {
    return path.join(getDataDir(), BACKUP_DIR_NAME);
}

function getInstallIdFile() {
    return path.join(getDataDir(), INSTALL_ID_FILE_NAME);
}

function ensureConfig() {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = getConfigFile();
    if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
}

function canonicalStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
        .join(',')}}`;
}

function readJsonFile(file, fallback = {}) {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) { /* ignore */ }
    return fallback;
}

function readAddonOptions() {
    return readJsonFile(ADDON_OPTIONS_FILE, {});
}

function groupCode(raw) {
    return raw.match(/.{1,4}/g)?.join('-') ?? raw;
}

function getMachineCode() {
    ensureConfig();
    const file = getInstallIdFile();
    let installId = '';
    try {
        if (fs.existsSync(file)) {
            installId = fs.readFileSync(file, 'utf8').trim();
        }
        if (!installId) {
            installId = randomUUID();
            fs.writeFileSync(file, installId, { mode: 0o600 });
        }
    } catch (_) {
        installId = randomUUID();
    }

    const digest = createHash('sha256')
        .update(`HAUI:${installId}`)
        .digest('base64url')
        .toUpperCase()
        .replace(/[OIL]/g, 'X')
        .slice(0, 12);
    return `HAUI-MACHINE-${groupCode(digest)}`;
}

function getPublicKeyPem() {
    const options = readAddonOptions();
    const envKey = process.env.HAUI_LICENSE_PUBLIC_KEY
        || process.env.VITE_HAUI_LICENSE_PUBLIC_KEY
        || options.HAUI_LICENSE_PUBLIC_KEY;
    if (envKey && envKey.trim()) return envKey.replace(/\\n/g, '\n');
    const publicKeyFile = path.join(getDataDir(), 'license-public.pem');
    if (fs.existsSync(publicKeyFile)) return fs.readFileSync(publicKeyFile, 'utf8');
    return DEFAULT_LICENSE_PUBLIC_KEY;
}

function verifySignedLicense(license) {
    if (!license || typeof license !== 'object') {
        return { ok: false, error: '授权内容为空' };
    }
    if (license.algorithm !== 'ECDSA_P256_SHA256') {
        return { ok: false, error: '授权算法不匹配' };
    }
    if (license.payload?.product !== 'HAUI' || license.payload?.edition !== 'pro') {
        return { ok: false, error: '授权产品或版本不匹配' };
    }
    if (!license.payload?.licenseId || !license.payload?.machineCode || !license.payload?.updatesUntil || !license.signature) {
        return { ok: false, error: '授权缺少必要字段' };
    }
    if (license.payload.machineCode !== getMachineCode()) {
        return { ok: false, error: '授权文件与当前 HAUI 机器码不匹配' };
    }

    const publicKey = getPublicKeyPem();
    if (!publicKey) {
        return { ok: false, error: '授权公钥不可用' };
    }

    try {
        const verify = createVerify('SHA256');
        verify.update(canonicalStringify(license.payload));
        verify.end();
        const signatureOk = verify.verify(publicKey, Buffer.from(license.signature, 'base64url'));
        if (!signatureOk) return { ok: false, error: '授权签名验证失败' };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: `授权验证异常: ${e.message}` };
    }
}

function readStoredLicense() {
    const stored = readJsonFile(getLicenseFile(), null);
    if (!stored?.license) return null;
    return stored;
}

function getLicenseStatus() {
    const stored = readStoredLicense();
    if (!stored?.license) {
        return { active: false, edition: 'free', message: '系统未授权' };
    }

    const verification = verifySignedLicense(stored.license);
    if (!verification.ok) {
        return { active: false, edition: 'free', message: verification.error };
    }

    const payload = stored.license.payload;
    const today = new Date().toISOString().slice(0, 10);
    return {
        active: true,
        edition: payload.edition,
        payload,
        activatedAt: stored.activatedAt,
        updatesExpired: payload.updatesUntil < today,
        message: '系统已授权',
    };
}

function requireProFeature(feature) {
    return (req, res, next) => {
        const status = getLicenseStatus();
        if (!status.active) {
            return res.status(402).json({ error: '此功能需要 HAUI 授权', feature, license: status });
        }

        const features = new Set((status.payload?.features || []).map((item) => String(item).toLowerCase()));
        if (!features.has('pro') && feature && !features.has(feature)) {
            return res.status(403).json({ error: '当前授权未包含此功能', feature, license: status });
        }

        next();
    };
}

function requireActivated(req, res, next) {
    const pathname = req.path || '';
    const method = req.method || 'GET';
    const isLicenseStatus = method === 'GET' && pathname === '/api/license/status';
    const isLicenseActivate = method === 'POST' && pathname === '/api/license/activate';
    const isSystemStatus = method === 'GET' && pathname === '/api/system/status';
    if (isLicenseStatus || isLicenseActivate || isSystemStatus) return next();

    if (pathname.startsWith('/api/') || pathname.startsWith('/ha-api/')) {
        const status = getLicenseStatus();
        if (!status.active) {
            return res.status(402).json({ error: '系统未授权', license: status, machineCode: getMachineCode() });
        }
    }

    next();
}

function readAiConfig() {
    try {
        const file = getAiConfigFile();
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (_) { /* 读取失败返回空对象 */ }
    return {};
}

// 允许较大的 body（摄像头配置、用户头像 Base64、布局信息均可能较大）
app.use(express.json({ limit: '20mb' }));
app.use(requireActivated);

// ─── /ha-api 代理：将前端 REST 请求转发到 HA Core API ────────────────────────
// 在 HA Add-on 中，HA Core 可通过 http://supervisor/core 访问
// 前端 fetch('/ha-api/api/states') → Node → http://supervisor/core/api/states
// 鉴权：使用前端传入的 Authorization header（用户自己的 Long-Lived Token）
// 同时支持 SUPERVISOR_TOKEN 作为备用（当用户未传 token 时）
const HA_CORE_URL = process.env.HA_CORE_URL || 'http://supervisor/core';
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;

function getForwardedAuthHeader(req) {
    const standardAuth = req.headers['authorization'];
    const alternateAuth = req.headers['x-ha-authorization'];
    const rawToken = req.headers['x-ha-token'];

    if (standardAuth) return { value: standardAuth, source: 'authorization' };
    if (alternateAuth) return { value: alternateAuth, source: 'x-ha-authorization' };
    if (rawToken) return { value: `Bearer ${rawToken}`, source: 'x-ha-token' };
    if (SUPERVISOR_TOKEN) return { value: `Bearer ${SUPERVISOR_TOKEN}`, source: 'supervisor-token' };
    return { value: undefined, source: 'none' };
}

app.all(/^\/ha-api\/.*/, async (req, res) => {
    // 去掉 /ha-api 前缀，拼接到 HA Core 地址
    const haPath = req.path.replace(/^\/ha-api/, '');
    const targetUrl = `${HA_CORE_URL}${haPath}${req.url.includes('?') ? `?${req.url.split('?').slice(1).join('?')}` : ''}`;

    try {
        // 选用请求头中的 Authorization；HA Ingress 可能剥离标准头，因此支持备用头。
        const authHeader = getForwardedAuthHeader(req);

        const headers = {
            'Content-Type': req.headers['content-type'] || 'application/json',
        };
        if (authHeader.value) headers['Authorization'] = authHeader.value;

        // 构建 fetch 请求参数
        const fetchOpts = {
            method: req.method,
            headers,
        };
        // 对非 GET/HEAD 请求转发 body
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOpts.body = JSON.stringify(req.body);
        }

        const haRes = await fetch(targetUrl, fetchOpts);
        if (haRes.status === 401 || haRes.status === 403) {
            console.warn(
                `[HAUI] /ha-api 鉴权失败: path=${haPath}, status=${haRes.status}, authSource=${authHeader.source}, hasAuth=${Boolean(authHeader.value)}`
            );
        }

        // 透传 HA 返回的状态码和响应体
        res.status(haRes.status);
        const contentType = haRes.headers.get('content-type') || 'application/json';
        res.set('Content-Type', contentType);

        const buffer = await haRes.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        console.error('[HAUI] /ha-api 代理转发失败:', e.message);
        res.status(502).json({ error: `HA API 代理失败: ${e.message}` });
    }
});

// 核心 API：读取配置（以 /api/* 路径支持 HA Ingress 转发）
// HA Ingress 会将容器 8099 端口的所有路径全部透传，包括 /api/storage
app.get('/api/storage', (_req, res) => {
    try {
        ensureConfig();
        const raw = fs.readFileSync(getConfigFile(), 'utf8');
        res.set('Content-Type', 'application/json');
        res.send(raw);
    } catch (e) {
        console.error('[HAUI] 读取配置失败:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/storage', (req, res) => {
    try {
        ensureConfig();
        const payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
        fs.writeFileSync(getConfigFile(), JSON.stringify(payload));
        res.json({ ok: true });
    } catch (e) {
        console.error('[HAUI] 保存配置失败:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// --- HAUI Pro 授权：前端离线验证后同步到 Add-on，后端再次验签并持久化 ---
app.get('/api/license/status', (_req, res) => {
    res.json({ ...getLicenseStatus(), machineCode: getMachineCode() });
});

app.post('/api/license/activate', (req, res) => {
    try {
        ensureConfig();
        const { license } = req.body || {};
        const verification = verifySignedLicense(license);
        if (!verification.ok) {
            return res.status(400).json({ ok: false, error: verification.error });
        }

        const stored = {
            license,
            activatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(getLicenseFile(), JSON.stringify(stored, null, 2));
        res.json({ ok: true, license: getLicenseStatus() });
    } catch (e) {
        console.error('[HAUI] 授权激活失败:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/license', (_req, res) => {
    try {
        fs.rmSync(getLicenseFile(), { force: true });
        res.json({ ok: true, license: getLicenseStatus() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- 备份与恢复 ---
function createBackupPayload() {
    ensureConfig();
    return {
        version: 1,
        product: 'HAUI',
        createdAt: new Date().toISOString(),
        storage: readJsonFile(getConfigFile(), {}),
        aiConfig: readJsonFile(getAiConfigFile(), {}),
        license: readStoredLicense(),
    };
}

function createBackupName() {
    return `haui-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
}

function restoreBackupPayload(payload) {
    if (!payload || payload.product !== 'HAUI' || !payload.storage || typeof payload.storage !== 'object') {
        return { ok: false, status: 400, error: '备份文件格式不正确' };
    }

    ensureConfig();
    const rollbackDir = getBackupDir();
    fs.mkdirSync(rollbackDir, { recursive: true });
    fs.writeFileSync(path.join(rollbackDir, `rollback-before-restore-${Date.now()}.json`), JSON.stringify(createBackupPayload(), null, 2));
    fs.writeFileSync(getConfigFile(), JSON.stringify(payload.storage, null, 2));
    if (payload.aiConfig && typeof payload.aiConfig === 'object') {
        fs.writeFileSync(getAiConfigFile(), JSON.stringify(payload.aiConfig, null, 2));
    }
    if (payload.license?.license) {
        const verification = verifySignedLicense(payload.license.license);
        if (verification.ok) {
            fs.writeFileSync(getLicenseFile(), JSON.stringify(payload.license, null, 2));
        }
    }
    return { ok: true };
}

function getSafeBackupFile(name) {
    if (!name || typeof name !== 'string' || path.basename(name) !== name || !name.endsWith('.json')) {
        return null;
    }
    const backupDir = path.resolve(getBackupDir());
    const file = path.resolve(backupDir, name);
    if (!file.startsWith(`${backupDir}${path.sep}`)) return null;
    return file;
}

app.get('/api/backup/export', requireProFeature('pro'), (_req, res) => {
    const backup = createBackupPayload();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${createBackupName()}"`);
    res.send(JSON.stringify(backup, null, 2));
});

app.post('/api/backup/create', requireProFeature('pro'), (_req, res) => {
    try {
        const backupDir = getBackupDir();
        fs.mkdirSync(backupDir, { recursive: true });
        const name = createBackupName();
        const file = path.join(backupDir, name);
        fs.writeFileSync(file, JSON.stringify(createBackupPayload(), null, 2));
        res.json({ ok: true, name, createdAt: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/backup/list', requireProFeature('pro'), (_req, res) => {
    try {
        const backupDir = getBackupDir();
        if (!fs.existsSync(backupDir)) return res.json({ backups: [] });
        const backups = fs.readdirSync(backupDir)
            .filter((name) => name.endsWith('.json'))
            .map((name) => {
                const file = path.join(backupDir, name);
                const stat = fs.statSync(file);
                return { name, size: stat.size, updatedAt: stat.mtime.toISOString() };
            })
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        res.json({ backups });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/backup/restore', requireProFeature('pro'), (req, res) => {
    try {
        const result = restoreBackupPayload(req.body);
        if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
        res.json({ ok: true });
    } catch (e) {
        console.error('[HAUI] 备份恢复失败:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/backup/restore-server', requireProFeature('pro'), (req, res) => {
    try {
        const file = getSafeBackupFile(req.body?.name);
        if (!file || !fs.existsSync(file)) {
            return res.status(404).json({ error: '未找到指定服务器备份' });
        }
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        const result = restoreBackupPayload(payload);
        if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
        res.json({ ok: true });
    } catch (e) {
        console.error('[HAUI] 服务器备份恢复失败:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/system/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const addonPackage = readJsonFile(path.join(__dirname, 'package.json'), {});
    const indexFile = path.join(__dirname, 'dist', 'index.html');
    const swFile = path.join(__dirname, 'dist', 'sw.js');
    const statIso = (file) => {
        try {
            return fs.existsSync(file) ? fs.statSync(file).mtime.toISOString() : null;
        } catch (_) {
            return null;
        }
    };

    res.json({
        product: 'HAUI',
        version: addonPackage.version || process.env.HAUI_VERSION || 'unknown',
        frontendVersion: addonPackage.version || process.env.VITE_APP_VERSION || 'unknown',
        addonVersion: addonPackage.version || 'unknown',
        indexUpdatedAt: statIso(indexFile),
        serviceWorkerUpdatedAt: statIso(swFile),
        cachePolicy: 'index/sw/manifest no-store, hashed assets immutable',
        host: 'home-assistant-addon',
    });
});

// 萤石云 API 代理：隐藏 AppKey/AppSecret，避免前端直接暴露，同时解决跨域问题
// 接收参数：appKey, appSecret, deviceSerial, channelNo
// 先获取 accessToken，再获取 HLS 流地址
app.post('/api/ezviz/url', requireProFeature('camera_grid'), async (req, res) => {
    try {
        const {
            deviceSerial,
            channelNo = 1,
            protocol = 2,     // 2=HLS（默认推荐）, 3=FLV
            validateCode,     // 加密摄像头验证码（可选）
        } = req.body;

        // 从后端配置读取 Secrets 而非前端传入
        const aiConfig = readAiConfig();
        const options = readAddonOptions();
        const appKey = aiConfig.ezvizAppKey || process.env.EZVIZ_APP_KEY || options.EZVIZ_APP_KEY;
        const appSecret = aiConfig.ezvizAppSecret || process.env.EZVIZ_APP_SECRET || options.EZVIZ_APP_SECRET;

        if (!appKey || !appSecret || !deviceSerial) {
            return res.status(400).json({ error: '缺少必要的萤石云参数（需在设置中配置 AppKey/AppSecret）' });
        }

        // 1. 获取 accessToken
        const tokenParams = new URLSearchParams({
            appKey,
            appSecret,
        });

        const tokenResp = await fetch('https://open.ys7.com/api/lapp/token/get', {
            method: 'POST',
            body: tokenParams,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const tokenData = await tokenResp.json();
        if (tokenData.code !== '200') {
            throw new Error(`萤石 Token 获取失败: ${tokenData.msg} (code: ${tokenData.code})`);
        }
        const accessToken = tokenData.data.accessToken;

        // 2. 用 accessToken 获取直播流地址
        const addrParamsObj = {
            accessToken,
            deviceSerial,
            channelNo: channelNo.toString(),
            protocol: protocol.toString(), // 萤石 API：2=HLS, 3=FLV(HTTP-FLV)
            quality: '1',                  // 1=均衡（高清与流畅平衡）
            type: '1',                     // 1=直播地址
            expireTime: '86400',           // URL 有效期 1 天（秒）
        };

        // 加密摄像头需要传入验证码
        if (validateCode) {
            addrParamsObj.validateCode = validateCode;
        }

        const addrResp = await fetch('https://open.ys7.com/api/lapp/v2/live/address/get', {
            method: 'POST',
            body: new URLSearchParams(addrParamsObj),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const addrData = await addrResp.json();
        if (addrData.code !== '200') {
            throw new Error(`萤石直播地址获取失败: ${addrData.msg} (code: ${addrData.code})`);
        }

        const url = addrData.data?.url;
        if (!url) {
            throw new Error('萤石云返回了空地址');
        }

        res.json({ ok: true, url });
    } catch (e) {
        console.error('[HAUI] 萤石云代理异常:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// 萤石云 Token 代理：只获取 AccessToken（供 ezuikit-js SDK 使用）
// 隐藏 AppKey/AppSecret，避免前端直接暴露
app.post('/api/ezviz/token', requireProFeature('camera_grid'), async (req, res) => {
    try {
        const aiConfig = readAiConfig();
        const options = readAddonOptions();
        const appKey = aiConfig.ezvizAppKey || process.env.EZVIZ_APP_KEY || options.EZVIZ_APP_KEY;
        const appSecret = aiConfig.ezvizAppSecret || process.env.EZVIZ_APP_SECRET || options.EZVIZ_APP_SECRET;

        if (!appKey || !appSecret) {
            return res.status(400).json({ error: '缺少必要的萤石云参数（需在设置中配置 AppKey/AppSecret）' });
        }

        // 获取 accessToken
        const tokenParams = new URLSearchParams({ appKey, appSecret });
        const tokenResp = await fetch('https://open.ys7.com/api/lapp/token/get', {
            method: 'POST',
            body: tokenParams,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const tokenData = await tokenResp.json();
        if (tokenData.code !== '200') {
            throw new Error(`萤石 Token 获取失败: ${tokenData.msg} (code: ${tokenData.code})`);
        }

        res.json({ ok: true, accessToken: tokenData.data.accessToken });
    } catch (e) {
        console.error('[HAUI] 萤石云 Token 代理异常:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ONVIF 摄像头 PTZ 云台控制代理
// 将前端指令转换为 Home Assistant 的 onvif.ptz 服务调用
app.post('/api/camera/ptz', requireProFeature('camera_grid'), async (req, res) => {
    try {
        const { direction, name } = req.body || {};
        const allowedDirections = new Set(['up', 'down', 'left', 'right', 'zoomIn', 'zoomOut']);
        if (!allowedDirections.has(direction)) {
            return res.status(400).json({ error: '无效的 PTZ 方向' });
        }
        
        // 鉴权令牌（优先使用请求头，无则用环境变量）
        const authHeader = req.headers['authorization'] || 
            (SUPERVISOR_TOKEN ? `Bearer ${SUPERVISOR_TOKEN}` : undefined);

        if (!authHeader) {
            return res.status(401).json({ error: '未授权，缺少访问令牌' });
        }

        const entityId = typeof req.body.entityId === 'string'
            ? req.body.entityId.trim()
            : `camera.${String(name || '').toLowerCase().replace(/\s+/g, '_')}`;
        if (!/^camera\.[a-zA-Z0-9_]+$/.test(entityId)) {
            return res.status(400).json({ error: '无效的摄像头实体 ID' });
        }

        const ptzData = {
            entity_id: entityId,
            move_mode: 'ContinuousMove',
            speed: 0.5,
            distance: 0.1
        };

        // 映射方向到 ONVIF 属性
        switch (direction) {
            case 'up': ptzData.tilt = 'Up'; break;
            case 'down': ptzData.tilt = 'Down'; break;
            case 'left': ptzData.pan = 'Left'; break;
            case 'right': ptzData.pan = 'Right'; break;
            case 'zoomIn': ptzData.zoom = 'ZoomIn'; break;
            case 'zoomOut': ptzData.zoom = 'ZoomOut'; break;
        }

        const haRes = await fetch(`${HA_CORE_URL}/api/services/onvif/ptz`, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ptzData)
        });

        if (!haRes.ok) {
            const errText = await haRes.text();
            console.error('[HAUI] HA PTZ 调用失败:', errText);
            return res.status(haRes.status).json({ error: errText || 'Home Assistant PTZ 服务调用失败' });
        }

        res.json({ ok: true });
    } catch (e) {
        console.error('[HAUI] PTZ 代理指令执行异常:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// 健康检查（HA Ingress 心跳探测）
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- AI Config 接口 ---
app.get('/api/ai/config', requireProFeature('ai'), (_req, res) => {
    try {
        ensureConfig();
        const config = readAiConfig();
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/ai/config', requireProFeature('ai'), (req, res) => {
    try {
        ensureConfig();
        const payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
        fs.writeFileSync(getAiConfigFile(), JSON.stringify(payload, null, 2));
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- AI Chat 代理端点 (支持 Tool Call 多轮回传 & SSE) ---

// Tool Call 最大循环次数，防止 LLM 无限调用工具
const MAX_TOOL_ROUNDS = 5;

// HA Tools Schema 定义
const haTools = [
    {
        type: "function",
        function: {
            name: "call_ha_service",
            description: "调用 Home Assistant 服务来控制低风险设备，例如开灯、关窗帘、调节温度等。必须提供明确 entity_id；门锁、安防解除、重启和全域批量控制不允许执行。",
            parameters: {
                type: "object",
                properties: {
                    domain: { type: "string", description: "所属域，例如 light, switch, cover, climate, media_player, scene 等。不要使用 lock 或 alarm_control_panel。" },
                    service: { type: "string", description: "服务名，例如 turn_on, turn_off, toggle, set_cover_position, set_temperature 等。不要使用 unlock、disarm、restart 或全域控制。" },
                    service_data: { type: "object", description: "服务调用的具体参数，例如 {'entity_id': 'light.living_room'} 或 {'entity_id': 'cover.window', 'position': 50}" }
                },
                required: ["domain", "service", "service_data"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_entity_state",
            description: "获取特定实体的当前状态和属性。用于查询设备实时状态。",
            parameters: {
                type: "object",
                properties: {
                    entity_id: { type: "string", description: "要查询的 entity_id，例如 light.living_room, sensor.temperature" }
                },
                required: ["entity_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_entities",
            description: "按名称、房间、类型或 entity_id 查找设备。用户没有提供明确 entity_id 时，先用此工具定位设备。",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "搜索关键词，例如 客厅、温度、电视、light.living_room" },
                    domain: { type: "string", description: "可选实体域，例如 light, switch, sensor, climate, cover" },
                    limit: { type: "number", description: "返回数量上限，默认 20，最大 50" },
                    include_unavailable: { type: "boolean", description: "是否包含 unavailable/unknown 实体，默认 false" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_home_summary",
            description: "获取全屋设备统计、开启中的设备和关键传感器读数。用于回答“家里现在怎么样”“统计一下”等问题。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    }
];

// =====================================================================
// 辅助函数：消费 SSE 流，返回内容块和工具调用信息
// =====================================================================
async function consumeStream(response, onContentChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const toolCallBuffers = {};
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // 保存不完整的最后一行到缓存，待下一块拼接
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (!trimmed.startsWith('data: ')) continue;

            const dataStr = trimmed.slice(6);
            try {
                const parsed = JSON.parse(dataStr);
                const choice = parsed.choices?.[0];
                if (!choice) continue;

                const delta = choice.delta;

                // 收集并拼接 tool_calls 增量数据（处理多 chunk 拼接）
                if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const index = tc.index ?? 0;
                        if (!toolCallBuffers[index]) {
                            toolCallBuffers[index] = { id: '', name: '', arguments: '' };
                        }
                        if (tc.id) toolCallBuffers[index].id = tc.id;
                        if (tc.function?.name) toolCallBuffers[index].name = tc.function.name;
                        if (tc.function?.arguments) {
                            toolCallBuffers[index].arguments += tc.function.arguments;
                        }
                    }
                }

                // 实时推送文本内容
                if (delta?.content && onContentChunk) {
                    onContentChunk(delta.content);
                }
            } catch (e) {
                // 仅忽略部分解析错误的块，避免整条流中断
                console.warn('[AI Stream Parse Error]:', e.message, 'Data:', dataStr.slice(0, 100));
            }
        }
    }

    const toolCalls = Object.values(toolCallBuffers).filter(tc => tc.name);
    return { toolCalls };
}

app.post('/api/ai/chat', requireProFeature('ai'), async (req, res) => {
    try {
        const { messages, token } = req.body;

        let aiConfig = readAiConfig();

        // 兜底环境变量
        const options = readAddonOptions();
        if (!aiConfig.apiKey && (process.env.AI_API_KEY || options.AI_API_KEY)) {
            aiConfig = {
                provider: process.env.AI_PROVIDER || options.AI_PROVIDER || 'alibaba',
                apiKey: process.env.AI_API_KEY || options.AI_API_KEY,
                baseUrl: process.env.AI_BASE_URL || options.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                modelName: process.env.AI_MODEL || options.AI_MODEL || 'qwen-plus'
            };
        }

        if (!aiConfig.apiKey) {
            return res.status(400).json({ error: "AI API Key 未配置，请先在设置中绑定。" });
        }

        const cleanBaseUrl = aiConfig.baseUrl.endsWith('/') ? aiConfig.baseUrl.slice(0, -1) : aiConfig.baseUrl;
        const apiUrl = `${cleanBaseUrl}/chat/completions`;

        // 向 LLM 发起请求的通用函数
        /**
         * 规范化消息格式，确保所有消息的 content 为字符串
         * DashScope 等严格 API 不接受 content: null
         */
        function sanitizeMessages(messages) {
            return messages.map(msg => {
                const sanitized = { ...msg };
                // 确保 content 为字符串，不为 null/undefined
                if (sanitized.content === null || sanitized.content === undefined) {
                    sanitized.content = '';
                }
                // 如果 content 不是字符串（比如对象），转为 JSON 字符串
                if (typeof sanitized.content !== 'string') {
                    sanitized.content = JSON.stringify(sanitized.content);
                }
                return sanitized;
            });
        }

        async function callLLM(msgs, stream = true) {
            const sanitizedMsgs = sanitizeMessages(msgs);  // 规范化消息格式
            const payload = {
                model: aiConfig.modelName,
                messages: sanitizedMsgs,  // 使用规范化后的消息
                tools: haTools,
                tool_choice: "auto",
                stream
            };
            const llmRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiConfig.apiKey}`
                },
                body: JSON.stringify(payload)
            });
            if (!llmRes.ok) {
                const errBody = await llmRes.text();
                // 解析百炼/OpenAI 兼容格式的错误体，提取有意义的错误提示
                let errMsg = `AI API 失败: ${llmRes.status} ${errBody}`;
                try {
                    const parsed = JSON.parse(errBody);
                    const dsCode = parsed?.error?.code || parsed?.code || '';
                    const dsMessage = parsed?.error?.message || parsed?.message || '';
                    // 百炼 DashScope 特有错误码识别
                    if (dsCode === 'InvalidApiKey' || llmRes.status === 401) {
                        errMsg = 'API Key 无效或已过期，请检查配置';
                    } else if (dsCode === 'Throttling' || llmRes.status === 429) {
                        errMsg = '请求过于频繁，请稍后重试';
                    } else if (dsCode === 'ModelNotFound') {
                        errMsg = '模型不可用，请选择其他模型';
                    } else if (dsMessage) {
                        errMsg = `AI API 失败: ${dsMessage}`;
                    }
                } catch { /* JSON 解析失败，使用原始错误消息 */ }
                throw new Error(errMsg);
            }
            return llmRes;
        }

        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 用于 SSE 推送的辅助函数
        function sseWrite(event) {
            try { res.write(`data: ${JSON.stringify(event)}\n\n`); } catch (_) { /* 连接已断开 */ }
        }

        const llmRes = await callLLM(messages);

        // 消费流式响应，实时推送内容给前端
        const { toolCalls } = await consumeStream(llmRes, (contentChunk) => {
            sseWrite({ type: 'content', content: contentChunk });
        });

        // 整理后将解析出的最终 toolCalls 列表一次性发给前端
        if (toolCalls && toolCalls.length > 0) {
            sseWrite({ type: 'tool_calls_batch', tool_calls: toolCalls });
        }

        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (e) {
        console.error('[HAUI] /api/ai/chat 出错:', e.message);
        if (!res.headersSent) {
            res.status(500).json({ error: e.message });
        } else {
            res.write(`data: {"type":"error","content":"Server Error: ${e.message}"}\n\n`);
            res.end();
        }
    }
});

// 静态文件服务（React 打包产物）
// index.html / sw.js / manifest 必须尽快更新，否则 HA Ingress iframe
// 可能继续加载旧版本前端；带 hash 的 assets 才允许长期缓存。
app.use(express.static(path.join(__dirname, 'dist'), {
    etag: true,
    setHeaders: (res, filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        if (normalizedPath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return;
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    },
}));

// React Router fallback：对未知路径返回 index.html
app.use((_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

export {
    app,
    getSafeBackupFile,
    getLicenseStatus,
    restoreBackupPayload,
    createBackupPayload,
};

const PORT = 8099;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[HAUI] 服务已启动，监听端口 ${PORT}`);
        console.log(`[HAUI] 持久化配置文件: ${getConfigFile()}`);
    });
}
