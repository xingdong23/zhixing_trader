// 【知行交易】预设交易剧本
// 这些剧本代表了经过验证的交易模式，帮助用户快速建立系统化交易框架

import { TradingPlaybook, TradingEmotion, InformationSource } from '@/types';

export const defaultPlaybooks: Omit<TradingPlaybook, 'id' | 'createdAt' | 'updatedAt' | 'performance'>[] = [
  {
    name: '回踩多头排列',
    description: '股价在多头排列的均线系统中出现短期回调，触及关键支撑位后重新向上的经典买入机会',
    template: {
      buyingLogicTemplate: {
        technical: '1. 股价处于多头排列状态（5日>10日>20日>60日均线）\n2. 股价回踩至关键均线获得支撑\n3. 成交量在回踩过程中萎缩，反弹时放量\n4. MACD在零轴上方或即将金叉\n5. RSI在30-50区间，未进入超卖',
        fundamental: '1. 公司基本面良好，无重大负面消息\n2. 行业景气度较高或处于上升周期\n3. 财务指标健康，现金流稳定\n4. 市盈率处于合理区间',
        news: '1. 无重大利空消息\n2. 市场整体情绪稳定或偏乐观\n3. 相关政策环境友好\n4. 行业内无系统性风险'
      },
      riskManagementTemplate: {
        stopLossRatio: 0.08,  // 8%止损
        takeProfitRatio: 0.20 // 20%止盈，风险收益比1:2.5
      },
      recommendedEmotion: TradingEmotion.CONFIDENT,
      recommendedSource: InformationSource.SELF_ANALYSIS
    },
    tags: ['技术分析', '趋势跟踪', '均线系统', '中短线'],
    isSystemDefault: true
  },
  
  {
    name: '回踩均线',
    description: '股价在上升趋势中回踩重要均线（如20日、60日线）获得支撑后的买入机会',
    template: {
      buyingLogicTemplate: {
        technical: '1. 股价处于明确的上升趋势中\n2. 回踩至20日或60日均线附近\n3. 均线保持向上倾斜，提供有效支撑\n4. 回踩过程中成交量萎缩\n5. 出现反弹信号（如锤头线、十字星等）',
        fundamental: '1. 公司业绩稳定增长\n2. 行业地位稳固\n3. 无重大经营风险\n4. 估值合理',
        news: '1. 无重大利空\n2. 市场情绪正常\n3. 宏观环境稳定'
      },
      riskManagementTemplate: {
        stopLossRatio: 0.06,  // 6%止损
        takeProfitRatio: 0.15 // 15%止盈，风险收益比1:2.5
      },
      recommendedEmotion: TradingEmotion.CALM,
      recommendedSource: InformationSource.SELF_ANALYSIS
    },
    tags: ['均线支撑', '趋势延续', '技术分析', '中线'],
    isSystemDefault: true
  },
  
  {
    name: '突破平台整理',
    description: '股价经过一段时间的横盘整理后，向上突破平台阻力位的买入机会',
    template: {
      buyingLogicTemplate: {
        technical: '1. 股价经过至少3周的横盘整理\n2. 整理期间成交量逐步萎缩\n3. 突破时成交量明显放大（至少是前期平均量的2倍）\n4. 突破后股价站稳平台上沿\n5. 技术指标配合（如MACD金叉、RSI突破50）',
        fundamental: '1. 整理期间基本面保持稳定或改善\n2. 无重大利空因素\n3. 行业景气度良好',
        news: '1. 可能有催化剂事件（如业绩预告、政策利好等）\n2. 市场情绪积极\n3. 资金面宽松'
      },
      riskManagementTemplate: {
        stopLossRatio: 0.10,  // 10%止损
        takeProfitRatio: 0.25 // 25%止盈，风险收益比1:2.5
      },
      recommendedEmotion: TradingEmotion.CONFIDENT,
      recommendedSource: InformationSource.SELF_ANALYSIS
    },
    tags: ['突破', '平台整理', '放量', '中长线'],
    isSystemDefault: true
  },
  
  {
    name: '底部放量突破',
    description: '股价在底部区域经过充分调整后，出现放量突破的买入机会',
    template: {
      buyingLogicTemplate: {
        technical: '1. 股价处于相对底部区域（较前期高点下跌30%以上）\n2. 经过充分的时间和空间调整\n3. 出现明显的放量突破信号\n4. 技术指标从超卖区域回升\n5. 可能伴随底部形态（如双底、头肩底等）',
        fundamental: '1. 公司基本面出现改善迹象\n2. 估值已经充分反映悲观预期\n3. 行业可能出现拐点\n4. 管理层积极作为',
        news: '1. 可能有重大利好消息\n2. 政策环境改善\n3. 市场情绪开始修复'
      },
      riskManagementTemplate: {
        stopLossRatio: 0.12,  // 12%止损
        takeProfitRatio: 0.30 // 30%止盈，风险收益比1:2.5
      },
      recommendedEmotion: TradingEmotion.CONFIDENT,
      recommendedSource: InformationSource.SELF_ANALYSIS
    },
    tags: ['底部', '反转', '放量突破', '长线'],
    isSystemDefault: true
  },
  
  {
    name: '强势股回调',
    description: '近期表现强势的股票出现短期回调，提供较好的上车机会',
    template: {
      buyingLogicTemplate: {
        technical: '1. 股价近期涨幅较大（1个月内涨幅超过20%）\n2. 出现短期回调，但未破坏上升趋势\n3. 回调幅度适中（5-15%）\n4. 成交量在回调中萎缩\n5. 技术指标仍保持强势',
        fundamental: '1. 公司基本面优秀\n2. 业绩增长确定性高\n3. 行业景气度高\n4. 机构关注度高',
        news: '1. 可能有持续的利好催化剂\n2. 市场认知度提升\n3. 资金追捧'
      },
      riskManagementTemplate: {
        stopLossRatio: 0.10,  // 10%止损
        takeProfitRatio: 0.20 // 20%止盈，风险收益比1:2
      },
      recommendedEmotion: TradingEmotion.CONFIDENT,
      recommendedSource: InformationSource.SELF_ANALYSIS
    },
    tags: ['强势股', '回调买入', '短线', '追涨'],
    isSystemDefault: true
  },
  
  {
    name: '题材概念启动',
    description: '基于题材概念的投资机会，适合短期操作',
    template: {
      buyingLogicTemplate: {
        technical: '1. 股价启动初期，技术形态良好\n2. 成交量明显放大\n3. 相对强度指标表现突出\n4. 短期均线开始向上发散',
        fundamental: '1. 公司业务与热点题材高度相关\n2. 受益程度较大\n3. 基本面支撑题材逻辑',
        news: '1. 题材概念刚刚启动\n2. 政策支持力度大\n3. 市场关注度快速提升\n4. 资金开始涌入'
      },
      riskManagementTemplate: {
        stopLossRatio: 0.15,  // 15%止损（题材股波动大）
        takeProfitRatio: 0.30 // 30%止盈，风险收益比1:2
      },
      recommendedEmotion: TradingEmotion.CONFIDENT,
      recommendedSource: InformationSource.NEWS_MEDIA
    },
    tags: ['题材', '概念', '短线', '热点'],
    isSystemDefault: true
  }
];

// 生成完整的剧本数据（包含ID和时间戳）
export function generateDefaultPlaybooks(): TradingPlaybook[] {
  return defaultPlaybooks.map((playbook, index) => ({
    ...playbook,
    id: `default_playbook_${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    performance: {
      totalTrades: 0,
      winRate: 0,
      avgPnLPercent: 0,
      avgRiskRewardRatio: 0,
      totalPnL: 0
    }
  }));
}
