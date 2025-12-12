---
description: 交易日志后端开发规范与项目信息
---

# 知行交易系统 - 后端开发规范

## 🌐 沟通规范
- **语言**: 所有与 AI 的沟通和代码注释均使用**简体中文**。
- **回复风格**: 简洁、专业、直接。

---

## 🏗️ 项目架构

### 技术栈
- **JDK 版本**: 21 (必须使用 JDK 21 语法特性，如 Record, Pattern Matching, Virtual Threads)
- **框架**: Spring Boot 3.2+
- **构建工具**: Maven
- **持久层**: Spring Data JPA
- **数据库**: H2 (开发环境), 可切换 MySQL/PostgreSQL (生产环境)

### 项目结构
```
trading_journal_backend/
├── src/main/java/com/zhixing/journal/
│   ├── TradingJournalApplication.java  # 启动类
│   ├── common/            # 通用类 (ApiResponse, 异常处理)
│   ├── stock/             # 股票模块
│   ├── trade/             # 交易模块
│   ├── note/              # 笔记模块
│   └── category/          # 分类模块
├── src/main/resources/
│   ├── application.yml    # 配置文件
│   └── static/            # 前端打包文件存放目录
└── pom.xml
```

### 前后端集成方式
- **前端打包后**，将构建产物 (HTML, CSS, JS) 放入 `src/main/resources/static/` 目录。
- **只需启动后端服务** (`mvn spring-boot:run` 或运行 jar 包) 即可访问完整应用。
- 后端既是 API 服务器，也是静态资源服务器。

---

## ✨ 代码风格规范

### 1. 代码优雅性要求
- 使用 Lombok (`@Data`, `@RequiredArgsConstructor`) 减少样板代码。
- 使用 JDK 21 特性:
  - `record` 定义 DTO/响应类。
  - `switch` 表达式替代 `if-else` 链。
  - `Optional` 处理空值。
- 方法简短，单一职责。
- 使用 Stream API 进行集合操作。

### 2. 分层规范
| 层级 | 命名规范 | 职责 |
|------|----------|------|
| Controller | `XxxController` | 处理 HTTP 请求，参数校验，调用 Service |
| Service | `XxxService` | 业务逻辑，事务管理 |
| Repository | `XxxRepository` | 数据访问，继承 `JpaRepository` |
| Entity | `Xxx` | JPA 实体，映射数据库表 |
| DTO/Node | `XxxDTO` / `XxxNode` | 数据传输对象 |

### 3. API 设计规范
- 统一 RESTful 风格。
- 统一响应格式: `ApiResponse<T>` (包含 success, message, data, code)。
- URL 路径: `/api/v1/{module}/{action}`。
- 分页: 使用 Spring `Pageable`，默认每页 20 条。

### 4. 注释规范
- 所有类、方法、重要逻辑使用**中文注释**。
- 复杂逻辑需添加注释说明"为什么"而非"做了什么"。

---

## 🚀 常用命令

```bash
# 编译项目
mvn clean install

# 运行项目 (开发模式)
mvn spring-boot:run

# 跳过测试编译
mvn clean install -DskipTests
```

---

## 📦 模块 API 概览

| 模块 | 路径前缀 | 主要接口 |
|------|----------|----------|
| 股票 | `/api/v1/stocks` | `GET /overview`, `GET /concepts/categories` |
| 交易 | `/api/v1/trades` | `GET /`, `POST /`, `PUT /{id}`, `GET /stats` |
| 笔记 | `/api/v1/notes` | `GET /`, `POST /`, `PUT /{id}`, `DELETE /{id}` |
| 分类 | `/api/v1/categories` | `GET /`, `POST /`, `DELETE /{categoryId}` |

---

## 🔧 配置文件参考 (application.yml)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:h2:file:./data/journal
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
  h2:
    console:
      enabled: true
      path: /h2-console
```

---

## ⚠️ 注意事项
1. 前端 API 调用基础路径为 `/api/v1`。
2. 开发时可通过 `/h2-console` 访问 H2 数据库控制台。
3. 生产环境需替换 H2 为 MySQL/PostgreSQL，并关闭 H2 控制台。
