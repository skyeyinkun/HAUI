# Git 降级指南 - 从 2.53.0 降级到 2.52.2

## 问题
Git 2.53.0.windows.2 存在 DNS 解析 bug: getaddrinfo() thread failed to start

## 降级步骤

### 1. 卸载当前 Git 版本
- 打开 控制面板 → 程序 → 程序和功能
- 找到 "Git" 或 "Git for Windows"
- 右键卸载

### 2. 下载 Git 2.52.2
下载地址:
- 64位: https://github.com/git-for-windows/git/releases/download/v2.52.2.windows.1/Git-2.52.2-64-bit.exe
- 32位: https://github.com/git-for-windows/git/releases/download/v2.52.2.windows.1/Git-2.52.2-32-bit.exe

备用下载地址（国内镜像）:
- https://registry.npmmirror.com/binary.html?path=git-for-windows/v2.52.2.windows.1/

### 3. 安装 Git 2.52.2
- 运行下载的安装程序
- 保持默认设置即可
- 安装完成后重启终端

### 4. 验证安装
```bash
git --version
# 应该显示: git version 2.52.2.windows.1
```

### 5. 推送代码
```bash
cd "D:\1工作文件保存\AI code\HAUI"
git push origin main --follow-tags
```

## 当前仓库状态
仓库: skyeyinkun/HAUI
分支: main  
提交: 23d6c58 (v3.30.1)
标签: v3.29.1, v3.29.2, v3.29.5, v3.29.6, v3.30.0, v3.30.1
Bundle备份: HAUI-v3.30.1.bundle
