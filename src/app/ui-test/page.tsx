'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Form'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'

export default function UITestPage() {
  const [showModal, setShowModal] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState('')

  const sampleData = [
    { id: 1, name: '测试数据1', value: 100, status: '活跃' },
    { id: 2, name: '测试数据2', value: 200, status: '待处理' },
    { id: 3, name: '测试数据3', value: 300, status: '已完成' },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-primary mb-8">UI 组件测试页面</h1>
        
        {/* 卡片组件测试 */}
        <section>
          <h2 className="text-2xl font-bold text-text-primary mb-4">卡片组件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>基础卡片</CardTitle>
                <CardDescription>这是一个基础卡片组件的示例</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary">卡片内容区域，可以放置任何内容。</p>
              </CardContent>
            </Card>
            
            <Card hover>
              <CardHeader>
                <CardTitle>悬停卡片</CardTitle>
                <CardDescription>鼠标悬停有动画效果</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary">这个卡片在鼠标悬停时会有动画效果。</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 按钮组件测试 */}
        <section>
          <h2 className="text-2xl font-bold text-text-primary mb-4">按钮组件</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button variant="danger">危险按钮</Button>
            <Button variant="success">成功按钮</Button>
            
            <div className="w-full mt-4">
              <p className="text-text-secondary mb-2">不同尺寸：</p>
              <div className="flex flex-wrap gap-4">
                <Button size="sm">小按钮</Button>
                <Button size="md">中按钮</Button>
                <Button size="lg">大按钮</Button>
              </div>
            </div>
          </div>
        </section>

        {/* 表单组件测试 */}
        <section>
          <h2 className="text-2xl font-bold text-text-primary mb-4">表单组件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-text-secondary mb-2">输入框</label>
              <Input
                placeholder="请输入内容..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-text-secondary mb-2">选择框</label>
              <Select value={selectValue} onChange={(e) => setSelectValue(e.target.value)}>
                <option value="">请选择</option>
                <option value="option1">选项1</option>
                <option value="option2">选项2</option>
                <option value="option3">选项3</option>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-text-secondary mb-2">文本域</label>
              <Textarea
                placeholder="请输入多行文本..."
                rows={4}
              />
            </div>
          </div>
        </section>

        {/* 表格组件测试 */}
        <section>
          <h2 className="text-2xl font-bold text-text-primary mb-4">表格组件</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>数值</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="data-positive">{item.value}</TableCell>
                  <TableCell>
                    <span className="tag">{item.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* 模态框测试 */}
        <section>
          <h2 className="text-2xl font-bold text-text-primary mb-4">模态框组件</h2>
          <Button onClick={() => setShowModal(true)}>打开模态框</Button>
          
          <Modal open={showModal} onClose={() => setShowModal(false)} size="lg">
            <ModalHeader>
              <ModalTitle>模态框标题</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p className="text-text-secondary mb-4">
                这是一个模态框的内容区域。可以放置表单、提示信息或其他内容。
              </p>
              <Input placeholder="模态框中的输入框" />
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={() => setShowModal(false)}>
                确认
              </Button>
            </ModalFooter>
          </Modal>
        </section>

        {/* 数据展示样式测试 */}
        <section>
          <h2 className="text-2xl font-bold text-text-primary mb-4">数据展示样式</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-text-secondary mb-2">盈利数据</p>
                  <p className="text-3xl font-bold data-positive">+¥1,234.56</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-text-secondary mb-2">亏损数据</p>
                  <p className="text-3xl font-bold data-negative">-¥567.89</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-text-secondary mb-2">中性数据</p>
                  <p className="text-3xl font-bold data-neutral">¥0.00</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}