import time
import logging
import subprocess
import sys
import os
import json
from datetime import datetime
from alpha_research.miner import run_mining
from alpha_research.factor_store import FactorStore
from alpha_verification.builder import StrategyBuilder

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("alpha_system.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("AlphaEngine")

class AlphaEngine:
    """
    The Verification Engine.
    Orchestrates the cycle: Mine -> Build -> Verify.
    """
    def __init__(self):
        self.store = FactorStore()
        self.builder = StrategyBuilder(self.store)
        self.cycle_count = 0

    def run_backtest(self, strategy_name):
        """
        Run backtest for the generated strategy.
        """
        logger.info(f"Running backtest for {strategy_name}...")
        
        # Create a temporary backtest config
        config_file = f"strategies/{strategy_name}/config.json"
        
        # Register strategy dynamically
        self._register_strategy(strategy_name)
        
        # Generate backtest config
        backtest_config = {
            "backtest_name": f"Auto Backtest {strategy_name}",
            "description": "Automated backtest",
            "strategy": {
                "name": strategy_name,
                "config_file": config_file,
                "parameters": {}
            },
            "data": {
                "source": "backtest/data/BTCUSDT-1h-merged.csv",
                "resample_from": "1h",
                "timeframe": "1h",
                "start_date": "2024-01-01",
                "end_date": "2024-12-01"
            },
            "backtest_settings": {
                "initial_capital": 10000,
                "window_size": 200,
                "taker_fee_rate": 0.0005,
                "maker_fee_rate": 0.0002,
                "slippage_rate": 0.0001
            },
            "output": {
                "save_trades": True,
                "result_file": f"results/{strategy_name}.json",
                "save_equity_curve": True
            }
        }
        
        bt_config_path = f"strategies/{strategy_name}/backtest_config.json"
        with open(bt_config_path, 'w') as f:
            json.dump(backtest_config, f, indent=4)
            
        cmd = [sys.executable, "backtest/run_backtest.py", "--config", bt_config_path]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"Backtest successful for {strategy_name}")
                # Parse result to see if it's good (optional)
                return True
            else:
                logger.error(f"Backtest failed for {strategy_name}: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"Error running backtest: {e}")
            return False

    def _register_strategy(self, strategy_name):
        """
        Dynamically register the new strategy in strategies/__init__.py
        """
        init_path = "strategies/__init__.py"
        class_name = "".join(part.capitalize() for part in strategy_name.split('_'))
        
        with open(init_path, 'r') as f:
            content = f.read()
            
        if strategy_name in content:
            return # Already registered
            
        # Add import
        import_line = f"from .{strategy_name}.strategy import {class_name}\n"
        
        # Add to registry dict
        registry_entry = f"    '{strategy_name}': {class_name},\n}}"
        
        # We need to insert the import at top and entry in dict
        new_content = content.replace("}", registry_entry)
        
        # Insert import after the last import
        last_import_idx = new_content.rfind("from .")
        if last_import_idx == -1:
             # Fallback if no imports found
             final_content = import_line + new_content
        else:
            end_of_line = new_content.find("\n", last_import_idx) + 1
            final_content = new_content[:end_of_line] + import_line + new_content[end_of_line:]
        
        with open(init_path, 'w') as f:
            f.write(final_content)
        
        logger.info(f"Registered {strategy_name} in strategies/__init__.py")

    def start_loop(self):
        logger.info("=== Starting Automated Alpha Verification Engine ===")
        
        while True:
            self.cycle_count += 1
            logger.info(f"\n--- Cycle {self.cycle_count} ---")
            
            # 1. Mine (Calling the Research Module)
            logger.info("Phase 1: Mining (Alpha Research)...")
            # In production, this might be an async call or checking a queue
            # Here we call it synchronously for the prototype
            run_mining(generations=2, population_size=500)
            
            # 2. Check Store
            count = self.store.get_factor_count()
            logger.info(f"Total Factors in Store: {count}")
            
            if count >= 3:
                # 3. Build Strategy
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                strategy_name = f"auto_alpha_{timestamp}"
                
                logger.info(f"Phase 2: Building Strategy {strategy_name}...")
                file_path = self.builder.build_strategy(strategy_name, top_n=3, min_ic=0.05)
                
                if file_path:
                    # 4. Backtest
                    logger.info("Phase 3: Verification (Backtest)...")
                    success = self.run_backtest(strategy_name)
                    
                    if success:
                        logger.info(f"Cycle {self.cycle_count} completed successfully.")
                    else:
                        logger.warning(f"Cycle {self.cycle_count} failed at backtest.")
            
            logger.info("Sleeping for 5 seconds...")
            time.sleep(5)

if __name__ == "__main__":
    engine = AlphaEngine()
    engine.start_loop()
