import Dexie, { Table } from 'dexie';
import type { Trade } from '@/app/trades/types';

export class ZhixingDatabase extends Dexie {
    trades!: Table<Trade, number>;
    settings!: Table<any, string>;

    constructor() {
        super('ZhixingTraderDB');

        // Define tables and indexes
        this.version(1).stores({
            trades: '++id, symbol, status, planType, createdAt, updatedAt',
            settings: 'key' // simple key-value store for settings
        });
    }
}

export const db = new ZhixingDatabase();

// Helper to migrate from LocalStorage (One-time run)
export async function migrateFromLocalStorage() {
    try {
        const hasMigrated = localStorage.getItem('db_migrated');
        if (hasMigrated) return;

        // Migrate Trades
        const rawTrades = localStorage.getItem('tradesData');
        if (rawTrades) {
            const trades = JSON.parse(rawTrades);
            if (Array.isArray(trades) && trades.length > 0) {
                await db.trades.bulkPut(trades);
                console.log(`Migrated ${trades.length} trades to IndexedDB`);
            }
        }

        // Migrate Settings/Alerts
        const rawAlerts = localStorage.getItem('alertConfig');
        if (rawAlerts) {
            await db.settings.put({ key: 'alertConfig', value: JSON.parse(rawAlerts) });
        }

        localStorage.setItem('db_migrated', 'true');
        // Optional: Clear old data to free space, but maybe keep as backup for now
        // localStorage.removeItem('tradesData'); 
    } catch (err) {
        console.error('Migration failed:', err);
    }
}
