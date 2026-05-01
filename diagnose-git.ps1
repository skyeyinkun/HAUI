# 读取 Git 配置
$gitDir = Join-Path $PWD ".git"
$remoteUrl = git config --get remote.origin.url

# 解析仓库信息
if ($remoteUrl -match "github.com[:/]([^/]+)/([^/]+)(\.git)?") {
    $owner = $matches[1]
    $repo = $matches[2] -replace "\.git$", ""
    Write-Host "仓库: $owner/$repo"
}

# 获取当前分支和提交
$branch = git rev-parse --abbrev-ref HEAD
$commit = git rev-parse HEAD
Write-Host "分支: $branch"
Write-Host "提交: $commit"

# 列出标签
$tags = git tag -l
Write-Host "标签:"
$tags | ForEach-Object { Write-Host "  - $_" }

Write-Host ""
Write-Host "由于 Git DNS 问题，请使用以下替代方法推送:"
Write-Host "1. 使用 GitHub Desktop"
Write-Host "2. 使用 VS Code 的 Git 功能"
Write-Host "3. 下载 Git 2.52.x 版本"
Write-Host "4. 手动上传 bundle 文件: HAUI-v3.30.1.bundle"
