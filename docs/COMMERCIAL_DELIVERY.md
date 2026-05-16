# HAUI 商业交付隔离方案

适用版本：HAUI 5.15.16+

## 目标

商业交付时，客户只获得可运行的 Home Assistant Add-on 包和授权码，不获得开发源码、授权生成工具、私钥、测试文件或本地配置。

## 本地目录边界

开发仓库：

```text
HAUI/
```

仅用于开发、构建、测试和发布，不直接发给客户。

私有授权工具：

```text
HAUI-License-Tools/
```

仅保存在开发者本机或私有仓库中，用于生成密钥、生成授权码和维护客户授权台账。该目录不属于 HAUI 项目，不应提交到 HAUI 仓库。

客户交付包：

```text
HAUI/customer-packages/haui-addon-v版本号/
```

由 `npm run package:customer` 生成，目录已被 Git 忽略。该包只包含 Add-on 运行文件。

## 构建客户交付包

```bash
npm run package:customer
```

输出结构：

```text
customer-packages/
  haui-addon-v5.15.16/
    INSTALL.md
    haui_dashboard/
      config.yaml
      Dockerfile
      package.json
      package-lock.json
      server.js
      dist/
      DOCS.md
      CHANGELOG.md
      icon.png
      nginx.conf
      run.sh
```

交付包不会包含：

- `src/`
- `scripts/`
- `public/`
- `addon/server.test.mjs`
- `node_modules/`
- `.git/`
- `.env`
- `license-private.pem`
- 授权码生成脚本
- 客户授权台账

## 授权交付流程

1. 客户付款。
2. 你远程部署客户交付包或发送交付包。
3. 客户进入 `系统设置 -> 授权`，复制机器码。
4. 你在 `HAUI-License-Tools` 私有目录中生成绑定机器码的授权码。
5. 客户粘贴授权码激活。

生成授权码时必须显式传入唯一 `licenseId`：

```bash
node generate-license.mjs --machine=HAUI-MACHINE-XXXX-XXXX-XXXX --buyer="客户名" --updatesUntil=2027-05-13 --licenseId=HAUI-20260513-0001
```

## 安全要求

- 私钥只放在 `HAUI-License-Tools` 或密钥管理系统中。
- 公钥可以配置到 Add-on 的 `HAUI_LICENSE_PUBLIC_KEY`。
- 客户只能看到机器码、授权码输入框和授权状态。
- 换机、重装、迁移必须人工重新生成授权码，避免授权码被批量转卖。
- 离线授权不能 100% 防破解；商业防护重点是源码不交付、部署服务、更新服务和人工换机规则。
