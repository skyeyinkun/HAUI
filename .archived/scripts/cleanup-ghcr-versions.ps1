# ═══════════════════════════════════════════════════════════════
# GHCR 旧镜像批量清理脚本
# 用途：删除 ghcr.io/skyeyinkun/haui-* 仓库中指定的镜像版本
# 依赖：PowerShell 7+，PAT 需 delete:packages + read:packages 权限
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = 'Stop'

# ─── 配置区 ───────────────────────────────────────────────────
$Owner    = "skyeyinkun"
$Packages = @("haui-aarch64", "haui-amd64", "haui-armv7")

# 保留最新 N 个带标签版本（0 = 全删；建议保留至少 1 个最新 release）
$KeepLatestTagged = 1

# 删除模式：
#   "untagged"  仅删除无标签的中间版本（最安全）
#   "old"       删除除最新 N 个带标签之外的所有版本（含未标签）
#   "all"       全部删除（危险！会清空整个镜像包）
$Mode = "old"
# ─────────────────────────────────────────────────────────────

# 安全读取 PAT
$secureToken = Read-Host "请输入 GitHub PAT（需 delete:packages 权限）" -AsSecureString
$bstr  = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

$headers = @{
    Authorization          = "Bearer $token"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "ghcr-cleanup-script"
}

foreach ($pkg in $Packages) {
    Write-Host "`n═══ 处理包：$pkg ═══" -ForegroundColor Cyan

    # 1. 分页拉取所有版本（单页最大 100）
    $allVersions = @()
    $page = 1
    do {
        $url  = "https://api.github.com/users/$Owner/packages/container/$pkg/versions?per_page=100&page=$page"
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        $allVersions += $resp
        $page++
    } while ($resp.Count -eq 100)

    Write-Host "  共 $($allVersions.Count) 个版本" -ForegroundColor Gray

    # 2. 根据模式计算待删除列表
    $taggedVersions   = $allVersions | Where-Object { $_.metadata.container.tags.Count -gt 0 }
    $untaggedVersions = $allVersions | Where-Object { $_.metadata.container.tags.Count -eq 0 }

    $toDelete = switch ($Mode) {
        "untagged" { $untaggedVersions }
        "old"      {
            # 按创建时间倒序，保留前 N 个带标签版本，其余全删
            $keepIds = ($taggedVersions |
                        Sort-Object -Property created_at -Descending |
                        Select-Object -First $KeepLatestTagged).id
            $allVersions | Where-Object { $_.id -notin $keepIds }
        }
        "all"      { $allVersions }
    }

    Write-Host "  待删除：$($toDelete.Count) 个" -ForegroundColor Yellow
    if ($toDelete.Count -eq 0) { continue }

    # 3. 批量 DELETE（失败继续，不中断）
    $ok = 0; $fail = 0
    foreach ($v in $toDelete) {
        $tag = if ($v.metadata.container.tags.Count -gt 0) { $v.metadata.container.tags[0] } else { "untagged" }
        try {
            Invoke-RestMethod `
                -Uri "https://api.github.com/users/$Owner/packages/container/$pkg/versions/$($v.id)" `
                -Headers $headers `
                -Method DELETE | Out-Null
            Write-Host ("    ✓ 已删 id={0,-12} tag={1}" -f $v.id, $tag) -ForegroundColor Green
            $ok++
        } catch {
            Write-Host ("    ✗ 失败 id={0} : {1}" -f $v.id, $_.Exception.Message) -ForegroundColor Red
            $fail++
        }
    }
    Write-Host "  结果：成功 $ok / 失败 $fail" -ForegroundColor Cyan
}

# 清零内存中的 Token
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
Remove-Variable token, secureToken, headers -ErrorAction SilentlyContinue
Write-Host "`n═══ 清理完成 ═══" -ForegroundColor Green
