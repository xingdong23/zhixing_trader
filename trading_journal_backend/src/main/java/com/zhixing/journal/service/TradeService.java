package com.zhixing.journal.service;

import com.zhixing.journal.model.Account;
import com.zhixing.journal.model.Trade;
import com.zhixing.journal.repository.AccountRepository;
import com.zhixing.journal.repository.TradeRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TradeService {

    private final TradeRepository tradeRepository;
    private final AccountRepository accountRepository;

    public TradeService(TradeRepository tradeRepository, AccountRepository accountRepository) {
        this.tradeRepository = tradeRepository;
        this.accountRepository = accountRepository;
    }

    /**
     * 创建交易计划 (Wizard 模式)
     * 该方法处理“6步交易向导”提交的数据，关联账户，并计算初始的计划风险/回报比。
     */
    public Trade createTradePlan(Trade trade, Long accountId) {
        // 1. 关联账户
        // 如果未指定 accountId，为了 MVP 方便，尝试查找默认账户
        Account account;
        if (accountId != null) {
            account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new IllegalArgumentException("账户未找到 (Account not found)"));
        } else {
             // MVP 回退策略：使用第一个可用账户
             account = accountRepository.findAll().stream().findFirst()
                     .orElseThrow(() -> new IllegalStateException("无可用账户，请先创建账户。"));
        }
        trade.setAccount(account);
        
        // 2. 设置初始状态
        // 如果前端未传状态，默认为规划中 (PLANNING)
        if (trade.getStatus() == null) {
            trade.setStatus(Trade.TradeStatus.PLANNING);
        }
        
        // 3. 计算计划指标 (Planned Metrics)
        calculatePlannedMetrics(trade);

        return tradeRepository.save(trade);
    }
    
    /**
     * 更新交易记录 (支持全字段更新)
     * 用于修改计划阶段的参数，或补充复盘笔记。
     */
    public Trade updateTrade(Long id, Trade updates) {
        var existing = getTrade(id);
        
        // 基础字段更新
        if (updates.getSymbol() != null) existing.setSymbol(updates.getSymbol());
        if (updates.getDirection() != null) existing.setDirection(updates.getDirection());
        if (updates.getEntryPrice() != null) existing.setEntryPrice(updates.getEntryPrice());
        if (updates.getExitPrice() != null) existing.setExitPrice(updates.getExitPrice());
        if (updates.getQuantity() != null) existing.setQuantity(updates.getQuantity());
        if (updates.getStopLoss() != null) existing.setStopLoss(updates.getStopLoss());
        if (updates.getTakeProfit() != null) existing.setTakeProfit(updates.getTakeProfit());
        if (updates.getNotes() != null) existing.setNotes(updates.getNotes());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        
        // 6步向导特有字段 (JSON/Text)
        if (updates.getTrendAnalysis() != null) existing.setTrendAnalysis(updates.getTrendAnalysis());
        if (updates.getKeyLevels() != null) existing.setKeyLevels(updates.getKeyLevels());
        if (updates.getEntryTrigger() != null) existing.setEntryTrigger(updates.getEntryTrigger());
        if (updates.getTechnicalConditions() != null) existing.setTechnicalConditions(updates.getTechnicalConditions());
        if (updates.getEntryReason() != null) existing.setEntryReason(updates.getEntryReason());
        if (updates.getExitReason() != null) existing.setExitReason(updates.getExitReason());
        if (updates.getViolations() != null) existing.setViolations(updates.getViolations());
        if (updates.getReviewRating() != null) existing.setReviewRating(updates.getReviewRating());
        
        // 重新计算相关指标 (预防价格变动导致指标过时)
        calculatePlannedMetrics(existing);
        calculateRealizedMetrics(existing);

        return tradeRepository.save(existing);
    }
    
    /**
     * 执行交易 (Entry)
     * 将状态流转为 ACTIVE，并记录真实的入场价格和时间。
     */
    public Trade executeTrade(Long id, BigDecimal realEntryPrice, LocalDateTime entryTime) {
        var trade = getTrade(id);
        trade.setStatus(Trade.TradeStatus.ACTIVE);
        trade.setEntryPrice(realEntryPrice);
        trade.setEntryTime(entryTime != null ? entryTime : LocalDateTime.now());
        return tradeRepository.save(trade);
    }
    
    /**
     * 平仓交易 (Close)
     * 将状态流转为 CLOSED，记录出场信息，并计算最终盈亏 (PnL) 和 R倍数。
     */
    public Trade closeTrade(Long id, BigDecimal exitPrice, LocalDateTime exitTime) {
        var trade = getTrade(id);
        trade.setStatus(Trade.TradeStatus.CLOSED);
        trade.setExitPrice(exitPrice);
        trade.setExitTime(exitTime != null ? exitTime : LocalDateTime.now());
        
        calculateRealizedMetrics(trade);
        
        return tradeRepository.save(trade);
    }
    
    public void deleteTrade(Long id) {
        tradeRepository.deleteById(id);
    }

    public Trade getTrade(Long id) {
        return tradeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("交易不存在 (Trade not found)"));
    }
    
    /**
     * 高级搜索 (使用 Specification)
     * 支持按 代码、状态、时间范围 分页查询。
     */
    public Page<Trade> searchTrades(String symbol, String status, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<Trade> spec = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (symbol != null && !symbol.isEmpty()) {
                predicates.add(cb.like(cb.upper(root.get("symbol")), "%" + symbol.toUpperCase() + "%"));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), Trade.TradeStatus.valueOf(status.toUpperCase())));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("entryTime"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("entryTime"), endDate));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return tradeRepository.findAll(spec, pageable);
    }
    
    /**
     * 计算计划指标
     * 包括：计划盈亏比 (Planned RR), 风险金额 (Risk Amount)
     */
    private void calculatePlannedMetrics(Trade trade) {
        if (trade.getEntryPrice() != null && trade.getStopLoss() != null && trade.getTakeProfit() != null) {
            BigDecimal risk = trade.getEntryPrice().subtract(trade.getStopLoss()).abs();
            BigDecimal reward = trade.getTakeProfit().subtract(trade.getEntryPrice()).abs();
            if (risk.compareTo(BigDecimal.ZERO) > 0) {
                // 保留2位小数，四舍五入
                trade.setPlannedRR(reward.divide(risk, 2, RoundingMode.HALF_UP));
            }
            
            // 计算风险金额 ($)
            if (trade.getQuantity() != null) {
                trade.setRiskAmount(risk.multiply(trade.getQuantity()));
            }
        }
    }
    
    /**
     * 计算实际落地指标
     * 包括：PnL (盈亏), R-Multiple (R倍数)
     */
    private void calculateRealizedMetrics(Trade trade) {
        if (trade.getExitPrice() != null && trade.getEntryPrice() != null && trade.getQuantity() != null) {
            BigDecimal entryVal = trade.getEntryPrice().multiply(trade.getQuantity());
            BigDecimal exitVal = trade.getExitPrice().multiply(trade.getQuantity());
            
            BigDecimal pnl;
            if (trade.getDirection() == Trade.Direction.LONG) {
                pnl = exitVal.subtract(entryVal);
            } else {
                pnl = entryVal.subtract(exitVal);
            }
            trade.setPnl(pnl);
            
            // 计算 R-Multiple (实现的盈亏比 risk unit)
            // 公式: 实际获利 / 单笔风险
            if (trade.getStopLoss() != null) {
                BigDecimal riskPerShare = trade.getEntryPrice().subtract(trade.getStopLoss()).abs();
                if (riskPerShare.compareTo(BigDecimal.ZERO) > 0) {
                    // 做多: (Exit - Entry) / (Entry - Stop)
                    // 做空: (Entry - Exit) / (Stop - Entry)
                    // 注意风险 (Stop - Entry) 在做空时是正数距离
                    BigDecimal realizedMove;
                     if (trade.getDirection() == Trade.Direction.LONG) {
                         realizedMove = trade.getExitPrice().subtract(trade.getEntryPrice());
                     } else {
                         realizedMove = trade.getEntryPrice().subtract(trade.getExitPrice());
                     }
                    // R倍数
                    BigDecimal r = realizedMove.divide(riskPerShare, 2, RoundingMode.HALF_UP);
                    trade.setRMultiple(r);
                }
            }
        }
    }
}
