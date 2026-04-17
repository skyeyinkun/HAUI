import type { CardConfig } from '@/types/card-config';

export async function fetchCardConfig(params: { baseUrl: string; token: string; cardId: string }) {
  const { baseUrl, token, cardId } = params;
  const res = await fetch(`${baseUrl}/api/yinkun_ui/card_config?cardId=${encodeURIComponent(cardId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`读取卡片配置失败: ${res.status}`);
  }
  return res.json() as Promise<{ cardId: string; config: CardConfig | null }>;
}

export async function saveCardConfig(params: { baseUrl: string; token: string; cardId: string; config: CardConfig }) {
  const { baseUrl, token, cardId, config } = params;
  const res = await fetch(`${baseUrl}/api/yinkun_ui/card_config`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cardId, config }),
  });
  if (!res.ok) {
    throw new Error(`保存卡片配置失败: ${res.status}`);
  }
  return res.json() as Promise<{ ok: true; cardId: string }>;
}

