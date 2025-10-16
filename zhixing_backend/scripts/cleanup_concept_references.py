"""
清理代码中的concept引用，替换为categories系统
"""
import re

# 读取stocks.py文件
stocks_file = "../app/api/v1/endpoints/stocks.py"

with open(stocks_file, "r", encoding="utf-8") as f:
    content = f.read()

print(f"原文件大小: {len(content)} 字符")

# 检查是否有concept相关的引用
concept_patterns = [
    r"ConceptDB",
    r"ConceptStockRelationDB",
    r"concept_id",
    r"concept_name",
    r"concepts\s*=",
    r"concept_objs",
]

for pattern in concept_patterns:
    matches = re.findall(pattern, content, re.IGNORECASE)
    if matches:
        print(f"找到 '{pattern}': {len(matches)} 处")

print("\n✅ 脚本已准备好，需要手动处理stocks.py中的concept引用")

