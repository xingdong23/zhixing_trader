import numpy as np
import pandas as pd
from gplearn.functions import make_function

# --- Helper Functions ---
def _rolling_window(a, window):
    shape = a.shape[:-1] + (a.shape[-1] - window + 1, window)
    strides = a.strides + (a.strides[-1],)
    return np.lib.stride_tricks.as_strided(a, shape=shape, strides=strides)

def _ts_delay(x, d):
    # Shift x by d, fill with 0 (or nan, but gplearn doesn't like nans)
    res = np.roll(x, d)
    res[:d] = 0
    return res

def _ts_delta(x, d):
    return x - _ts_delay(x, d)

def _ts_mean(x, d):
    # simple moving average
    # efficient implementation using convolution or pandas
    # using pandas for reliability with nans
    return pd.Series(x).rolling(d).mean().fillna(0).values

def _ts_max(x, d):
    return pd.Series(x).rolling(d).max().fillna(0).values

def _ts_min(x, d):
    return pd.Series(x).rolling(d).min().fillna(0).values

def _ts_std(x, d):
    return pd.Series(x).rolling(d).std().fillna(0).values

def _ts_rank(x, d):
    # Rolling rank (percentile)
    # This is slow in pure python/pandas for large data
    # We can use a simplified version or optimized one
    return pd.Series(x).rolling(d).apply(lambda x: pd.Series(x).rank().iloc[-1], raw=True).fillna(0).values

def _ts_corr(x, y, d):
    return pd.Series(x).rolling(d).corr(pd.Series(y)).fillna(0).values

def _sigmoid(x):
    return 1 / (1 + np.exp(-x))

# --- Factory to create gplearn functions ---

def _protected_div(x1, x2):
    with np.errstate(divide='ignore', invalid='ignore'):
        return np.where(np.abs(x2) > 0.001, np.divide(x1, x2), 1.)

def _protected_log(x):
    with np.errstate(divide='ignore', invalid='ignore'):
        return np.where(np.abs(x) > 0.001, np.log(np.abs(x)), 0.)

def _protected_sqrt(x):
    return np.sqrt(np.abs(x))

def _protected_inv(x):
    with np.errstate(divide='ignore', invalid='ignore'):
        return np.where(np.abs(x) > 0.001, 1. / x, 0.)

# --- Factory to create gplearn functions ---

def _create_closure_1(func, w):
    def closure(x):
        return func(x, w)
    return closure

def _create_closure_2(func, w):
    def closure(x, y):
        return func(x, y, w)
    return closure

def make_ts_functions(windows=[5, 10, 20, 60]):
    functions = []
    
    # Basic operators
    functions.append(make_function(function=np.add, name='add', arity=2))
    functions.append(make_function(function=np.subtract, name='sub', arity=2))
    functions.append(make_function(function=np.multiply, name='mul', arity=2))
    functions.append(make_function(function=_protected_div, name='div', arity=2))
    functions.append(make_function(function=np.abs, name='abs', arity=1))
    functions.append(make_function(function=np.negative, name='neg', arity=1))
    functions.append(make_function(function=_protected_log, name='log', arity=1))
    functions.append(make_function(function=_protected_sqrt, name='sqrt', arity=1))
    functions.append(make_function(function=_protected_inv, name='inv', arity=1))
    functions.append(make_function(function=_sigmoid, name='sigmoid', arity=1))

    # Time-series operators for each window
    for w in windows:
        # Delay
        functions.append(make_function(function=_create_closure_1(_ts_delay, w), name=f'delay_{w}', arity=1))
        
        # Delta
        functions.append(make_function(function=_create_closure_1(_ts_delta, w), name=f'delta_{w}', arity=1))
        
        # Rolling stats
        functions.append(make_function(function=_create_closure_1(_ts_mean, w), name=f'ts_mean_{w}', arity=1))
        functions.append(make_function(function=_create_closure_1(_ts_max, w), name=f'ts_max_{w}', arity=1))
        functions.append(make_function(function=_create_closure_1(_ts_min, w), name=f'ts_min_{w}', arity=1))
        
        # Correlation (arity 2)
        functions.append(make_function(function=_create_closure_2(_ts_corr, w), name=f'ts_corr_{w}', arity=2))

    return functions
