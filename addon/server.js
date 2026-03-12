import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// HA Add-on 持久化存储目录（HA Supervisor 会将 /data 映射为持久卷）
const DATA_DIR = '/data';
const CONFIG_FILE = path.join(DATA_DIR, 'haui_config.json');
// AI 配置独立存储，避免与面板数据混淆
const AI_CONFIG_FILE_NAME = 'haui_ai_config.json';

// 兼容本地开发时没有 /data 目录的情况
const LOCAL_DATA_DIR = path.join(__dirname, '.data');
const LOCAL_CONFIG_FILE = path.join(LOCAL_DATA_DIR, 'haui_config.json');

function getConfigFile() {
    return fs.existsSync(DATA_DIR) ? CONFIG_FILE : LOCAL_CONFIG_FILE;
}

function getAiConfigFile() {
    const dir = fs.existsSync(DATA_DIR) ? DATA_DIR : LOCAL_DATA_DIR;
    return path.join(dir, AI_CONFIG_FILE_NAME);
}

function ensureConfig() {
    const dir = fs.existsSync(DATA_DIR) ? DATA_DIR : LOCAL_DATA_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = getConfigFile();
    if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
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

// ─── /ha-api 代理：将前端 REST 请求转发到 HA Core API ────────────────────────
// 在 HA Add-on 中，HA Core 可通过 http://supervisor/core 访问
// 前端 fetch('/ha-api/api/states') → Node → http://supervisor/core/api/states
// 鉴权：使用前端传入的 Authorization header（用户自己的 Long-Lived Token）
// 同时支持 SUPERVISOR_TOKEN 作为备用（当用户未传 token 时）
const HA_CORE_URL = process.env.HA_CORE_URL || 'http://supervisor/core';
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;

app.all(/^\/ha-api\/.*/, async (req, res) => {
    // 去掉 /ha-api 前缀，拼接到 HA Core 地址
    const haPath = req.path.replace(/^\/ha-api/, '');
    const targetUrl = `${HA_CORE_URL}${haPath}`;

    try {
        // 选用请求头中的 Authorization（用户 token），无则用 SUPERVISOR_TOKEN
        const authHeader = req.headers['authorization'] ||
            (SUPERVISOR_TOKEN ? `Bearer ${SUPERVISOR_TOKEN}` : undefined);

        const headers = {
            'Content-Type': req.headers['content-type'] || 'application/json',
        };
        if (authHeader) headers['Authorization'] = authHeader;

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

// 萤石云 API 代理：隐藏 AppKey/AppSecret，避免前端直接暴露，同时解决跨域问题
// 接收参数：appKey, appSecret, deviceSerial, channelNo
// 先获取 accessToken，再获取 HLS 流地址
app.post('/api/ezviz/url', async (req, res) => {
    try {
        const {
            deviceSerial,
            channelNo = 1,
            protocol = 2,     // 2=HLS（默认推荐）, 3=FLV
            validateCode,     // 加密摄像头验证码（可选）
        } = req.body;

        // 从后端配置读取 Secrets 而非前端传入
        const aiConfig = readAiConfig();
        const appKey = aiConfig.ezvizAppKey || process.env.EZVIZ_APP_KEY;
        const appSecret = aiConfig.ezvizAppSecret || process.env.EZVIZ_APP_SECRET;

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
app.post('/api/ezviz/token', async (req, res) => {
    try {
        const aiConfig = readAiConfig();
        const appKey = aiConfig.ezvizAppKey || process.env.EZVIZ_APP_KEY;
        const appSecret = aiConfig.ezvizAppSecret || process.env.EZVIZ_APP_SECRET;

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
app.post('/api/camera/ptz', async (req, res) => {
    try {
        const { deviceId, direction, name } = req.body;
        
        // 鉴权令牌（优先使用请求头，无则用环境变量）
        const authHeader = req.headers['authorization'] || 
            (SUPERVISOR_TOKEN ? `Bearer ${SUPERVISOR_TOKEN}` : undefined);

        if (!authHeader) {
            return res.status(401).json({ error: '未授权，缺少访问令牌' });
        }

        // 构造服务调用参数 (ContinuousMove 模式)
        // 实际上在 HA 中，通常需要 entity_id。如果前端没传，我们尝试基于名称匹配或推断。
        // 为了演示集成，我们假设 entity_id 为 camera.{name_lowercase} 或直接使用前端传来的 deviceId
        const entityId = req.body.entityId || `camera.${name?.toLowerCase().replace(/\s+/g, '_')}`;

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
            // 尝试降级调用通用的 camera.ptz_move
            // ...
        }

        res.json({ ok: haRes.ok });
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
app.get('/api/ai/config', (_req, res) => {
    try {
        ensureConfig();
        const config = readAiConfig();
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/ai/config', (req, res) => {
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

// 安全白名单：仅允许这些域的服务控制
const ALLOWED_DOMAINS = new Set([
    'light', 'switch', 'cover', 'fan', 'media_player',
    'climate', 'lock', 'scene', 'input_boolean', 'script',
    'automation', 'vacuum', 'humidifier', 'water_heater'
]);

// HA Tools Schema 定义
const haTools = [
    {
        type: "function",
        function: {
            name: "call_ha_service",
            description: "调用 Home Assistant 服务来控制设备，例如开灯、关窗帘、调节温度等。必须提供 domain、service 和 service_data（至少包含 entity_id）。",
            parameters: {
                type: "object",
                properties: {
                    domain: { type: "string", description: "所属域，例如 light, switch, cover, climate, media_player, scene 等" },
                    service: { type: "string", description: "服务名，例如 turn_on, turn_off, toggle, set_cover_position, set_temperature 等" },
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

app.post('/api/ai/chat', async (req, res) => {
    try {
        const { messages, token } = req.body;

        let aiConfig = readAiConfig();

        // 兜底环境变量
        if (!aiConfig.apiKey && process.env.AI_API_KEY) {
            aiConfig = {
                provider: process.env.AI_PROVIDER || 'siliconflow',
                apiKey: process.env.AI_API_KEY,
                baseUrl: process.env.AI_BASE_URL || 'https://api.siliconflow.cn/v1',
                modelName: process.env.AI_MODEL || 'deepseek-ai/DeepSeek-V3'
            };
        }

        if (!aiConfig.apiKey) {
            return res.status(400).json({ error: "AI API Key 未配置，请先在设置中绑定。" });
        }

        const cleanBaseUrl = aiConfig.baseUrl.endsWith('/') ? aiConfig.baseUrl.slice(0, -1) : aiConfig.baseUrl;
        const apiUrl = `${cleanBaseUrl}/chat/completions`;

        // 向 LLM 发起请求的通用函数
        async function callLLM(msgs, stream = true) {
            const payload = {
                model: aiConfig.modelName,
                messages: msgs,
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
                throw new Error(`AI API 失败: ${llmRes.status} ${errBody}`);
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
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1d',
    etag: true,
}));

// React Router fallback：对未知路径返回 index.html
app.use((_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 8099;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HAUI] 服务已启动，监听端口 ${PORT}`);
    console.log(`[HAUI] 持久化配置文件: ${getConfigFile()}`);
});
