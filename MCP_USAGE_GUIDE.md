# MCP (Model Context Protocol) 使用指南

## 概述
MCP是Anthropic开发的开放协议，用于AI模型与外部工具和数据的集成。

## 已安装的服务器

### 1. Filesystem Server
**功能**: 文件系统操作和访问
**安装**: 已全局安装
**配置路径**: `/Users/chengzheng/Desktop`, `/Users/chengzheng/Downloads`, `/Users/chengzheng/workspace`

**使用示例**:
```bash
# 启动服务器
npx -y @modelcontextprotocol/server-filesystem /path/to/directory
```

### 2. Git Server
**功能**: Git仓库操作
**安装**: 已通过uv安装
**配置**: 支持任意Git仓库

**使用示例**:
```bash
# 在特定仓库中使用
uvx mcp-server-git -r /path/to/repository
```

### 3. Brave Search Server
**功能**: 网络搜索功能
**安装**: 已全局安装
**状态**: 需要API密钥

**配置API密钥**:
1. 访问 https://api.search.brave.com/
2. 注册账户并获取API密钥
3. 更新配置文件中的 `BRAVE_API_KEY`

## Claude Desktop 配置

配置文件位置: `~/.config/claude/claude_desktop_config.json`

已配置的服务器:
- filesystem: 文件系统访问
- git: Git操作
- brave-search: 网络搜索

## 使用方法

### 在Claude Desktop中使用
1. 重启Claude Desktop
2. MCP服务器会自动加载
3. 可以通过对话访问文件系统、Git仓库和网络搜索

### 命令行测试
```bash
# 测试filesystem服务器
npx -y @modelcontextprotocol/server-filesystem /path/to/directory

# 测试git服务器
uvx mcp-server-git -r /path/to/repository

# 测试brave-search服务器（需要API密钥）
npx -y @modelcontextprotocol/server-brave-search
```

## 故障排除

### 常见问题
1. **服务器无法启动**: 检查路径权限和依赖
2. **API密钥错误**: 确保BRAVE_API_KEY正确设置
3. **权限问题**: 确保对指定目录有读写权限

### 调试方法
1. 检查Claude Desktop日志
2. 使用命令行测试服务器
3. 验证配置文件语法

## 下一步
1. 配置Brave Search API密钥
2. 测试所有服务器的功能
3. 创建自定义MCP服务器
4. 集成到工作流程中