'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { ChevronDown } from 'lucide-react';

interface Quote {
  text: string;
  author: string;
}

interface Topic {
  title: string;
  content: string;
}

const quotes: Quote[] = [
  { text: "在别人贪婪时恐惧，在别人恐惧时贪婪。", author: "沃伦·巴菲特" },
  { text: "股票市场短期是投票机，长期是称重机。", author: "本杰明·格雷厄姆" },
  { text: "时间是优秀企业的朋友，平庸企业的敌人。", author: "沃伦·巴菲特" },
  { text: "投资成功的关键不在于你知道多少，而在于你能诚实地承认你不知道多少。", author: "霍华德·马克斯" },
  { text: "市场可能在很长时间内保持非理性，超过你保持偿付能力的时间。", author: "约翰·梅纳德·凯恩斯" }
];

const topics: Topic[] = [
  {
    title: "认识市场周期",
    content: "市场总是在牛熊之间循环。熊市是播种的季节，牛市是收获的季节。理解你当前所处的周期，是做出正确决策的第一步。每个周期都有其特点和机会，关键是要保持冷静的头脑和长远的视角。"
  },
  {
    title: "避免情绪化交易",
    content: "最大的敌人不是市场，而是你自己的情绪。制定严格的计划，并像机器人一样执行它，可以帮助你克服恐惧和贪婪。情绪化的决策往往导致在高点买入、低点卖出的错误行为。"
  },
  {
    title: "价值投资的力量",
    content: "优秀的公司即使在熊市中也只是价格被打折，其内在价值并未改变。关注价值，而非价格，是穿越熊市的关键。真正的投资者应该把股价下跌看作是购买优质资产的机会。"
  },
  {
    title: "风险管理至关重要",
    content: "永远不要把所有鸡蛋放在一个篮子里。分散投资、设置止损、控制仓位是保护资本的基本原则。记住，保住本金比赚取利润更重要，因为只有保住本金，你才有继续参与市场的机会。"
  },
  {
    title: "学会与波动共舞",
    content: "市场波动是常态，而非异常。学会接受波动，甚至利用波动，是成熟投资者的标志。短期的波动往往创造长期的机会，关键是要有足够的耐心和坚定的信念。"
  }
];

export default function MindsetPage() {
  const [dailyQuote, setDailyQuote] = useState<Quote>(quotes[0]);
  const [activeAccordion, setActiveAccordion] = useState<number>(0);

  useEffect(() => {
    // 根据日期选择每日格言
    const today = new Date().getDate();
    const quoteIndex = today % quotes.length;
    setDailyQuote(quotes[quoteIndex]);
  }, []);

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? -1 : index);
  };

  return (
    <AppLayout title="心态建设">
      <div className="space-y-6">
        {/* 每日投资智慧 */}
        <div className="card text-center py-8">
          <h3 className="text-lg font-semibold text-text-primary mb-6">今日投资智慧</h3>
          <blockquote className="text-xl italic text-text-primary mb-4 leading-relaxed">
            "{dailyQuote.text}"
          </blockquote>
          <footer className="text-text-secondary">
            — {dailyQuote.author}
          </footer>
        </div>

        {/* 熊市生存法则 */}
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-6">投资心态修炼</h3>
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <div 
                key={index}
                className="bg-bg-primary rounded-lg border border-border-primary overflow-hidden"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="
                    w-full p-4 text-left flex justify-between items-center
                    hover:bg-bg-hover transition-colors duration-200
                  "
                >
                  <span className="font-medium text-text-primary">{topic.title}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-text-secondary transition-transform duration-200 ${
                      activeAccordion === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div 
                  className={`
                    overflow-hidden transition-all duration-300 ease-out
                    ${activeAccordion === index ? 'max-h-96 pb-4' : 'max-h-0'}
                  `}
                >
                  <div className="px-4">
                    <p className="text-text-secondary leading-relaxed">
                      {topic.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
