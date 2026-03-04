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
            appKey,
            appSecret,
            deviceSerial,
            channelNo = 1,
            protocol = 2,     // 2=HLS（默认推荐）, 3=FLV
            validateCode,     // 加密摄像头验证码（可选）
        } = req.body;

        if (!appKey || !appSecret || !deviceSerial) {
            return res.status(400).json({ error: '缺少必要的萤石云参数（appKey / appSecret / deviceSerial）' });
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

// --- AI Chat 代理端点 (支持 MCP Tools & SSE) ---

// HA Tools Schema 定义
const haTools = [
    {
        type: "function",
        function: {
            name: "call_ha_service",
            description: "调用 Home Assistant 服务来控制设备，例如开灯、关窗帘、调节温度等。必须提供 domain 和 service。",
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
            description: "获取特定实体的当前状态和属性。",
            parameters: {
                type: "object",
                properties: {
                    entity_id: { type: "string", description: "要查询的 entity_id，例如 light.living_room" }
                },
                required: ["entity_id"]
            }
        }
    }
];

app.post('/api/ai/chat', async (req, res) => {
    try {
        const { messages, token } = req.body;
        // token 是前端传过来的 HA access token，用于 HA-API 调用

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

        const authHeader = token ? `Bearer ${token}` : (SUPERVISOR_TOKEN ? `Bearer ${SUPERVISOR_TOKEN}` : undefined);

        // 用于在内部处理 Tool Call 的辅助函数
        async function fetchHaApi(path, method = 'GET', body = null) {
            const targetUrl = `${HA_CORE_URL}${path}`;
            const headers = { 'Content-Type': 'application/json' };
            if (authHeader) headers['Authorization'] = authHeader;

            const fetchOpts = { method, headers };
            if (body) fetchOpts.body = JSON.stringify(body);

            const response = await fetch(targetUrl, fetchOpts);
            if (!response.ok) throw new Error(`HA API Error: ${response.status}`);
            return response.json();
        }

        const openaiPayload = {
            model: aiConfig.modelName,
            messages: messages,
            tools: haTools,
            tool_choice: "auto",
            stream: true
        };

        const aiRes = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.apiKey}`
            },
            body: JSON.stringify(openaiPayload)
        });

        if (!aiRes.ok) {
            const errBody = await aiRes.text();
            throw new Error(`AI API 失败: ${aiRes.status} ${errBody}`);
        }

        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = aiRes.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let toolCallBuffer = {}; // 用于拼接通过 stream 发送过来的 tool_call 信息

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.includes('[DONE]')) {
                    continue; // 过滤大模型的 END marker
                }
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);
                    if (dataStr === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const delta = parsed.choices[0]?.delta;

                        if (delta?.tool_calls) {
                            // 收集 tool_call 增量数据
                            for (const tc of delta.tool_calls) {
                                if (tc.function?.name) {
                                    toolCallBuffer = {
                                        id: tc.id,
                                        name: tc.function.name,
                                        arguments: tc.function.arguments || ''
                                    };
                                } else if (tc.function?.arguments) {
                                    toolCallBuffer.arguments += tc.function.arguments;
                                }
                            }
                        } else if (delta?.content) {
                            // 主动推送文本到前端
                            res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
                        }
                    } catch (e) {
                        console.warn('Failed to parse stream chunk:', dataStr, e);
                    }
                }
            }
        }

        // 检查是否有拦截到的 toolCall 需要自己执行
        if (toolCallBuffer.name) {
            try {
                const args = JSON.parse(toolCallBuffer.arguments);
                let toolResult = null;

                // 执行 HA API
                if (toolCallBuffer.name === 'call_ha_service') {
                    // TODO: 在这里加入白名单进行安全性过滤
                    const ALLOWED_DOMAINS = new Set(['light', 'switch', 'cover', 'fan', 'media_player', 'climate', 'lock', 'scene', 'input_boolean', 'script']);
                    if (!ALLOWED_DOMAINS.has(args.domain)) {
                        throw new Error(`Domain ${args.domain} is not in the whitelist.`);
                    }
                    toolResult = await fetchHaApi(`/api/services/${args.domain}/${args.service}`, 'POST', args.service_data);

                    // 向前端发送控制成功日志
                    res.write(`data: ${JSON.stringify({ type: 'tool_call', action: '执行成功', data: args })}\n\n`);
                    res.write(`data: ${JSON.stringify({ type: 'content', content: `\n\n⚡️ **系统提示**: 已成功发送控制指令 ${args.domain}.${args.service}。` })}\n\n`);
                } else if (toolCallBuffer.name === 'get_entity_state') {
                    toolResult = await fetchHaApi(`/api/states/${args.entity_id}`);
                    res.write(`data: ${JSON.stringify({ type: 'content', content: `\n\n🔍 **状态查询结果**: ${JSON.stringify(toolResult)}。` })}\n\n`);
                }

            } catch (err) {
                res.write(`data: ${JSON.stringify({ type: 'error', content: `\n\n⚠️ AI 工具执行失败: ${err.message}` })}\n\n`);
            }
        }

        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (e) {
        console.error('[HAUI] /api/ai/chat 出错:', e.message);
        if (!res.headersSent) {
            res.status(500).json({ error: e.message });
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', content: `Server Error: ${e.message}` })}\n\n`);
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
