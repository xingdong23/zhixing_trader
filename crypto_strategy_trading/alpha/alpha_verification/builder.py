import os
from datetime import datetime
from alpha_research.factor_store import FactorStore
import logging

logger = logging.getLogger(__name__)

class StrategyBuilder:
    """
    Automatically builds a Multi-Factor Strategy from the Factor Store.
    """
    def __init__(self, factor_store: FactorStore):
        self.store = factor_store


    def build_strategy(self, strategy_name: str, top_n=5, min_ic=0.05):
        """
        Select top factors and generate a strategy file.
        """
        # 1. Get Factors
        factors_df = self.store.get_top_factors(limit=top_n, min_ic=min_ic)
        
        if factors_df.empty:
            logger.warning("No factors found in store to build strategy.")
            return None
            
        logger.info(f"Building strategy with {len(factors_df)} factors.")
        
        # 2. Generate Code
        strategy_code = self._generate_code(strategy_name, factors_df)
        
        # 3. Save File
        output_dir = f"strategies/{strategy_name}"
        os.makedirs(output_dir, exist_ok=True)
        
        file_path = f"{output_dir}/strategy.py"
        with open(file_path, 'w') as f:
            f.write(strategy_code)
            
        # Create config file
        self._create_config(output_dir, strategy_name)
        
        logger.info(f"Strategy generated at: {file_path}")
        return file_path

    def _generate_code(self, strategy_name, factors_df):
        """
        Generate the Python code for the strategy.
        """
        factors_code = ""
        
        # Generate factor calculation logic
        for idx, row in factors_df.iterrows():
            formula = row['formula']
            # We need to convert the gplearn string representation to valid Python code
            # This is the tricky part. gplearn output like 'add(X0, X1)' needs to be mapped to our functions.
            # For this prototype, we will assume the formula string is compatible with our 'functions.py' 
            # if we import them.
            # However, gplearn outputs 'add(X, Y)'. We need to replace function names if they differ.
            # Our functions are named 'ts_mean_24' etc.
            
            # A robust way is to use the same 'functions' module in the strategy.
            # We will inject the formula string directly into a list and use eval() or a parser.
            # For safety and performance in production, we should compile them.
            # Here we will use a simplified approach: Just list them as strings and use a dynamic evaluator
            # or generated code that calls a parser.
            
            # Let's try to generate direct code.
            # We'll put the formulas in a list and the strategy will iterate them.
            factors_code += f"        '{formula}', # IC: {row['ic_score']:.4f}\n"

        code = f"""
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
import logging
from datetime import datetime
from alpha_research.functions import make_ts_functions

logger = logging.getLogger(__name__)

class {self._to_class_name(strategy_name)}:
    \"\"\"
    Auto-Generated Multi-Factor Strategy
    Generated at: {datetime.now()}
    \"\"\"
    
    def __init__(self, parameters: Dict[str, Any]):
        self.name = "{strategy_name}"
        self.parameters = parameters
        
        self.capital = float(parameters.get('total_capital', 1000.0))
        self.position_size = float(parameters.get('position_size', 0.9))
        self.leverage = float(parameters.get('leverage', 1.0))
        
        self.entry_threshold = float(parameters.get('entry_threshold', 1.0)) 
        self.exit_threshold = float(parameters.get('exit_threshold', 0.0))
        
        self.current_position = None
        
        # Define Factors
        self.factor_formulas = [
{factors_code}
        ]
        
        # Initialize function set for evaluation
        self.functions = {{f.name: f.function for f in make_ts_functions(windows=[6, 12, 24, 48, 168])}}
        # Add numpy functions
        self.functions.update({{
            'add': np.add, 'sub': np.subtract, 'mul': np.multiply, 'div': np.divide,
            'abs': np.abs, 'neg': np.negative, 'log': np.log, 'sqrt': np.sqrt,
            'sin': np.sin, 'cos': np.cos, 'tan': np.tan, 'inv': lambda x: 1/x
        }})
        
        logger.info(f"✓ {{self.name}} Initialized with {{len(self.factor_formulas)}} factors")
    
    def _eval_formula(self, formula, context):
        \"\"\"
        Safely evaluate a formula string using the context.
        \"\"\"
        # This is a simple eval. In production, use a proper parser.
        # We need to map variable names (open, close, etc.) to the context.
        return eval(formula, {{"__builtins__": {{}}, **self.functions, **context}})

    def calculate_composite_alpha(self, df: pd.DataFrame) -> pd.Series:
        \"\"\"
        Calculate equal-weighted composite alpha.
        \"\"\"
        # Prepare context variables
        context = {{
            'open': df['open'].values,
            'high': df['high'].values,
            'low': df['low'].values,
            'close': df['close'].values,
            'volume': df['volume'].values,
        }}
        
        alpha_sum = np.zeros(len(df))
        
        for formula in self.factor_formulas:
            try:
                # Evaluate factor
                # Note: gplearn formulas might not be directly eval-able if they use custom syntax
                # We assume the formula strings are valid python calls to our functions
                factor_values = self._eval_formula(formula, context)
                
                # Normalize (Rank or Z-Score) before combining
                # Here we use simple Z-Score
                factor_series = pd.Series(factor_values).fillna(0)
                mean = factor_series.rolling(168).mean()
                std = factor_series.rolling(168).std()
                z_score = (factor_series - mean) / (std + 1e-9)
                
                alpha_sum += z_score.fillna(0).values
            except Exception as e:
                logger.error(f"Error evaluating formula {{formula}}: {{e}}")
                
        return pd.Series(alpha_sum / len(self.factor_formulas), index=df.index)

    def analyze(self, klines: List[Dict]) -> Optional[Dict[str, Any]]:
        if len(klines) < 200:
            return None
            
        df = pd.DataFrame(klines)
        
        # Calculate Composite Alpha
        df['alpha'] = self.calculate_composite_alpha(df)
        
        current = df.iloc[-1]
        alpha_val = current['alpha']
        price = current['close']
        timestamp = current.get('timestamp', datetime.now())
        
        if pd.isna(alpha_val):
            return None
            
        # Trading Logic
        if self.current_position:
            side = self.current_position['side']
            if side == 'long' and alpha_val < self.exit_threshold:
                return {{
                    'signal': 'close',
                    'price': price,
                    'timestamp': timestamp,
                    'reason': 'alpha_weakened'
                }}
            elif side == 'short' and alpha_val > -self.exit_threshold:
                return {{
                    'signal': 'close',
                    'price': price,
                    'timestamp': timestamp,
                    'reason': 'alpha_weakened'
                }}
                
        if not self.current_position:
            if alpha_val > self.entry_threshold:
                amount = (self.capital * self.position_size * self.leverage) / price
                return {{
                    'signal': 'buy',
                    'price': price,
                    'amount': amount,
                    'timestamp': timestamp,
                    'reason': f'composite_alpha_buy_{{alpha_val:.2f}}'
                }}
            elif alpha_val < -self.entry_threshold:
                amount = (self.capital * self.position_size * self.leverage) / price
                return {{
                    'signal': 'sell',
                    'price': price,
                    'amount': amount,
                    'timestamp': timestamp,
                    'reason': f'composite_alpha_sell_{{alpha_val:.2f}}'
                }}
                
        return None

    def update_position(self, signal: Dict[str, Any]):
        if signal['signal'] in ['buy', 'sell']:
            self.current_position = {{
                'side': 'long' if signal['signal'] == 'buy' else 'short',
                'price': signal['price'],
                'amount': signal['amount']
            }}
        elif signal['signal'] == 'close':
            self.current_position = None
            
    def on_trade(self, trade: Dict):
        pass
        
    def record_trade(self, signal: Dict[str, Any]):
        pass
    
    def get_stats(self):
        return {{}}
"""
        return code

    def _create_config(self, output_dir, strategy_name):
        config = {
            "strategy_name": strategy_name,
            "symbol": "BTCUSDT",
            "interval": "1h",
            "start_date": "2024-01-01",
            "end_date": "2024-12-01",
            "initial_capital": 10000,
            "parameters": {
                "total_capital": 10000,
                "position_size": 0.9,
                "leverage": 1.0,
                "entry_threshold": 1.0,
                "exit_threshold": 0.0
            }
        }
        import json
        with open(f"{output_dir}/config.json", 'w') as f:
            json.dump(config, f, indent=4)

    def _to_class_name(self, name):
        return "".join(part.capitalize() for part in name.split('_'))
