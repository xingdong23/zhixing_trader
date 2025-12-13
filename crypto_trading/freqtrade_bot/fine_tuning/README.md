# Amazon Chronos 模型微调指南 (Fine-tuning Guide)

此目录包含用于在云端 GPU 服务器（如 Google Colab, AWS EC2, 并行计算集群）上微调 Chronos 模型的核心代码。

## 1. 准备环境

建议使用 Linux + NVIDIA GPU 环境。

1. **上传代码**: 将整个 `fine_tuning` 文件夹上传到服务器。
2. **准备数据**: 将您的历史 CSV 数据（例如 `data/` 下的文件）上传到服务器的 `dataset/` 目录。
3. **安装依赖**:
   ```bash
   pip install -r requirements.txt
   ```

## 2. 运行微调

使用以下命令启动训练：

```bash
python train_chronos.py \
    --data_path ./dataset \
    --output_dir ./my_btc_model \
    --base_model amazon/chronos-t5-small \
    --epochs 10
```

*   `--data_path`: 存放 CSV 数据的目录（支持 Freqtrade 格式）。
*   `--output_dir`: 训练完成后模型的保存位置。
*   `--base_model`: 基础模型，可选 `amazon/chronos-t5-tiny`, `small`, `base`, `large`。

## 3. 部署回实盘

1. 训练完成后，下载 `my_btc_model` 文件夹。
2. 将其放置在您本地电脑的 `freqtrade_bot/user_data/freqaimodels/` 目录附近（或任意位置）。
3. 修改 `configs/config_chronos.json`：
   ```json
   "model_training_parameters": {
       "model_path": "/完整路径/到/my_btc_model", 
       ...
   }
   ```
4. 启动实盘/回测，Freqtrade 将自动加载此微调后的模型。
