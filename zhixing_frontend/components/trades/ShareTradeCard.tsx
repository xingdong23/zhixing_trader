"use client";

import React, { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import type { Trade } from "@/app/trades/types";

interface ShareTradeCardProps {
    trade: Trade;
    onClose: () => void;
}

const MOOD_EMOJIS: Record<string, string> = {
    'FOMO': '🤯',
    'Greedy': '🤑',
    'Fearful': '😱',
    'Disciplined': '🧘',
    'Confident': '💪',
    'Revenge': '😡',
    'Bored': '🥱',
};

const MOOD_LABELS: Record<string, string> = {
    'FOMO': '上头',
    'Greedy': '贪婪',
    'Fearful': '恐惧',
    'Disciplined': '按计划',
    'Confident': '自信',
    'Revenge': '报复',
    'Bored': '无聊',
};

export default function ShareTradeCard({ trade, onClose }: ShareTradeCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!cardRef.current) return;

        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 2, // Higher resolution
                backgroundColor: "#1a1b1e", // Dark background for premium look
            });

            const link = document.createElement("a");
            link.download = `zhixing-trade-${trade.symbol}-${Date.now()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (err) {
            console.error("Failed to generate image", err);
        }
    };

    const pnl = trade.realizedPnl || trade.unrealizedPnl || 0;
    const pnlPct = trade.realizedPnlPct || trade.unrealizedPnlPct || 0;
    const isProfit = pnl >= 0;
    const pnlColor = isProfit ? "text-[#00C805]" : "text-[#FF3B30]"; // Bright Green / Red
    const bgColor = isProfit ? "bg-[#00C805]/10" : "bg-[#FF3B30]/10";

    return (
        <div className="flex flex-col items-center gap-4">
            {/* The Card to be Captured */}
            <div
                ref={cardRef}
                className="w-[375px] bg-[#1a1b1e] text-white p-6 rounded-xl shadow-2xl relative overflow-hidden font-sans"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {/* Background Gradient Effect */}
                <div className={`absolute top-0 right-0 w-64 h-64 ${isProfit ? 'bg-green-500' : 'bg-red-500'} opacity-10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none`} />

                {/* Header */}
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">
                            知行
                        </div>
                        <span className="font-semibold tracking-wide text-gray-300">Zhixing Trader</span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date().toLocaleDateString()}</span>
                </div>

                {/* Main Content */}
                <div className="space-y-6 relative z-10">
                    {/* Symbol & Direction */}
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tighter">{trade.symbol}</h1>
                            <p className="text-sm text-gray-400 mt-1">{trade.planType === 'long' ? '做多 (Long)' : '做空 (Short)'}</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-3xl font-bold ${pnlColor}`}>
                                {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                            </div>
                            <div className={`text-sm ${pnlColor} opacity-80`}>
                                {pnl > 0 ? '+' : ''}${pnl.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Chart / Image Area */}
                    <div className="aspect-video bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50 flex items-center justify-center relative">
                        {trade.imageUrl ? (
                            <img src={trade.imageUrl} alt="Trade Chart" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-600 flex flex-col items-center">
                                <Share2 className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs">No screenshot available</span>
                            </div>
                        )}

                        {/* Watermark/Overlay */}
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-gray-300">
                            Generated by Zhixing Trader
                        </div>
                    </div>

                    {/* Psychology & Notes */}
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{MOOD_EMOJIS[trade.mood || ''] || '🤔'}</span>
                            <span className="font-medium text-gray-200">
                                {MOOD_LABELS[trade.mood || ''] || trade.mood || '未记录心态'}
                            </span>
                        </div>
                        {trade.planStrategy && (
                            <Badge variant="outline" className="mb-2 border-gray-600 text-gray-400 text-xs">
                                {trade.planStrategy}
                            </Badge>
                        )}
                        <p className="text-sm text-gray-400 italic line-clamp-3">
                            "{trade.entryNotes || trade.planNotes || '交易就是修心，知行合一。'}"
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center relative z-10">
                    <div className="text-xs text-gray-500">
                        <p>复盘 · 记录 · 成长</p>
                    </div>
                    <div className="w-12 h-12 bg-white p-1 rounded-sm">
                        {/* Placeholder for QR Code */}
                        <div className="w-full h-full bg-black flex items-center justify-center text-[6px] text-white text-center leading-tight">
                            SCAN<br />ME
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <Button variant="outline" onClick={onClose}>关闭</Button>
                <Button onClick={handleDownload} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0">
                    <Download className="w-4 h-4 mr-2" />
                    保存图片
                </Button>
            </div>
        </div>
    );
}
