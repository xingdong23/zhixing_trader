"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  MessageSquare, 
  ThumbsUp, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Send
} from "lucide-react"
import { cn } from "@/lib/utils"

// 判断类型
export type JudgmentType = 
  | "bullish"      // 看涨
  | "bearish"      // 看跌
  | "neutral"      // 中性
  | "price_target" // 价格目标
  | "risk"         // 风险提示
  | "entry"        // 入场点
  | "exit"         // 出场点

// 评论接口
export interface Comment {
  id: string
  author: string
  authorAvatar?: string
  content: string
  timestamp: string
  likes: number
  replies?: Comment[]
}

// 笔记接口
export interface TimelineNote {
  id: string
  author: string
  authorAvatar?: string
  content: string
  timestamp: string
  judgmentType: JudgmentType
  priceTarget?: number
  currentPrice?: number
  likes: number
  comments: Comment[]
}

interface TimelineNotesProps {
  notes: TimelineNote[]
  onAddNote?: (note: Omit<TimelineNote, "id" | "timestamp" | "likes" | "comments">) => void
  onAddComment?: (noteId: string, comment: string, parentCommentId?: string) => void
  onLike?: (noteId: string, commentId?: string) => void
}

// 判断类型配置
const judgmentConfig: Record<JudgmentType, {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}> = {
  bullish: {
    label: "看涨",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-500"
  },
  bearish: {
    label: "看跌",
    icon: <TrendingDown className="w-4 h-4" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-500"
  },
  neutral: {
    label: "中性",
    icon: <TrendingUp className="w-4 h-4 rotate-90" />,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-500"
  },
  price_target: {
    label: "价格目标",
    icon: <DollarSign className="w-4 h-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-500"
  },
  risk: {
    label: "风险提示",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-500"
  },
  entry: {
    label: "入场点",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-500"
  },
  exit: {
    label: "出场点",
    icon: <TrendingDown className="w-4 h-4" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-500"
  }
}

// 评论组件
function CommentItem({ 
  comment, 
  noteId,
  onReply, 
  onLike,
  depth = 0 
}: { 
  comment: Comment
  noteId: string
  onReply?: (noteId: string, content: string, parentId: string) => void
  onLike?: (noteId: string, commentId: string) => void
  depth?: number
}) {
  const [showReply, setShowReply] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [showReplies, setShowReplies] = useState(true)

  const handleReply = () => {
    if (replyContent.trim() && onReply) {
      onReply(noteId, replyContent, comment.id)
      setReplyContent("")
      setShowReply(false)
    }
  }

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-8 mt-3")}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-400 text-white">
            {comment.author.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.author}</span>
              <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => onLike?.(noteId, comment.id)}
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              {comment.likes > 0 && comment.likes}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setShowReply(!showReply)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              回复
            </Button>
            {comment.replies && comment.replies.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {comment.replies.length} 条回复
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 回复输入框 */}
      {showReply && (
        <div className="ml-11 flex gap-2">
          <Textarea
            placeholder={`回复 ${comment.author}...`}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          <Button size="sm" onClick={handleReply}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 嵌套回复 */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              noteId={noteId}
              onReply={onReply}
              onLike={onLike}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 时间线笔记项
function TimelineNoteItem({ 
  note, 
  isLast,
  onAddComment,
  onLike
}: { 
  note: TimelineNote
  isLast: boolean
  onAddComment?: (noteId: string, content: string, parentId?: string) => void
  onLike?: (noteId: string, commentId?: string) => void
}) {
  const [showComments, setShowComments] = useState(true)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentContent, setCommentContent] = useState("")

  const config = judgmentConfig[note.judgmentType]

  const handleAddComment = () => {
    if (commentContent.trim() && onAddComment) {
      onAddComment(note.id, commentContent)
      setCommentContent("")
      setShowCommentInput(false)
    }
  }

  return (
    <div className="relative flex gap-4 pb-8">
      {/* 时间轴线 */}
      <div className="relative flex flex-col items-center">
        {/* 节点 */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-background shadow-md",
          config.bgColor,
          config.color
        )}>
          {config.icon}
        </div>
        {/* 连接线 */}
        {!isLast && (
          <div className="w-0.5 h-full bg-gradient-to-b from-border to-transparent absolute top-10" />
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-w-0 pt-1">
        <Card className={cn("border-l-4", config.borderColor)}>
          <CardContent className="pt-4">
            {/* 头部 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-pink-400 text-white">
                    {note.author.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{note.author}</span>
                    <Badge variant="outline" className={cn(config.color, "border-current")}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>{note.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 价格目标 */}
            {note.priceTarget && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">目标价格</span>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ${note.priceTarget.toFixed(2)}
                    </div>
                  </div>
                  {note.currentPrice && (
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">当前价格</span>
                      <div className="text-xl font-semibold">
                        ${note.currentPrice.toFixed(2)}
                      </div>
                      <div className={cn(
                        "text-sm font-medium",
                        note.priceTarget > note.currentPrice ? "text-green-600" : "text-red-600"
                      )}>
                        {note.priceTarget > note.currentPrice ? "+" : ""}
                        {(((note.priceTarget - note.currentPrice) / note.currentPrice) * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 笔记内容 */}
            <div className="prose prose-sm max-w-none mb-4">
              <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 pt-3 border-t">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onLike?.(note.id)}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                {note.likes > 0 && note.likes}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCommentInput(!showCommentInput)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                评论
              </Button>
              {note.comments.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                >
                  {showComments ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  {note.comments.length} 条讨论
                </Button>
              )}
            </div>

            {/* 评论输入 */}
            {showCommentInput && (
              <div className="mt-4 flex gap-2">
                <Textarea
                  placeholder="发表你的观点..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button onClick={handleAddComment}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* 评论列表 */}
            {showComments && note.comments.length > 0 && (
              <div className="mt-4 space-y-3 pt-4 border-t">
                {note.comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    noteId={note.id}
                    onReply={onAddComment}
                    onLike={onLike}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 主组件
export default function TimelineNotes({ 
  notes, 
  onAddNote,
  onAddComment,
  onLike
}: TimelineNotesProps) {
  return (
    <div className="space-y-0">
      {notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>还没有任何笔记</p>
          <p className="text-sm mt-1">点击"添加笔记"开始记录你的投资思路</p>
        </div>
      ) : (
        notes.map((note, index) => (
          <TimelineNoteItem
            key={note.id}
            note={note}
            isLast={index === notes.length - 1}
            onAddComment={onAddComment}
            onLike={onLike}
          />
        ))
      )}
    </div>
  )
}
