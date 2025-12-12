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

    public Trade createTradePlan(Trade trade, Long accountId) {
        // Link to account
        // If accountId is null, try to find default account
        Account account;
        if (accountId != null) {
            account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        } else {
             // Fallback to first found account for MVP
             account = accountRepository.findAll().stream().findFirst()
                     .orElseThrow(() -> new IllegalStateException("No accounts available. Create an account first."));
        }
        trade.setAccount(account);
        
        // Initial status
        if (trade.getStatus() == null) {
            trade.setStatus(Trade.TradeStatus.PLANNING);
        }
        
        // Calculate Planned R/R if prices are set
        calculatePlannedMetrics(trade);

        return tradeRepository.save(trade);
    }
    
    public Trade updateTrade(Long id, Trade updates) {
        Trade existing = getTrade(id);
        
        // Copy fields
        if (updates.getSymbol() != null) existing.setSymbol(updates.getSymbol());
        if (updates.getDirection() != null) existing.setDirection(updates.getDirection());
        if (updates.getEntryPrice() != null) existing.setEntryPrice(updates.getEntryPrice());
        if (updates.getExitPrice() != null) existing.setExitPrice(updates.getExitPrice());
        if (updates.getQuantity() != null) existing.setQuantity(updates.getQuantity());
        if (updates.getStopLoss() != null) existing.setStopLoss(updates.getStopLoss());
        if (updates.getTakeProfit() != null) existing.setTakeProfit(updates.getTakeProfit());
        if (updates.getNotes() != null) existing.setNotes(updates.getNotes());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
        
        // 6-step fields
        if (updates.getTrendAnalysis() != null) existing.setTrendAnalysis(updates.getTrendAnalysis());
        if (updates.getKeyLevels() != null) existing.setKeyLevels(updates.getKeyLevels());
        if (updates.getEntryTrigger() != null) existing.setEntryTrigger(updates.getEntryTrigger());
        if (updates.getTechnicalConditions() != null) existing.setTechnicalConditions(updates.getTechnicalConditions());
        if (updates.getEntryReason() != null) existing.setEntryReason(updates.getEntryReason());
        if (updates.getExitReason() != null) existing.setExitReason(updates.getExitReason());
        if (updates.getViolations() != null) existing.setViolations(updates.getViolations());
        if (updates.getReviewRating() != null) existing.setReviewRating(updates.getReviewRating());
        
        // Recalculate metrics
        calculatePlannedMetrics(existing);
        calculateRealizedMetrics(existing);

        return tradeRepository.save(existing);
    }
    
    public Trade executeTrade(Long id, BigDecimal realEntryPrice, LocalDateTime entryTime) {
        Trade trade = getTrade(id);
        trade.setStatus(Trade.TradeStatus.ACTIVE);
        trade.setEntryPrice(realEntryPrice);
        trade.setEntryTime(entryTime != null ? entryTime : LocalDateTime.now());
        return tradeRepository.save(trade);
    }
    
    public Trade closeTrade(Long id, BigDecimal exitPrice, LocalDateTime exitTime) {
        Trade trade = getTrade(id);
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
                .orElseThrow(() -> new RuntimeException("Trade not found"));
    }
    
    public Page<Trade> searchTrades(String symbol, String status, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        Specification<Trade> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
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
    
    private void calculatePlannedMetrics(Trade trade) {
        if (trade.getEntryPrice() != null && trade.getStopLoss() != null && trade.getTakeProfit() != null) {
            BigDecimal risk = trade.getEntryPrice().subtract(trade.getStopLoss()).abs();
            BigDecimal reward = trade.getTakeProfit().subtract(trade.getEntryPrice()).abs();
            if (risk.compareTo(BigDecimal.ZERO) > 0) {
                trade.setPlannedRR(reward.divide(risk, 2, RoundingMode.HALF_UP));
            }
            
            // Calculate Risk Amount ($)
            if (trade.getQuantity() != null) {
                trade.setRiskAmount(risk.multiply(trade.getQuantity()));
            }
        }
    }
    
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
            
            // Calculate R-Multiple
            if (trade.getStopLoss() != null) {
                BigDecimal riskPerShare = trade.getEntryPrice().subtract(trade.getStopLoss()).abs();
                if (riskPerShare.compareTo(BigDecimal.ZERO) > 0) {
                    // If direction correct, positive R, else negative R
                    // Simplified: (Exit - Entry) / (Entry - Stop) for Long
                    BigDecimal r;
                     if (trade.getDirection() == Trade.Direction.LONG) {
                         r = (trade.getExitPrice().subtract(trade.getEntryPrice())).divide(riskPerShare, 2, RoundingMode.HALF_UP);
                     } else {
                         // Short: (Entry - Exit) / (Stop - Entry)
                         // Stop is above Entry for Short. Risk is Stop - Entry. Benefit is Entry - Exit.
                         r = (trade.getEntryPrice().subtract(trade.getExitPrice())).divide(riskPerShare, 2, RoundingMode.HALF_UP);
                     }
                    trade.setRMultiple(r);
                }
            }
        }
    }
}
