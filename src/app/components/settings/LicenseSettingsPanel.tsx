import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Copy, FileText, KeyRound, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { activateLicense, clearLicense, getLicenseStatus, saveLicense } from '@/features/license/license-storage';
import { getMachineCode, saveMachineCodeOverride } from '@/features/license/machine-id';
import { LicenseStatus } from '@/features/license/license-types';
import { getStoredLicense } from '@/features/license/license-storage';
import { getApiUrl, readApiError } from '@/utils/sync';
import { parseLicenseInput } from '@/features/license/license-verifier';

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

  const features = useMemo(() => status.payload?.features ?? [], [status.payload]);

  const activateViaAddon = async () => {
    const license = parseLicenseInput(licenseInput);
    if (license.payload?.machineCode !== machineCode) {
      throw new Error('授权文件与当前机器码不匹配');
    }

    const res = await fetch(getApiUrl('/api/license/activate'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license }),
    });
    if (!res.ok) throw new Error(await readApiError(res, '授权激活失败'));

    saveLicense(license);
    const data = await res.json();
    const nextStatus = data?.license || getLicenseStatus();
    setStatus(nextStatus);
    return nextStatus as LicenseStatus;
  };

  const copyMachineCode = async () => {
    try {
      await navigator.clipboard.writeText(machineCode);
      toast.success('机器码已复制');
    } catch {
      toast.error('复制失败，请手动复制机器码');
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      try {
        const nextStatus = await activateLicense(licenseInput, machineCode);
        setStatus(nextStatus);
        const stored = getStoredLicense();
        if (stored?.license) {
          const res = await fetch(getApiUrl('/api/license/activate'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license: stored.license }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.license) setStatus(data.license);
          } else {
            toast.warning(await readApiError(res, '本地授权已激活，但同步到 Add-on 后端失败'));
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('未配置授权公钥')) {
          await activateViaAddon();
        } else {
          throw error;
        }
      }
      setLicenseInput('');
      window.dispatchEvent(new Event('haui-license-change'));
      toast.success('Pro 授权已激活');
    } catch (error) {
      const message = error instanceof Error ? error.message : '授权激活失败';
      toast.error(message);
    } finally {
      setActivating(false);
    }
  };

  const handleClear = () => {
    clearLicense();
    setStatus(getLicenseStatus());
    fetch(getApiUrl('/api/license'), {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
    window.dispatchEvent(new Event('haui-license-change'));
    toast.success('本地授权已清除');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#334155]" />
                <h3 className="text-[18px] font-semibold text-[#040415]">HAUI Pro 授权</h3>
              </div>
              <p className="mt-1 text-[13px] text-gray-500">
                授权绑定当前 Home Assistant 实例，用于部署交付和后续更新资格管理。
              </p>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${status.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              {status.active ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {status.active ? 'Pro' : 'Free'}
            </div>
          </div>

          <div className="mt-5 rounded-[16px] bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-gray-500">机器码</p>
                <p className="mt-1 break-all font-mono text-[13px] text-[#040415]">{machineCode || '生成中...'}</p>
              </div>
              <button
                type="button"
                onClick={copyMachineCode}
                className="shrink-0 rounded-[12px] bg-white px-3 py-2 text-[12px] font-semibold text-[#334155] shadow-sm transition-colors hover:bg-gray-100"
              >
                <Copy className="mr-1 inline h-3.5 w-3.5" />
                复制给服务商
              </button>
            </div>
          </div>

          {status.payload && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-400">授权 ID</p>
                <p className="mt-1 truncate font-mono text-[13px] text-[#040415]">{status.payload.licenseId}</p>
              </div>
              <div className="rounded-[14px] bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-400">更新有效期</p>
                <p className="mt-1 text-[13px] font-semibold text-[#040415]">{status.payload.updatesUntil}</p>
              </div>
              <div className="rounded-[14px] bg-gray-50 p-3 sm:col-span-2">
                <p className="text-[11px] font-semibold text-gray-400">授权用户</p>
                <p className="mt-1 text-[13px] text-[#040415]">{status.payload.buyer || '未填写'}</p>
              </div>
            </div>
          )}

          <p className="mt-4 text-[12px] text-gray-500">{status.message}</p>
        </div>

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[#334155]" />
            <h4 className="text-[15px] font-semibold text-[#040415]">销售与维护规则</h4>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] bg-gray-50 p-3">
              <p className="text-[12px] font-semibold text-[#040415]">单实例授权</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">授权绑定当前 HAUI 机器码，换实例需要重新生成。</p>
            </div>
            <div className="rounded-[14px] bg-gray-50 p-3">
              <p className="text-[12px] font-semibold text-[#040415]">基础控制不锁</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">开关灯、状态查看等日常控制不应因授权失效中断。</p>
            </div>
            <div className="rounded-[14px] bg-gray-50 p-3">
              <p className="text-[12px] font-semibold text-[#040415]">维护期更新</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-500">建议按 1 年维护期交付，不承诺终身免费更新。</p>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#334155]" />
            <h4 className="text-[15px] font-semibold text-[#040415]">导入授权码</h4>
          </div>
          <textarea
            value={licenseInput}
            onChange={(event) => setLicenseInput(event.target.value)}
            placeholder="粘贴服务商提供的授权码或授权文件内容"
            className="min-h-[136px] w-full resize-none rounded-[16px] border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[12px] text-[#040415] outline-none transition-all focus:border-[#334155] focus:bg-white focus:ring-2 focus:ring-gray-100"
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleActivate}
              disabled={!licenseInput.trim() || !machineCode || activating}
              className="flex-1 rounded-[14px] bg-[#040415] px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activating ? '验证中...' : '激活 Pro'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-[14px] font-semibold text-gray-500 transition-colors hover:bg-gray-50"
            >
              <Trash2 className="mr-1 inline h-4 w-4" />
              清除授权
            </button>
          </div>
        </div>

        {features.length > 0 && (
          <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
            <h4 className="text-[15px] font-semibold text-[#040415]">已解锁功能</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {features.map((feature) => (
                <span key={feature} className="rounded-full bg-gray-100 px-3 py-1 text-[12px] font-medium text-[#334155]">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 text-[12px] leading-relaxed text-gray-500 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#040415]">
            <FileText className="h-4 w-4 text-[#334155]" />
            隐私和官方关系
          </div>
          HAUI 是面向 Home Assistant 生态的第三方面板，不代表 Home Assistant 官方背书。AI Key 和摄像头画面默认应保存在用户自己的环境中，摄像头不走开发者云端。
        </div>
      </div>
    </div>
  );
}
