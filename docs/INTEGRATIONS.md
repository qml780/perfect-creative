# 集成状态

正式服务的配置状态可在员工后台「集成状态」查看。本机预览使用 Argos 做离线翻译。

| 服务 | 在实现对应适配器前需要的资料 |
| --- | --- |
| Supabase | 单独的开发与生产项目，用户邀请配置和存储桶策略。服务端凭证放在部署的密钥管理中。 |
| PayPal | Developer Dashboard 建立 Sandbox 应用，提供 sandbox Client ID、Secret、Webhook ID 和测试账户。正式启用需商户批准与服务器捕获核验。 |
| 微信、支付宝、UseePay | 从商户平台确认获批产品、商户号、正式回调地址和服务端验签方案。 |
| 翻译 | Argos 模型在本机运行，消息留在本机。支持英语、简体中文和马来语，简体中文与马来语互译时经过英语。 |
| GA4 | 建立分析属性，配置测量 ID 与只读服务身份。核对采用的同意机制。 |
| 邮件 | 使用有权管理的域名验证发送方，配置指向测试邮箱的沙箱。 |

[PayPal 开发文档](https://developer.paypal.com/docs/checkout/) · [Supabase 文档](https://supabase.com/docs) · [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)

### 重启本机翻译

进入项目目录后，在独立 PowerShell 窗口运行以下命令。服务只监听 `127.0.0.1:3117`。

```powershell
& .data/translation/venv/Scripts/python.exe scripts/local-translation.py
```

在 `.env.local` 中使用 `LOCAL_TRANSLATION_URL=http://127.0.0.1:3117`。模型已经保存在项目的 `.data/translation`。在新机器上，可用 Python 3.12 创建同路径的虚拟环境并安装 `ctranslate2==4.7.1`、`sentencepiece==0.2.1` 和 `langid==1.1.6`，从索引下载 `en_zh`、`zh_en`、`en_ms`、`ms_en` 版本 1.9，分别保存为 `<语言对>.argosmodel`。 [Argos Translate](https://github.com/argosopentech/argos-translate) · [官方模型索引](https://github.com/argosopentech/argospm-index/blob/main/index.json)

聊天通过服务器发送事件推送。原文入库后立即发送给对方，翻译完成后再更新同一条消息。当前推送适用于单个网站进程。
