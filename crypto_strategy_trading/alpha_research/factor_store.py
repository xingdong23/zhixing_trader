import sqlite3
import json
import hashlib
from datetime import datetime
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class FactorStore:
    """
    Persist and manage discovered Alpha Factors using SQLite.
    """
    def __init__(self, db_path='alpha_research/factors.db'):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database schema."""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Factors table
        c.execute('''
            CREATE TABLE IF NOT EXISTS factors (
                id TEXT PRIMARY KEY,
                formula TEXT NOT NULL,
                ic_score REAL,
                complexity INTEGER,
                discovered_at TIMESTAMP,
                metadata TEXT
            )
        ''')
        
        # Backtest results table (for future use)
        c.execute('''
            CREATE TABLE IF NOT EXISTS strategy_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                strategy_name TEXT,
                sharpe_ratio REAL,
                total_return REAL,
                max_drawdown REAL,
                win_rate REAL,
                tested_at TIMESTAMP,
                config TEXT
            )
        ''')
        
        conn.commit()
        conn.close()

    def _hash_formula(self, formula: str) -> str:
        """Create a unique hash for the formula."""
        return hashlib.md5(formula.encode('utf-8')).hexdigest()

    def save_factor(self, formula: str, ic_score: float, complexity: int, metadata: dict = None):
        """
        Save a new factor to the database.
        Returns True if saved, False if already exists.
        """
        factor_id = self._hash_formula(formula)
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        try:
            c.execute('''
                INSERT INTO factors (id, formula, ic_score, complexity, discovered_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                factor_id,
                formula,
                ic_score,
                complexity,
                datetime.now(),
                json.dumps(metadata or {})
            ))
            conn.commit()
            logger.info(f"Saved factor {factor_id[:8]}: IC={ic_score:.4f}")
            return True
        except sqlite3.IntegrityError:
            # Factor already exists
            # We could update the IC score if it's different, but for now let's keep the first discovery
            logger.debug(f"Factor {factor_id[:8]} already exists.")
            return False
        finally:
            conn.close()

    def get_top_factors(self, limit=10, min_ic=0.05) -> pd.DataFrame:
        """
        Retrieve top performing factors.
        """
        conn = sqlite3.connect(self.db_path)
        query = f'''
            SELECT * FROM factors 
            WHERE abs(ic_score) >= {min_ic}
            ORDER BY abs(ic_score) DESC
            LIMIT {limit}
        '''
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df

    def get_factor_count(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT COUNT(*) FROM factors')
        count = c.fetchone()[0]
        conn.close()
        return count
