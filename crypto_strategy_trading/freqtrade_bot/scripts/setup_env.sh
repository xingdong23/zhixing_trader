#!/bin/bash
# TA-Lib Installation Fix for M1/Mac
# Create local workaround directory
mkdir -p local_lib
# Symlink with underscore name (ta_lib) to hyphen name (ta-lib)
ln -sf /opt/homebrew/Cellar/ta-lib/0.6.4/lib/libta-lib.dylib local_lib/libta_lib.dylib
ln -sf /opt/homebrew/Cellar/ta-lib/0.6.4/lib/libta-lib.0.dylib local_lib/libta_lib.0.dylib

export TA_INCLUDE_PATH="/opt/homebrew/Cellar/ta-lib/0.6.4/include"
export TA_LIBRARY_PATH="$(pwd)/local_lib"
export CFLAGS="-I/opt/homebrew/Cellar/ta-lib/0.6.4/include"
export LDFLAGS="-L$(pwd)/local_lib"

echo "Installing TA-Lib with libs in $(pwd)/local_lib..."
pip install ta-lib
pip install freqtrade lightgbm scikit-learn pandas-ta
