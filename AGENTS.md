# 项目约定

- 所有变更在本项目目录内完成。使用 npm 和锁文件，不操作远程仓库或提交 Git，除非用户明确授权。
- 修改业务前读取 GLOSSARY.md 和 docs/requirements.md。通过稳定 ID 关联记录，管理端与员工端共用 Pinia 数据。
- 业务写入经过 Store 校验与项目专属存储。区分计划、执行事实、监测来源与品类重量单位。
- 变更业务行为时在 Vitest 或 Playwright 验证用户可观察结果。交付前运行 npm test、npm run build 和 npm run test:e2e。

## Agent skills

### Issue tracker

任务使用 .scratch/ 下的本地 Markdown。参见 docs/agents/issue-tracker.md。

### Triage labels

使用五个默认分诊标签。参见 docs/agents/triage-labels.md。

### Domain docs

项目使用单一领域词汇表。参见 docs/agents/domain.md。
