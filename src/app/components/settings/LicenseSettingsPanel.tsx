import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { activateLicense, getLicenseStatus, saveLicense } from '@/features/license/license-storage';
import { getMachineCode, saveMachineCodeOverride } from '@/features/license/machine-id';
import { LicenseStatus } from '@/features/license/license-types';
import { getApiUrl, readApiError } from '@/utils/sync';
import { parseLicenseInput } from '@/features/license/license-verifier';
import { copyTextToClipboard } from '@/utils/clipboard';

type AddonActivationError = Error & { serverRejected?: boolean };

export function LicenseSettingsPanel() {
  const [machineCode, setMachineCode] = useState('');
  const [licenseInput, setLicenseInput] = useState('');
  const [status, setStatus] = useState<LicenseStatus>(() => getLicenseStatus());
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const localMachineCode = getMachineCode();
    setMachineCode(localMachineCode);
    setStatus(getLicenseStatus());

    fetch(getApiUrl('/api/license/status'), { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readApiError(res, '授权状态读取失败'));
        return res.json() as Promise<LicenseStatus>;
      })
      .then((serverStatus) => {
        if (!mounted) return;
        if (serverStatus.machineCode) {
          saveMachineCodeOverride(serverStatus.machineCode);
          setMachineCode(serverStatus.machineCode);
        }
        setStatus(serverStatus);
        window.dispatchEvent(new Event('haui-license-change'));
      })
      .catch(() => {
        // 独立网页或后端未启动时继续使用本地机器码。
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activateViaAddon = async () => {
    const license = parseLicenseInput(licenseInput);
    if (license.payload?.machineCode !== machineCode) {
      throw new Error('授权码与当前机器码不匹配');
    }

    const res = await fetch(getApiUrl('/api/license/activate'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license }),
    });
    if (!res.ok) {
      const error = new Error(await readApiError(res, '授权激活失败')) as AddonActivationError;
      error.serverRejected = res.status >= 400 && res.status < 500;
      throw error;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('Add-on 授权接口不可用');
    }

    const data = await res.json();
    const nextStatus = data?.license || getLicenseStatus();
    saveLicense(license);
    setStatus(nextStatus);
    return nextStatus as LicenseStatus;
  };

  const copyMachineCode = async () => {
    const copied = await copyTextToClipboard(machineCode);
    if (copied) {
      toast.success('机器码已复制');
      return;
    }
    toast.error('复制失败，请长按或选中机器码手动复制');
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      try {
        const nextStatus = await activateViaAddon();
        setStatus(nextStatus);
      } catch (error) {
        if ((error as AddonActivationError)?.serverRejected) {
          throw error;
        }
        const nextStatus = await activateLicense(licenseInput, machineCode);
        setStatus(nextStatus);
      }
      setLicenseInput('');
      window.dispatchEvent(new Event('haui-license-change'));
      toast.success('授权已激活');
    } catch (error) {
      const message = error instanceof Error ? error.message : '授权激活失败';
      toast.error(message);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#334155]" />
                <h3 className="text-[18px] font-semibold text-[#040415]">系统授权</h3>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                复制客户机器码获取授权码，激活后即可进入系统。
              </p>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${status.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              {status.active ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {status.active ? '已授权' : '未授权'}
            </div>
          </div>

          <div className="mt-5 rounded-[16px] bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-gray-500">客户机器码</p>
                <p className="mt-1 break-all font-mono text-[13px] leading-relaxed text-[#040415]">{machineCode || '生成中...'}</p>
              </div>
              <button
                type="button"
                onClick={copyMachineCode}
                disabled={!machineCode}
                className="inline-flex shrink-0 items-center justify-center rounded-[12px] bg-white px-3 py-2 text-[12px] font-semibold text-[#334155] shadow-sm transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                复制机器码
              </button>
            </div>
          </div>

          <p className="mt-4 text-[12px] text-gray-500">{status.active ? '授权已生效。' : '系统未授权，请先导入授权码。'}</p>
        </div>

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#334155]" />
            <h4 className="text-[15px] font-semibold text-[#040415]">导入授权码</h4>
          </div>
          <textarea
            value={licenseInput}
            onChange={(event) => setLicenseInput(event.target.value)}
            placeholder="粘贴授权码"
            className="min-h-[136px] w-full resize-none rounded-[16px] border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[12px] text-[#040415] outline-none transition-all focus:border-[#334155] focus:bg-white focus:ring-2 focus:ring-gray-100"
          />
          <button
            type="button"
            onClick={handleActivate}
            disabled={!licenseInput.trim() || !machineCode || activating}
            className="mt-4 w-full rounded-[14px] bg-[#040415] px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activating ? '验证中...' : '激活授权'}
          </button>
        </div>
      </div>
    </div>
  );
}
