# 虎序 Tiger Flow

一个覆盖虎码完整学习周期的离线优先交互式训练器：从五个基本笔画、241 字根和取码公式，逐步进入 632 个必拆字、前 1500 常用字、简码、真实中文跟打和长期复习。

## 功能

- 今日训练：到期复习、新内容和真实输入组成一轮短训练
- 完整课程：9 个阶段均可直接进入，不强制等待解锁
- 练码模式：切到英文后直接输入虎码编码
- 实战模式：使用系统 Fcitx5 虎码输入中文，独立统计准确率和字速
- 间隔复习：为每个字根、拆分和单字记录掌握度与下次复习时间
- 离线查码：覆盖官网前 5000 高频字、拆分、字根码、全码和简码
- 本地数据：进度保存在浏览器，支持 JSON 导入、导出和清空
- 主题：跟随系统、浅色、深色三档
- PWA：构建后可离线使用

## 开发

要求 Bun 1.3 或更高版本。

```bash
bun install
bun run dev
```

常用命令：

```bash
bun run test       # Vitest 数据与掌握度测试
bun run test:e2e   # Playwright 桌面/手机交互测试
bun run lint       # Oxlint
bun run build      # TypeScript + Vite 生产构建
bun run check      # lint + unit test + build
```

## 训练数据

`bun run data:sync` 会一次性生成静态数据，应用运行时不依赖虎码官网：

- 241 字根来自虎码官网字根表
- 632 必拆字来自官网练习清单
- 前 5000 高频字来自官网练习接口
- 拆分与根码来自官网拆分查询
- canonical 全码由 `Aa / ABb / ABCc / ABCD / ABCZ` 公式重建
- 本机 Fcitx5 二进制词典只作为官网不可用时的前 1500 字回退来源

当前同步脚本使用的官网 Server Action 标识与 Next.js build 绑定。官网升级后若高频字同步失败，需要更新 `scripts/generate-data.ts` 中的 `Next-Action`。

## 资源说明

浅色和深色字根图来自 [虎码官网](https://www.tiger-code.com/)，仅作为学习参考。项目没有打包官网的 PUA 字体；界面会把可识别的变体转换为标准主根，特殊变体可在字根图中查看。

本项目与虎码官方无隶属关系。

## 许可证

除单独标注的第三方内容外，本项目以 [GNU Affero General Public License v3.0 or later](LICENSE) 发布：你可以使用、研究、修改和再分发，但向网络用户提供修改后的版本时，也必须向这些用户提供对应源代码。

Copyright (C) 2026 gxxk-dev。项目不提供任何担保。官网字根图和数据来源的权利说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
