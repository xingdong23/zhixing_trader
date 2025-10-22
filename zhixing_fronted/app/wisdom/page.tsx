"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import WisdomLibrary from "@/components/wisdom/WisdomLibrary"

export default function WisdomPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回主页
          </Button>
          <div>
            <h1 className="text-3xl font-bold">交易智慧库</h1>
            <p className="text-muted-foreground mt-2">
              管理你的交易心得、名言、读书笔记和实战经验
            </p>
          </div>
        </div>

        {/* 智慧库组件 */}
        <WisdomLibrary />
      </div>
    </div>
  )
}
