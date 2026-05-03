import { getLicenseStatus } from './license-storage';
import { LicensePayload, LicenseStatus } from './license-types';

export type ProFeature =
  | 'pro'
  | 'ai'
  | 'agent'
  | 'camera_grid'
  | 'wall_panel'
  | 'app_shell'
  | 'priority_updates';

const FEATURE_ALIASES: Record<ProFeature, string[]> = {
  pro: ['pro'],
  ai: ['ai', 'assistant'],
  agent: ['agent', 'agent_kernel'],
  camera_grid: ['camera_grid', 'camera'],
  wall_panel: ['wall_panel', 'wall'],
  app_shell: ['app_shell', 'app'],
  priority_updates: ['priority_updates', 'updates'],
};

function hasFeature(payload: LicensePayload | undefined, feature: ProFeature): boolean {
  if (!payload?.features?.length) return feature === 'pro' && payload?.edition === 'pro';
  const features = new Set(payload.features.map((item) => item.toLowerCase()));
  return FEATURE_ALIASES[feature].some((alias) => features.has(alias));
}

export interface LicenseEntitlements {
  status: LicenseStatus;
  isPro: boolean;
  updatesExpired: boolean;
  canUseAi: boolean;
  canUseAgent: boolean;
  canUseCameraGrid: boolean;
  canUseWallPanel: boolean;
  canUseAppShell: boolean;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getLicenseEntitlements(status = getLicenseStatus()): LicenseEntitlements {
  const payload = status.payload;
  const isPro = status.active && payload?.edition === 'pro';
  const updatesExpired = Boolean(payload?.updatesUntil && payload.updatesUntil < todayDate());

  return {
    status,
    isPro,
    updatesExpired,
    canUseAi: isPro && (hasFeature(payload, 'pro') || hasFeature(payload, 'ai')),
    canUseAgent: isPro && (hasFeature(payload, 'pro') || hasFeature(payload, 'agent')),
    canUseCameraGrid: isPro && (hasFeature(payload, 'pro') || hasFeature(payload, 'camera_grid')),
    canUseWallPanel: isPro && (hasFeature(payload, 'pro') || hasFeature(payload, 'wall_panel')),
    canUseAppShell: isPro && (hasFeature(payload, 'pro') || hasFeature(payload, 'app_shell')),
  };
}
