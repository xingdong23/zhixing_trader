'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Folder,
  FolderOpen,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: number;
  category_id: string;
  name: string;
  parent_id: string | null;
  path: string;
  level: number;
  icon: string | null;
  color: string | null;
  stock_count: number;
  total_stock_count: number;
  children: Category[];
}

// ========== Mock模式配置 ==========

// ========== Mock模式配置 ==========
const USE_MOCK_DATA = false; // 默认关闭Mock模式，优先使用真实API

export default function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    icon: '',
    color: ''
  });

  // 可选图标
  const iconOptions = ['📁', '📂', '⭐', '🎯', '💼', '🏢', '🚀', '💡', '🔥', '⚡', '🌟', '📊'];

  // 可选颜色
  const colorOptions = [
    { name: '蓝色', value: 'blue' },
    { name: '绿色', value: 'green' },
    { name: '红色', value: 'red' },
    { name: '黄色', value: 'yellow' },
    { name: '紫色', value: 'purple' },
    { name: '粉色', value: 'pink' },
    { name: '灰色', value: 'gray' },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);

      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

      if (USE_MOCK_DATA) {
        // ========== Mock模式: 直接使用Mock数据 ==========
        const mockCategories: Category[] = [
          {
            id: 1,
            category_id: 'cat_1',
            name: '行业板块',
            parent_id: null,
            path: '行业板块',
            level: 0,
            icon: '📁',
            color: 'blue',
            stock_count: 0,
            total_stock_count: 50,
            children: [
              {
                id: 2,
                category_id: 'cat_2',
                name: '科技股',
                parent_id: 'cat_1',
                path: '行业板块/科技股',
                level: 1,
                icon: '💻',
                color: 'blue',
                stock_count: 30,
                total_stock_count: 30,
                children: []
              },
              {
                id: 3,
                category_id: 'cat_3',
                name: '能源',
                parent_id: 'cat_1',
                path: '行业板块/能源',
                level: 1,
                icon: '⚡',
                color: 'green',
                stock_count: 20,
                total_stock_count: 20,
                children: []
              }
            ]
          },
          {
            id: 4,
            category_id: 'cat_4',
            name: '交易策略',
            parent_id: null,
            path: '交易策略',
            level: 0,
            icon: '🎯',
            color: 'purple',
            stock_count: 0,
            total_stock_count: 15,
            children: [
              {
                id: 5,
                category_id: 'cat_5',
                name: '长线持有',
                parent_id: 'cat_4',
                path: '交易策略/长线持有',
                level: 1,
                icon: '📈',
                color: 'green',
                stock_count: 15,
                total_stock_count: 15,
                children: []
              }
            ]
          }
        ];

        setCategories(mockCategories);
        const allIds = getAllCategoryIds(mockCategories);
        setExpandedNodes(new Set(allIds));
        setIsLoading(false);
        return;
      }

      // ========== 真实API调用 ==========
      try {
        const response = await fetch(`${base}/api/v1/categories/`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success !== false) { // 兼容不同的API响应格式，有的可能直接返回数组
          const data = result.data || result; // 尝试获取 data 字段，或者直接使用 result
          if (Array.isArray(data)) {
            setCategories(data);
            const allIds = getAllCategoryIds(data);
            setExpandedNodes(new Set(allIds));
          } else {
            // 处理可能的非标准响应
            console.warn('API returned non-array data:', result);
            setCategories([]);
          }
        }
      } catch (apiError) {
        console.error('后端API连接失败:', apiError);
        // 如果API失败，可以根据需求决定是否回退到Mock，当前选择提示错误
        // toast.error('无法连接到后端API');

        // 临时回退 Mock 以展示界面 (可选)
        /*
        const mockCategories: Category[] = [...];
        setCategories(mockCategories);
        */
      }

    } catch (error) {
      console.error('获取分类失败:', error);
      toast.error('获取分类失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getAllCategoryIds = (nodes: Category[]): string[] => {
    let ids: string[] = [];
    for (const node of nodes) {
      ids.push(node.category_id);
      if (node.children && node.children.length > 0) {
        ids = ids.concat(getAllCategoryIds(node.children));
      }
    }
    return ids;
  };

  const toggleNode = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', parent_id: '', icon: '📁', color: 'blue' });
    setShowCreateDialog(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parent_id: category.parent_id || '',
      icon: category.icon || '📁',
      color: category.color || 'blue'
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    try {
      if (USE_MOCK_DATA) {
        // ========== Mock模式: 本地操作 ==========
        if (editingCategory) {
          // 编辑模式
          const updateCategory = (cats: Category[]): Category[] => {
            return cats.map(cat => {
              if (cat.category_id === editingCategory.category_id) {
                return {
                  ...cat,
                  name: formData.name,
                  icon: formData.icon,
                  color: formData.color,
                  parent_id: formData.parent_id || null
                };
              }
              if (cat.children.length > 0) {
                return {
                  ...cat,
                  children: updateCategory(cat.children)
                };
              }
              return cat;
            });
          };

          setCategories(updateCategory(categories));
          toast.success('✅ 分类更新成功 (Mock模式)');
        } else {
          // 创建模式
          const newCategory: Category = {
            id: Date.now(),
            category_id: `cat_${Date.now()}`,
            name: formData.name,
            parent_id: formData.parent_id || null,
            path: formData.parent_id ? `${formData.parent_id}/${formData.name}` : formData.name,
            level: formData.parent_id ? 1 : 0,
            icon: formData.icon || '📁',
            color: formData.color || 'blue',
            stock_count: 0,
            total_stock_count: 0,
            children: []
          };

          if (!formData.parent_id) {
            // 顶级分类
            setCategories([...categories, newCategory]);
          } else {
            // 子分类
            const addToParent = (cats: Category[]): Category[] => {
              return cats.map(cat => {
                if (cat.category_id === formData.parent_id) {
                  return {
                    ...cat,
                    children: [...cat.children, newCategory]
                  };
                }
                if (cat.children.length > 0) {
                  return {
                    ...cat,
                    children: addToParent(cat.children)
                  };
                }
                return cat;
              });
            };

            setCategories(addToParent(categories));
          }

          toast.success('✅ 分类创建成功 (Mock模式)');
        }

        setShowCreateDialog(false);
        return;
      }

      // ========== 真实API调用 ==========
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
        const url = editingCategory
          ? `${base}/api/v1/categories/${editingCategory.category_id}`
          : `${base}/api/v1/categories/`;

        const method = editingCategory ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            parent_id: formData.parent_id || null,
            icon: formData.icon,
            color: formData.color
          })
        });

        const result = await response.json();

        if (result.success) {
          toast.success(editingCategory ? '分类更新成功' : '分类创建成功');
          setShowCreateDialog(false);
          fetchCategories();
        }
      } catch (apiError) {
        console.error('后端API连接失败:', apiError);
        toast.error('无法连接到后端API');
      }

    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('确定要删除这个分类吗？子分类也会被删除。')) {
      return;
    }

    try {
      if (USE_MOCK_DATA) {
        // ========== Mock模式: 本地删除 ==========
        const removeCategory = (cats: Category[]): Category[] => {
          return cats.filter(cat => {
            if (cat.category_id === categoryId) {
              return false;
            }
            if (cat.children.length > 0) {
              cat.children = removeCategory(cat.children);
            }
            return true;
          });
        };

        setCategories(removeCategory(categories));
        toast.success('✅ 分类删除成功 (Mock模式)');
        return;
      }


      // ========== 真实API调用 ==========
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
        const response = await fetch(`${base}/api/v1/categories/${categoryId}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
          toast.success('分类删除成功');
          fetchCategories();
        }
      } catch (apiError) {
        console.error('后端API连接失败:', apiError);
        toast.error('无法连接到后端API');
      }

    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const renderCategoryNode = (node: Category, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.category_id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.category_id}>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 group transition-colors border border-transparent hover:border-gray-200"
          style={{ marginLeft: `${level * 24}px` }}
        >
          {/* 展开按钮 */}
          <div
            className="w-5 h-5 flex items-center justify-center flex-shrink-0 cursor-pointer"
            onClick={(e) => hasChildren && toggleNode(node.category_id, e)}
          >
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            )}
          </div>

          {/* 图标 */}
          <div className="text-xl flex-shrink-0">
            {node.icon || (isExpanded ? <FolderOpen className="w-5 h-5 text-yellow-600" /> : <Folder className="w-5 h-5 text-yellow-600" />)}
          </div>

          {/* 名称 */}
          <div className="flex-1">
            <div className="font-medium">{node.name}</div>
            <div className="text-xs text-gray-500">
              {node.path}
            </div>
          </div>

          {/* 统计 */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-gray-600">
              <span className="font-semibold">{node.stock_count}</span> 股票
            </div>
            {hasChildren && (
              <div className="text-gray-500">
                <span className="font-semibold">{node.total_stock_count}</span> 总计
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(node)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(node.category_id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 子节点 */}
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {node.children.map((child) => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 获取所有分类的扁平列表(用于父分类选择)
  const getFlatCategories = (nodes: Category[], exclude?: string): Category[] => {
    let result: Category[] = [];
    for (const node of nodes) {
      if (node.category_id !== exclude) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          result = result.concat(getFlatCategories(node.children, exclude));
        }
      }
    }
    return result;
  };

  const flatCategories = getFlatCategories(categories, editingCategory?.category_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">分类管理</h2>
          <p className="text-gray-500 mt-1">
            管理股票分类,支持多级嵌套
            {USE_MOCK_DATA && <span className="ml-2 text-xs text-amber-600">🎭 Mock模式 - 不调用后端API</span>}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          创建分类
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总分类数</p>
                <p className="text-2xl font-bold">{getAllCategoryIds(categories).length}</p>
              </div>
              <Folder className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">顶级分类</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总股票数</p>
                <p className="text-2xl font-bold">
                  {categories.reduce((sum, cat) => sum + cat.total_stock_count, 0)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分类树 */}
      <Card>
        <CardHeader>
          <CardTitle>分类列表</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无分类</p>
              <p className="text-sm mt-2">点击"创建分类"按钮开始创建</p>
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((node) => renderCategoryNode(node))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? '编辑分类' : '创建分类'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 分类名称 */}
            <div>
              <Label htmlFor="name">分类名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 科技股、能源板块..."
              />
            </div>

            {/* 父分类 */}
            <div>
              <Label htmlFor="parent">父分类 (可选)</Label>
              <Select
                value={formData.parent_id ? formData.parent_id : 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, parent_id: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择父分类 (留空为顶级分类)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无 (顶级分类)</SelectItem>
                  {flatCategories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {'  '.repeat(cat.level)}{cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 图标选择 */}
            <div>
              <Label>图标</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 flex items-center justify-center text-xl border-2 rounded-lg transition-colors ${formData.icon === icon
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 颜色选择 */}
            <div>
              <Label>颜色</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`px-3 py-1.5 text-sm border-2 rounded-lg transition-colors ${formData.color === color.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingCategory ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

