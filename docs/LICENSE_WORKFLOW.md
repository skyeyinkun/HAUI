# HAUI Pro 离线授权流程

适用版本：HAUI 5.15.15+

## 目标

用于一次性部署销售：用户付款后，HAUI 显示机器码，开发者生成绑定机器码的授权码，用户导入后本地离线验证。

## 首次准备

授权码生成工具不随 HAUI 项目和客户交付包发布。开发者本机应单独维护私有工具目录，例如：

```text
D:\1工作文件保存\AI code\HAUI-License-Tools
```

首次在私有工具目录中生成密钥：

```bash
node generate-license.mjs --initKeys=1
```

会生成：

- `license-private.pem`：私钥，只保存在开发者本机，不能提交。
- `license-public.pem`：公钥。5.15.0 后可内置默认公钥，也可部署时填入 Add-on 配置项 `HAUI_LICENSE_PUBLIC_KEY` 覆盖。

## 交付流程

1. 用户付款。
2. 远程部署 HAUI。
3. 打开 `系统设置 -> 授权`。
4. 复制机器码。正式 Add-on 部署时，机器码由 Add-on 后端生成并持久化，换浏览器或用平板访问不会变化。
5. 开发者生成授权码：

```bash
node generate-license.mjs --machine=HAUI-MACHINE-XXXX-XXXX-XXXX --buyer="客户名" --updatesUntil=2027-05-04 --licenseId=HAUI-20260513-0001
```

6. 把输出的长授权码发给用户。
7. 用户粘贴到授权页，点击激活。

## 商业规则建议

- 99 元：单实例 Pro 授权 + 一次部署 + 1 年更新。
- 换机：免费 1 次，之后人工处理。
- 第二实例：单独收费。
- 到期后：已安装 Pro 继续使用，但不再获得维护期之后的新版本。

## 交付隔离要求

- 不要把完整开发仓库交给客户。
- 不要把 `src`、`scripts`、测试文件、`.git`、`.env`、`node_modules` 打入客户交付包。
- 不要把 `license-private.pem`、授权生成脚本或客户授权台账发给客户。
- 客户交付包应通过 `npm run package:customer` 生成，输出目录为 `customer-packages/`，该目录已被 Git 忽略。
