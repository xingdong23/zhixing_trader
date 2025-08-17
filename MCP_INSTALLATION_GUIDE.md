# MCP服务安装指南

## 🚀 快速安装方案

由于部分MCP服务尚未发布到npm，我为您准备了多种安装方式：

### 方式一：使用自动化脚本（推荐）
```bash
cd /Users/chengzheng/workspace/chuangxin/zhixing_trader
./install-mcp-services.sh
```

### 方式二：手动安装各个服务

#### 1. EdgeOne Pages MCP
```bash
npm install -g git+https://github.com/TencentEdgeOne/edgeone-pages-mcp.git
# 或从源码安装
git clone https://github.com/TencentEdgeOne/edgeone-pages-mcp.git
cd edgeone-pages-mcp
npm install
npm run build
```

#### 2. Chrome MCP
```bash
npm install -g git+https://github.com/hangwin/mcp-chrome.git
# 或从源码安装
git clone https://github.com/hangwin/mcp-chrome.git
cd mcp-chrome
npm install
npm run build
```

#### 3. Firecrawl MCP Server
```bash
# 需要先安装TypeScript
npm install -g typescript
npm install -g git+https://github.com/mendableai/firecrawl-mcp-server.git
```

#### 4. Shrimp Task Manager MCP
```bash
npm install -g git+https://github.com/cjo4m06/mcp-shrimp-task-manager.git
```

#### 5. Interactive Feedback MCP
```bash
npm install -g git+https://github.com/poliva/interactive-feedback-mcp.git
```

## ⚙️ Claude Desktop配置

配置文件位置：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### 配置示例
```json
{
  "mcpServers": {
    "edgeone-pages": {
      "command": "node",
      "args": ["/path/to/edgeone-pages-mcp/dist/index.js"],
      "env": {
        "EDGEONE_SECRET_ID": "your-secret-id",
        "EDGEONE_SECRET_KEY": "your-secret-key"
      }
    },
    "chrome": {
      "command": "node",
      "args": ["/path/to/mcp-chrome/dist/index.js"]
    },
    "firecrawl": {
      "command": "node",
      "args": ["/path/to/firecrawl-mcp-server/dist/index.js"],
      "env": {
        "FIRECRAWL_API_KEY": "your-firecrawl-api-key"
      }
    },
    "shrimp-task-manager": {
      "command": "node",
      "args": ["/path/to/mcp-shrimp-task-manager/dist/index.js"]
    },
    "interactive-feedback": {
      "command": "node",
      "args": ["/path/to/interactive-feedback-mcp/dist/index.js"]
    }
  }
}
```

## 🔑 API密钥获取

### EdgeOne Pages
1. 注册腾讯云账号
2. 创建EdgeOne服务
3. 获取SecretId和SecretKey

### Firecrawl
1. 访问 https://firecrawl.dev/
2. 注册账号获取API密钥

## ✅ 验证安装

重启Claude Desktop后，您应该能看到这些MCP服务已经加载成功。可以通过以下方式验证：

1. 在Claude Desktop中输入 `/mcp` 查看已安装的服务
2. 尝试使用相关的MCP功能

## 🛠️ 故障排除

### 常见问题
1. **构建失败**: 确保安装了TypeScript `npm install -g typescript`
2. **权限问题**: 确保Node.js有执行权限
3. **路径问题**: 检查配置文件中的路径是否正确

### 获取帮助
- 查看各项目的GitHub Issues
- 检查项目的README文档
- 确保Node.js版本 >= 18