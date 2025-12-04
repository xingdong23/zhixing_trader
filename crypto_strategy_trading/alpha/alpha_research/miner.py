import pandas as pd
import numpy as np
from gplearn.genetic import SymbolicTransformer
from alpha_research.data_loader import DataLoader
from alpha_research.functions import make_ts_functions
import logging

from alpha_research.factor_store import FactorStore

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_mining(generations=10, population_size=2000):
    logger.info("Starting Alpha Factor Mining...")
    
    store = FactorStore()

    # 1. Load Data
    loader = DataLoader()
    try:
        # Load 1h data
        df = loader.load_data(symbol='BTCUSDT', timeframe='1h')
        logger.info(f"Loaded {len(df)} rows of data.")
        
        # Use last 2 years (approx 17500 hours)
        df = df.iloc[-17500:].copy()
        logger.info(f"Using last {len(df)} rows for mining.")
        
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return

    # 2. Prepare X and y
    target_period = 24 
    X_df, y = loader.prepare_features_and_target(df, target_period=target_period)
    X_df = X_df.fillna(method='ffill').fillna(0)
    X = X_df.values
    y = y.values
    feature_names = X_df.columns.tolist()

    # 3. Define Function Set
    function_set = make_ts_functions(windows=[6, 12, 24, 48, 168])

    # 4. Initialize Genetic Programming
    logger.info("Initializing Genetic Programming Engine...")
    est = SymbolicTransformer(
        generations=generations,
        population_size=population_size,
        hall_of_fame=100,
        n_components=20, # Return more components to save
        function_set=function_set,
        parsimony_coefficient=0.0005,
        max_samples=0.9,
        verbose=1,
        random_state=None, # Random state None for continuous mining diversity
        n_jobs=-1,
        feature_names=feature_names
    )

    # 5. Run Mining
    logger.info("Fitting model...")
    est.fit(X, y)

    # 6. Save Results
    logger.info("Mining Complete. Saving to Factor Store...")
    
    saved_count = 0
    for i, program in enumerate(est):
        # Calculate IC
        factor_values = program.execute(X)
        factor_values = np.nan_to_num(factor_values)
        ic = np.corrcoef(factor_values, y)[0, 1]
        
        # Save to DB
        formula_str = str(program)
        if abs(ic) > 0.05: # Minimum IC threshold
            saved = store.save_factor(
                formula=formula_str,
                ic_score=ic,
                complexity=program.length_,
                metadata={'target_period': target_period}
            )
            if saved:
                saved_count += 1
                
    logger.info(f"Saved {saved_count} new factors to database.")

if __name__ == "__main__":
    # Simple loop for demo purposes, in production this would be a proper service
    import time
    while True:
        run_mining(generations=5, population_size=1000)
        logger.info("Sleeping for 10 seconds before next mining cycle...")
        time.sleep(10)
