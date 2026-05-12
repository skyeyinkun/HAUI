import { useEffect, useRef, useState } from 'react';
import { Download, FileClock, RotateCcw, ShieldAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getApiUrl, readApiError, syncFromServer } from '@/utils/sync';

interface BackupInfo {
  name: string;
  size: number;
  updatedAt: string;
}

export function BackupRestorePanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestoreName, setConfirmRestoreName] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; payload: unknown } | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/backup/list'), { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, '备份列表读取失败'));
      const data = await res.json();
      setBackups(Array.isArray(data.backups) ? data.backups : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : '备份列表读取失败';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/backup/create'), {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, '创建备份失败'));
      toast.success('已创建服务器备份');
      await loadBackups();
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建备份失败';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const exportBackup = async () => {
    try {
      const res = await fetch(getApiUrl('/api/backup/export'), { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, '下载备份失败'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      anchor.href = url;
      anchor.download = match?.[1] || `haui-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载备份失败';
      toast.error(message);
    }
  };

  const restoreBackup = async (payload: unknown) => {
    setRestoring(true);
    try {
      const res = await fetch(getApiUrl('/api/backup/restore'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, '恢复失败'));
      await syncFromServer(true);
      toast.success('恢复完成，请刷新页面确认配置');
    } catch (error) {
      const message = error instanceof Error ? error.message : '恢复失败';
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      setPendingImport({ name: file.name, payload });
    } catch {
      toast.error('备份文件不是有效 JSON');
    }
  };

  useEffect(() => {
    void loadBackups();
  }, []);

  const restoreServerBackup = async (backup: BackupInfo) => {
    setRestoring(true);
    try {
      const res = await fetch(getApiUrl('/api/backup/restore-server'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: backup.name }),
      });
      if (!res.ok) throw new Error(await readApiError(res, '服务器备份恢复失败'));
      await syncFromServer(true);
      setConfirmRestoreName(null);
      toast.success('服务器备份已恢复，请刷新页面确认配置');
    } catch (error) {
      const message = error instanceof Error ? error.message : '服务器备份恢复失败';
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileClock className="h-5 w-5 text-[#334155]" />
                <h3 className="text-[18px] font-semibold text-[#040415]">备份与恢复</h3>
              </div>
              <p className="mt-1 text-[13px] text-gray-500">
                备份包含面板布局、设备映射、摄像头配置、AI 配置和授权状态。恢复前会自动创建回滚快照。
              </p>
            </div>
            <button
              type="button"
              onClick={loadBackups}
              disabled={loading}
              className="rounded-[12px] bg-gray-100 px-3 py-2 text-[12px] font-semibold text-[#334155] transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? '读取中...' : '刷新列表'}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={createBackup}
              disabled={loading}
              className="rounded-[14px] bg-[#040415] px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <FileClock className="mr-1 inline h-4 w-4" />
              创建备份
            </button>
            <button
              type="button"
              onClick={exportBackup}
              className="rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#334155] transition-colors hover:bg-gray-50"
            >
              <Download className="mr-1 inline h-4 w-4" />
              下载备份
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#334155] transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className="mr-1 inline h-4 w-4" />
              导入恢复
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />

          <div className="mt-4 rounded-[16px] bg-amber-50 p-4 text-[12px] text-amber-800">
            <ShieldAlert className="mr-1 inline h-4 w-4" />
            恢复会覆盖当前配置。建议先下载一份当前备份，再导入旧文件。
          </div>

          {pendingImport && (
            <div className="mt-4 rounded-[16px] border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#040415]">确认导入备份</p>
                  <p className="mt-1 truncate font-mono text-[12px] text-gray-500">{pendingImport.name}</p>
                  <p className="mt-1 text-[12px] text-amber-700">恢复前后端会自动创建回滚快照，但当前页面配置会被覆盖。</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const payload = pendingImport.payload;
                      setPendingImport(null);
                      void restoreBackup(payload);
                    }}
                    disabled={restoring}
                    className="rounded-[12px] bg-[#040415] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    确认导入
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingImport(null)}
                    className="rounded-[12px] bg-gray-100 px-3 py-2 text-[12px] font-semibold text-[#334155] transition-colors hover:bg-gray-200"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <h4 className="text-[15px] font-semibold text-[#040415]">服务器备份</h4>
          <div className="mt-3 space-y-2">
            {backups.map((backup) => (
              <div key={backup.name} className="flex items-center justify-between gap-3 rounded-[14px] bg-gray-50 p-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12px] text-[#040415]">{backup.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {new Date(backup.updatedAt).toLocaleString()} · {(backup.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {confirmRestoreName === backup.name ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => restoreServerBackup(backup)}
                      disabled={restoring}
                      className="rounded-[10px] bg-[#040415] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      确认恢复
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreName(null)}
                      className="rounded-[10px] bg-white px-2 py-1.5 text-[12px] font-semibold text-gray-500 transition-colors hover:bg-gray-100"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRestoreName(backup.name)}
                    disabled={restoring}
                    className="flex shrink-0 items-center gap-1 rounded-[10px] bg-white px-3 py-2 text-[12px] font-semibold text-[#334155] shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    恢复
                  </button>
                )}
              </div>
            ))}
            {backups.length === 0 && (
              <div className="rounded-[14px] bg-gray-50 p-5 text-center text-[13px] text-gray-400">
                暂无服务器备份，点击“创建备份”生成第一份。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
