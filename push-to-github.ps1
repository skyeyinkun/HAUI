# PowerShell Git 推送脚本
$repoPath = "D:\1工作文件保存\AI code\HAUI"
$githubToken = Read-Host "请输入 GitHub Personal Access Token" -AsSecureString
$token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($githubToken))

# 设置远程 URL 带 Token
$remoteUrl = "https://$token@github.com/skyeyinkun/HAUI.git"
git remote set-url origin $remoteUrl

# 尝试推送
try {
    git push origin main --follow-tags
    Write-Host "推送成功！"
} catch {
    Write-Host "推送失败: $_"
} finally {
    # 恢复原始远程 URL
    git remote set-url origin https://github.com/skyeyinkun/HAUI.git
}
