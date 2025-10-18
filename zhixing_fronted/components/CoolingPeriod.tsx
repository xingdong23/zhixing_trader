"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, Brain } from "lucide-react";
import { EmotionScore } from "@/lib/emotionDetection";

interface CoolingPeriodProps {
  emotionScore: EmotionScore;
  onComplete: () => void;
  onCancel: () => void;
}

// 情绪自检问题
const SELF_CHECK_QUESTIONS = [
  {
    id: 1,
    question: "我制定了详细的交易计划吗？",
    goodAnswer: "是",
    explanation: "没有计划的交易是赌博"
  },
  {
    id: 2,
    question: "我的止损点在哪里？",
    goodAnswer: "明确知道",
    explanation: "不设止损就是裸奔"
  },
  {
    id: 3,
    question: "这笔交易的风险收益比合理吗？",
    goodAnswer: "是，至少1:2",
    explanation: "风险收益比<1:2不建议交易"
  },
  {
    id: 4,
    question: "我现在的决策是基于分析还是情绪？",
    goodAnswer: "基于分析",
    explanation: "情绪化决策往往导致亏损"
  },
  {
    id: 5,
    question: "如果亏损了，我能接受吗？",
    goodAnswer: "能接受",
    explanation: "只用亏得起的钱交易"
  },
];

export default function CoolingPeriod({
  emotionScore,
  onComplete,
  onCancel,
}: CoolingPeriodProps) {
  const [countdown, setCountdown] = useState(10);
  const [canProceed, setCanProceed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: boolean }>({});

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanProceed(true);
    }
  }, [countdown]);

  const progress = ((10 - countdown) / 10) * 100;

  const handleAnswer = (questionId: number, isGoodAnswer: boolean) => {
    setAnswers({ ...answers, [questionId]: isGoodAnswer });
    
    // 自动进入下一题
    if (currentQuestion < SELF_CHECK_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 500);
    }
  };

  const allQuestionsAnswered = Object.keys(answers).length === SELF_CHECK_QUESTIONS.length;
  const goodAnswersCount = Object.values(answers).filter(Boolean).length;
  const passRate = (goodAnswersCount / SELF_CHECK_QUESTIONS.length) * 100;

  const canCompleteCheck = allQuestionsAnswered && passRate >= 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl p-6 space-y-6">
        {/* 标题 */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-orange-500" />
            <h2 className="text-2xl font-bold">强制冷静期</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            检测到情绪化交易风险，请冷静思考后再决策
          </p>
        </div>

        {/* 情绪评分 */}
        <Alert variant={emotionScore.level === 'danger' ? 'destructive' : 'default'}>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="font-bold mb-2">
              情绪化交易评分：{emotionScore.total}/100
            </div>
            <div className="space-y-1 text-sm">
              {emotionScore.warnings.slice(0, 3).map((warning, index) => (
                <div key={index}>• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        {/* 倒计时 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              强制等待时间
            </span>
            <span className={`text-2xl font-bold ${countdown > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {countdown}秒
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {countdown > 0 
              ? '请利用这段时间冷静思考...' 
              : '✅ 等待时间结束，请完成情绪自检'}
          </p>
        </div>

        {/* 情绪自检 */}
        {canProceed && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                情绪自检问卷（{Object.keys(answers).length}/{SELF_CHECK_QUESTIONS.length}）
              </h3>
              
              {/* 当前问题 */}
              {!allQuestionsAnswered && (
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-lg font-medium mb-4">
                    {currentQuestion + 1}. {SELF_CHECK_QUESTIONS[currentQuestion].question}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAnswer(SELF_CHECK_QUESTIONS[currentQuestion].id, true)}
                    >
                      {SELF_CHECK_QUESTIONS[currentQuestion].goodAnswer}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAnswer(SELF_CHECK_QUESTIONS[currentQuestion].id, false)}
                    >
                      不确定/否
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    💡 {SELF_CHECK_QUESTIONS[currentQuestion].explanation}
                  </p>
                </Card>
              )}

              {/* 已回答的问题 */}
              {Object.keys(answers).length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-gray-600">已完成的问题：</div>
                  {SELF_CHECK_QUESTIONS.filter(q => answers[q.id] !== undefined).map((q) => (
                    <div
                      key={q.id}
                      className={`text-sm p-2 rounded ${
                        answers[q.id] 
                          ? 'bg-green-50 text-green-800 dark:bg-green-900/20' 
                          : 'bg-red-50 text-red-800 dark:bg-red-900/20'
                      }`}
                    >
                      {answers[q.id] ? '✅' : '❌'} {q.question}
                    </div>
                  ))}
                </div>
              )}

              {/* 评估结果 */}
              {allQuestionsAnswered && (
                <Alert className={canCompleteCheck ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  <AlertDescription>
                    <div className="font-bold mb-2">
                      {canCompleteCheck 
                        ? '✅ 情绪自检通过' 
                        : '❌ 情绪自检未通过'}
                    </div>
                    <div className="text-sm">
                      正确回答：{goodAnswersCount}/{SELF_CHECK_QUESTIONS.length} ({passRate.toFixed(0)}%)
                    </div>
                    {!canCompleteCheck && (
                      <div className="mt-2 text-sm">
                        <p className="font-medium">建议：</p>
                        <p>• 正确率低于60%，建议暂停交易</p>
                        <p>• 重新审视交易计划和风险</p>
                        <p>• 等情绪稳定后再交易</p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            取消交易
          </Button>
          <Button
            className="flex-1"
            disabled={!canProceed || !allQuestionsAnswered || !canCompleteCheck}
            onClick={onComplete}
          >
            {!canProceed 
              ? `等待 ${countdown}秒` 
              : !allQuestionsAnswered 
              ? '请完成情绪自检'
              : !canCompleteCheck
              ? '自检未通过'
              : '继续交易'}
          </Button>
        </div>

        {/* 说明 */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>💡 冷静期是为了保护你的资金安全</p>
          <p>📊 情绪化交易的平均亏损率高达70%</p>
          <p>🎯 理性决策才能长期盈利</p>
        </div>
      </Card>
    </div>
  );
}




