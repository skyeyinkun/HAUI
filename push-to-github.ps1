# PowerShell Git 推送脚本（安全版）
# 说明：使用 http.extraheader 注入 Token，避免将凭证写入 .git/config 的 remote URL。
# 适用：https 推送到 GitHub，需要使用 Personal Access Token 或 Fine-grained Token。

$ErrorActionPreference = 'Stop'

# 强制以当前脚本所在目录为仓库根，防止误推送
$repoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoPath

# 安全读取 Token（不回显、立即释放内存）
$secureToken = Read-Host "请输入 GitHub Personal Access Token" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

    # 使用 Basic 认证头（GitHub 推荐），Token 不落盘到 .git/config
    $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
    $authHeader = "AUTHORIZATION: Basic $basic"

    # 推送：-c 仅对本次命令生效，结束后不残留
    git -c http.extraheader="$authHeader" push origin main --follow-tags
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 推送成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 推送失败，退出码：$LASTEXITCODE" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ 推送异常：$_" -ForegroundColor Red
}
finally {
    # 立即清理内存中的 Token 明文与 Basic 字符串
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
    if (Get-Variable -Name token -Scope Local -ErrorAction SilentlyContinue) {
        Remove-Variable -Name token -Scope Local -ErrorAction SilentlyContinue
    }
    if (Get-Variable -Name basic -Scope Local -ErrorAction SilentlyContinue) {
        Remove-Variable -Name basic -Scope Local -ErrorAction SilentlyContinue
    }
    if (Get-Variable -Name authHeader -Scope Local -ErrorAction SilentlyContinue) {
        Remove-Variable -Name authHeader -Scope Local -ErrorAction SilentlyContinue
    }
}
