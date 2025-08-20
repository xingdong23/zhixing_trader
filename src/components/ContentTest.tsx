'use client'

import React from 'react'

export default function ContentTest() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="card p-6">
            <h3 className="text-lg font-semibold mb-2">测试项目 {item}</h3>
            <p className="text-text-secondary">
              这是一个测试项目，用于验证内容区域是否正确显示在导航栏右侧。
            </p>
          </div>
        ))}
      </div>
      
      <div className="card p-8">
        <h2 className="text-2xl font-bold mb-4">大标题测试</h2>
        <p className="text-text-secondary mb-4">
          这是一个更大的内容区域，用于测试内容区域是否能正确显示。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface p-4 rounded">
            <h4 className="font-semibold mb-2">子区域 1</h4>
            <p className="text-sm text-text-muted">这是一个子区域的内容。</p>
          </div>
          <div className="bg-surface p-4 rounded">
            <h4 className="font-semibold mb-2">子区域 2</h4>
            <p className="text-sm text-text-muted">这是另一个子区域的内容。</p>
          </div>
        </div>
      </div>
    </div>
  )
}