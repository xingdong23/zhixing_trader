#!/usr/bin/env node

/**
 * 【知行交易】API路由重构脚本
 * 批量更新所有route.ts文件，使用统一的API配置
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const API_DIR = path.join(__dirname, '../src/app/api');
const CONFIG_IMPORT = "import { getBackendApiUrl, createFetchConfig } from '../../../config/api';";

/**
 * 递归查找所有route.ts文件
 */
function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 计算相对路径深度，用于确定import路径
 */
function getImportPath(filePath) {
  const relativePath = path.relative(API_DIR, path.dirname(filePath));
  const depth = relativePath.split(path.sep).length;
  const prefix = '../'.repeat(depth + 2); // +2 for api and src
  return `${prefix}config/api`;
}

/**
 * 重构单个route.ts文件
 */
function refactorRouteFile(filePath) {
  console.log(`正在处理: ${path.relative(process.cwd(), filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  {
    // 处理后端API文件
    if (content.includes("const BACKEND_API_BASE = 'http://localhost:8000/api/v1';")) {
      const importPath = getImportPath(filePath);
      
      // 添加import语句
      content = content.replace(
        /import \{ NextRequest, NextResponse \} from 'next\/server';/,
        `import { NextRequest, NextResponse } from 'next/server';\nimport { getBackendApiUrl, createFetchConfig } from '${importPath}';`
      );
      
      // 移除硬编码的常量
      content = content.replace(
        /const BACKEND_API_BASE = 'http:\/\/localhost:8000\/api\/v1';\s*/,
        ''
      );
      
      // 替换fetch调用
      content = content.replace(
        /fetch\(\`\$\{BACKEND_API_BASE\}([^`]+)\`, \{\s*method: '(GET|POST|PUT|DELETE)',\s*headers: \{\s*'Content-Type': 'application\/json',\s*\},?\s*(body: JSON\.stringify\([^)]+\),?\s*)?\}\)/g,
        (match, endpoint, method, bodyPart) => {
          const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
          if (bodyPart) {
            const bodyVar = bodyPart.match(/JSON\.stringify\(([^)]+)\)/)?.[1] || 'body';
            return `fetch(\n      getBackendApiUrl('${cleanEndpoint}'),\n      createFetchConfig('${method}', ${bodyVar})\n    )`;
          } else {
            return `fetch(\n      getBackendApiUrl('${cleanEndpoint}'),\n      createFetchConfig('${method}')\n    )`;
          }
        }
      );
      
      modified = true;
    }
  }
  
  // 清理多余的空行
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已更新: ${path.relative(process.cwd(), filePath)}`);
  } else {
    console.log(`⏭️  跳过: ${path.relative(process.cwd(), filePath)} (无需更新)`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始重构API路由文件...');
  console.log(`📁 扫描目录: ${API_DIR}`);
  
  const routeFiles = findRouteFiles(API_DIR);
  console.log(`📄 找到 ${routeFiles.length} 个route.ts文件`);
  
  let processedCount = 0;
  let modifiedCount = 0;
  
  for (const file of routeFiles) {
    const beforeContent = fs.readFileSync(file, 'utf8');
    refactorRouteFile(file);
    const afterContent = fs.readFileSync(file, 'utf8');
    
    processedCount++;
    if (beforeContent !== afterContent) {
      modifiedCount++;
    }
  }
  
  console.log('\n📊 重构完成统计:');
  console.log(`   处理文件: ${processedCount}`);
  console.log(`   修改文件: ${modifiedCount}`);
  console.log(`   跳过文件: ${processedCount - modifiedCount}`);
  
  if (modifiedCount > 0) {
    console.log('\n✨ 重构完成！所有API路由现在使用统一配置。');
    console.log('💡 提示: 可以通过修改 .env.local 中的 BACKEND_API_BASE_URL 来更改后端地址。');
  } else {
    console.log('\n✅ 所有文件都已是最新状态，无需修改。');
  }
}

if (require.main === module) {
  main();
}

module.exports = { refactorRouteFile, findRouteFiles };