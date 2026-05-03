const INSTALL_ID_KEY = 'haui_install_id';
const MACHINE_CODE_OVERRIDE_KEY = 'haui_machine_code_override';

export function saveMachineCodeOverride(machineCode: string): void {
  if (typeof window === 'undefined') return;
  const normalized = machineCode.trim();
  if (!normalized) return;
  try {
    localStorage.setItem(MACHINE_CODE_OVERRIDE_KEY, normalized);
  } catch {
    // ignore storage failures
  }
}

function getMachineCodeOverride(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(MACHINE_CODE_OVERRIDE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function createInstallId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `haui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateInstallId(): string {
  if (typeof window === 'undefined') return createInstallId();

  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY);
    if (existing) return existing;
    const next = createInstallId();
    localStorage.setItem(INSTALL_ID_KEY, next);
    return next;
  } catch {
    return createInstallId();
  }
}

function stableHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x811c9dc5);
  }

  const part1 = (h1 >>> 0).toString(36).toUpperCase().padStart(7, '0');
  const part2 = (h2 >>> 0).toString(36).toUpperCase().padStart(7, '0');
  return `${part1}${part2}`.replace(/[OIL]/g, 'X');
}

function groupCode(raw: string): string {
  return raw.match(/.{1,4}/g)?.join('-') ?? raw;
}

export function getMachineCode(): string {
  const override = getMachineCodeOverride();
  if (override) return override;

  const installId = getOrCreateInstallId();
  return `HAUI-MACHINE-${groupCode(stableHash(installId).slice(0, 12))}`;
}
