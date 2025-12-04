import pandas as pd
import matplotlib.pyplot as plt
import sys

def plot_equity():
    try:
        df = pd.read_csv('backtest/results/rs_equity_curve.csv')
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('timestamp')
        
        plt.figure(figsize=(12, 6))
        plt.plot(df['equity'], label='RSA Strategy', color='green')
        plt.title('Relative Strength Arbitrage Equity Curve (Jan-Mar 2023)')
        plt.xlabel('Date')
        plt.ylabel('Equity (USDT)')
        plt.grid(True, alpha=0.3)
        plt.legend()
        
        output_path = 'backtest/results/rsa_backtest_chart.png'
        plt.savefig(output_path)
        print(f"Chart saved to {output_path}")
        
    except Exception as e:
        print(f"Error plotting: {e}")

if __name__ == "__main__":
    plot_equity()
