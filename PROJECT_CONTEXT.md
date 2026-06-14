Project

AI Chat / RP Frontend

目标：

构建一个类似：

* Claude Project
* SillyTavern
* WorldBook
* Character Cards

结合体。

主要用途：

* 长期 RP
* 剧情模拟器
* 小说创作
* 世界观管理
* AI 角色管理

---

Current Architecture

Project

```json
{
  "id": "",
  "name": "",
  "characters": [],
  "worldBook": [],
  "currentState": {},
  "pending": []
}
```

---

Character

```json
{
  "id": "",
  "name": "",
  "avatar": "",
  "persona": "",
  "greeting": ""
}
```

---

Current State

```json
{
  "location": "",
  "scene": "",
  "arc": "",
  "presentCharacters": [],
  "recentEvents": [],
  "unresolvedThreads": [],
  "knownFacts": [],
  "forbiddenAssumptions": [],
  "narratorOnly": ""
}
```

---

Completed Features

Theme Foundation

Commits

83c2ab5
8eb7e31

完成：

* Theme system
* Light mode
* Dark mode

---

Current State

Commits

7b4191b
a7f3ddc
859a149
f477445

完成：

Current State 全字段编辑

支持：

* location
* scene
* arc
* presentCharacters
* recentEvents
* unresolvedThreads
* knownFacts
* forbiddenAssumptions

build pass

---

TXT Character Import

Commits

97f8c86
d20ecad
9b449be

完成：

TXT

↓

Parse

↓

Draft Preview

↓

Bulk Create Characters

支持：

Heading Types

Markdown

```md
# Harry
## Draco
```

Numbered

```text
1. Harry
2. Draco
```

Colon

```text
Harry:
Draco：
```

---

修复：

Bug

人物群像卡.txt

曾出现：

社交圈与态度
社交圈与态度
社交圈与态度

原因：

章节标题被误识别为角色。

已修复：

SECTION_BLACKLIST

并支持：

```js
/^\d+\.\s*(.+)$/
```

编号标题。

---

Known Product Requirements

这些是用户明确要求实现的功能。

优先级很高。

---

Message Actions

每条消息下面必须有：

* Regenerate
* Copy
* Edit
* Delete

类似 Claude。

Regenerate

重新生成当前消息。

Copy

复制消息。

Edit

编辑用户消息后重新生成。

Delete

删除消息。

---

Project Files System

当前缺失。

用户强烈需要。

原因：

目前：

* 模拟器规则
* 写作风格
* RP规则
* 时间线
* 大纲

不知道放在哪里。

---

目标：

类似 Claude Project Files。

---

数据结构

```json
{
  "id": "",
  "title": "",
  "content": "",
  "enabled": true,
  "createdAt": "",
  "updatedAt": ""
}
```

Project

```js
project.files = []
```

---

用途

存放：

* 模拟器规则
* 写作风格
* RP规则
* 时间线
* 世界观补充
* NPC资料
* 剧情文档

---

UI

新增：

Files

Tab

新增：

ProjectFilesPanel.jsx

---

Prompt Injection Order

非常重要：

Instructions
↓
Project Files
↓
WorldBook
↓
Current State
↓
Chat History

不要改变顺序。

---

Development Rules

必须遵守：

小步开发

---

每一步：

```sh
npx vite build
```

必须通过。

---

不要自动 commit。

等用户确认。

---

不要自动 push。

等用户确认。

---

修改范围最小化。

不要顺手重构无关代码。

---

Current Priority

Phase 7A

Project Files

最高优先级

---

建议拆分：

7A-1

Project Files Data Model

---

7A-2

Project Files UI

---

7A-3

Project Files Persistence

---

7A-4

Prompt Injection

---

Phase 7B

Message Actions

* Regenerate
* Copy
* Edit
* Delete

---

Important Context

用户是重度 RP 用户。

项目核心不是普通聊天。

而是：

Character
+
WorldBook
+
Current State
+
Project Files
+
Long-term Story

所以：

优先保证：

* 剧情连续性
* 设定管理
* 规则管理

而不是普通聊天功能。

---

Usage For New Codex Sessions

以后每次开新 Codex 会话，直接先贴这个，再说：

请先阅读 PROJECT_CONTEXT.md。
不要直接写代码。
先说明你理解的当前架构和下一步计划。

这样它基本不会丢上下文。
