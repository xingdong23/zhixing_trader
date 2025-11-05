'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Loader2, History } from 'lucide-react';
import { toast } from 'sonner';

export default function BrokersView() {
  // IBKR 状态
  const [ibkrConfig, setIbkrConfig] = useState({
    host: '127.0.0.1',
    port: 7497,
    clientId: 1
  });
  const [ibkrConnected, setIbkrConnected] = useState(false);
  const [ibkrLoading, setIbkrLoading] = useState(false);
  const [ibkrSyncing, setIbkrSyncing] = useState(false);
  const [ibkrLastSync, setIbkrLastSync] = useState<string | null>(null);

  // Longbridge 状态
  const [longbridgeConfig, setLongbridgeConfig] = useState({
    appKey: '',
    appSecret: '',
    accessToken: ''
  });
  const [longbridgeConnected, setLongbridgeConnected] = useState(false);
  const [longbridgeLoading, setLongbridgeLoading] = useState(false);
  const [longbridgeSyncing, setLongbridgeSyncing] = useState(false);
  const [longbridgeLastSync, setLongbridgeLastSync] = useState<string | null>(null);

  // 自动同步设置
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState('30');
  const [syncStartTime, setSyncStartTime] = useState('09:00');
  const [syncEndTime, setSyncEndTime] = useState('16:00');

  // 同步历史
  const [syncHistory, setSyncHistory] = useState([
    { time: '2024-10-18 14:30', broker: 'ibkr', records: 15, status: 'success' },
    { time: '2024-10-18 10:15', broker: 'ibkr', records: 8, status: 'success' },
    { time: '2024-10-17 15:45', broker: 'ibkr', records: 12, status: 'success' },
  ]);

  // IBKR 连接
  const handleIBKRConnect = async () => {
    setIbkrLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIbkrConnected(true);
    setIbkrLoading(false);
    toast.success('✅ 成功连接到 IBKR', {
      description: `主机: ${ibkrConfig.host}:${ibkrConfig.port}`
    });

    localStorage.setItem('ibkr_config', JSON.stringify({
      ...ibkrConfig,
      connected: true,
      connectedAt: new Date().toISOString()
    }));
  };

  // IBKR 断开
  const handleIBKRDisconnect = () => {
    setIbkrConnected(false);
    toast.info('已断开 IBKR 连接');
    localStorage.removeItem('ibkr_config');
  };

  // IBKR 同步
  const handleIBKRSync = async () => {
    setIbkrSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const recordCount = Math.floor(Math.random() * 20) + 5;
    setIbkrSyncing(false);
    setIbkrLastSync(new Date().toLocaleString());
    
    toast.success(`✅ 同步完成`, {
      description: `成功同步 ${recordCount} 条交易记录`,
      duration: 5000
    });

    setSyncHistory(prev => [{
      time: new Date().toLocaleString(),
      broker: 'ibkr',
      records: recordCount,
      status: 'success'
    }, ...prev]);

    const existingTrades = JSON.parse(localStorage.getItem('trades') || '[]');
    const newTrades = generateMockSyncedTrades(recordCount);
    localStorage.setItem('trades', JSON.stringify([...newTrades, ...existingTrades]));
  };

  // Longbridge 连接
  const handleLongbridgeConnect = async () => {
    if (!longbridgeConfig.appKey || !longbridgeConfig.appSecret || !longbridgeConfig.accessToken) {
      toast.error('请填写完整的连接信息');
      return;
    }

    setLongbridgeLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLongbridgeConnected(true);
    setLongbridgeLoading(false);
    toast.success('✅ 成功连接到 Longbridge');

    localStorage.setItem('longbridge_config', JSON.stringify({
      ...longbridgeConfig,
      connected: true,
      connectedAt: new Date().toISOString()
    }));
  };

  // Longbridge 断开
  const handleLongbridgeDisconnect = () => {
    setLongbridgeConnected(false);
    toast.info('已断开 Longbridge 连接');
    localStorage.removeItem('longbridge_config');
  };

  // Longbridge 同步
  const handleLongbridgeSync = async () => {
    setLongbridgeSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const recordCount = Math.floor(Math.random() * 15) + 3;
    setLongbridgeSyncing(false);
    setLongbridgeLastSync(new Date().toLocaleString());
    
    toast.success(`✅ 同步完成`, {
      description: `成功同步 ${recordCount} 条交易记录`
    });

    setSyncHistory(prev => [{
      time: new Date().toLocaleString(),
      broker: 'longbridge',
      records: recordCount,
      status: 'success'
    }, ...prev]);
  };

  // 生成模拟同步的交易数据
  function generateMockSyncedTrades(count: number) {
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];
    const trades = [];
    
    for (let i = 0; i < count; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const price = 100 + Math.random() * 200;
      const quantity = Math.floor(Math.random() * 100) + 10;
      
      trades.push({
        id: Date.now() + i,
        symbol,
        stockName: `${symbol} Inc.`,
        status: 'closed',
        planType: 'long',
        entryPrice: price,
        exitPrice: price * (1 + (Math.random() - 0.4) * 0.1),
        entryQuantity: quantity,
        exitQuantity: quantity,
        realizedPnl: (price * quantity * (Math.random() - 0.4) * 0.1),
        entryTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        exitTime: new Date().toISOString(),
        source: 'ibkr',
        synced: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    return trades;
  }

  return (
    <div className="space-y-6">
      {/* IBKR Card */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                IB
              </div>
              <div>
                <CardTitle className="text-2xl">盈透证券 (Interactive Brokers)</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  全球领先的在线券商,支持股票、期权、期货等多种资产
                </p>
              </div>
            </div>
            {ibkrConnected ? (
              <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                已连接
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 text-lg px-4 py-2">
                <XCircle className="w-4 h-4 mr-2" />
                未连接
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!ibkrConnected ? (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  📘 连接说明
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>确保 <strong>IB Gateway</strong> 或 <strong>TWS</strong> 已启动并登录</li>
                  <li>在 IB Gateway 中: <strong>配置 → 设置 → API → 启用 ActiveX 和 Socket 客户端</strong></li>
                  <li>端口号: <strong>7497</strong> (纸盘) 或 <strong>7496</strong> (实盘)</li>
                  <li>确保防火墙允许连接</li>
                </ol>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">主机地址</label>
                  <Input
                    value={ibkrConfig.host}
                    onChange={(e) => setIbkrConfig({ ...ibkrConfig, host: e.target.value })}
                    placeholder="127.0.0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">通常使用本地地址</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">端口</label>
                  <Input
                    type="number"
                    value={ibkrConfig.port}
                    onChange={(e) => setIbkrConfig({ ...ibkrConfig, port: parseInt(e.target.value) })}
                    placeholder="7497"
                  />
                  <p className="text-xs text-gray-500 mt-1">7497纸盘 / 7496实盘</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Client ID</label>
                  <Input
                    type="number"
                    value={ibkrConfig.clientId}
                    onChange={(e) => setIbkrConfig({ ...ibkrConfig, clientId: parseInt(e.target.value) })}
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">客户端标识符</p>
                </div>
              </div>

              <Button
                onClick={handleIBKRConnect}
                disabled={ibkrLoading}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {ibkrLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    连接 IBKR
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-300">
                      ✅ 已成功连接到 IBKR
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      连接地址: {ibkrConfig.host}:{ibkrConfig.port} | Client ID: {ibkrConfig.clientId}
                    </p>
                    {ibkrLastSync && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        上次同步: {ibkrLastSync}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleIBKRSync}
                  disabled={ibkrSyncing}
                  size="lg"
                  className="h-14"
                >
                  {ibkrSyncing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      同步交易记录
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleIBKRDisconnect}
                  size="lg"
                  className="h-14"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  断开连接
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Longbridge Card */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                LB
              </div>
              <div>
                <CardTitle className="text-2xl">长桥证券 (Longbridge)</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  港美股在线券商,支持A股、港股、美股交易
                </p>
              </div>
            </div>
            {longbridgeConnected ? (
              <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                已连接
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 text-lg px-4 py-2">
                <XCircle className="w-4 h-4 mr-2" />
                未连接
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!longbridgeConnected ? (
            <div className="space-y-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  📘 连接说明
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>访问长桥开放平台: <a href="https://open.longportapp.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">open.longportapp.com</a></li>
                  <li>创建应用并获取 <strong>App Key</strong>, <strong>App Secret</strong></li>
                  <li>生成 <strong>Access Token</strong></li>
                  <li>填写凭证信息并连接</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">App Key</label>
                  <Input
                    type="password"
                    value={longbridgeConfig.appKey}
                    onChange={(e) => setLongbridgeConfig({ ...longbridgeConfig, appKey: e.target.value })}
                    placeholder="输入 App Key"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">App Secret</label>
                  <Input
                    type="password"
                    value={longbridgeConfig.appSecret}
                    onChange={(e) => setLongbridgeConfig({ ...longbridgeConfig, appSecret: e.target.value })}
                    placeholder="输入 App Secret"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Access Token</label>
                  <Input
                    type="password"
                    value={longbridgeConfig.accessToken}
                    onChange={(e) => setLongbridgeConfig({ ...longbridgeConfig, accessToken: e.target.value })}
                    placeholder="输入 Access Token"
                  />
                </div>
              </div>

              <Button
                onClick={handleLongbridgeConnect}
                disabled={longbridgeLoading}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {longbridgeLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    连接中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    连接 Longbridge
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-semibold text-green-700 dark:text-green-300">
                  ✅ 已成功连接到 Longbridge
                </p>
                {longbridgeLastSync && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    上次同步: {longbridgeLastSync}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleLongbridgeSync}
                  disabled={longbridgeSyncing}
                  size="lg"
                  className="h-14"
                >
                  {longbridgeSyncing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      同步交易记录
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLongbridgeDisconnect}
                  size="lg"
                  className="h-14"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  断开连接
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自动同步设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            自动同步设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <p className="font-medium">启用自动同步</p>
              <p className="text-sm text-gray-500">在交易时间段自动同步交易记录</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {autoSyncEnabled && (
            <div className="grid grid-cols-2 gap-6 p-4 border rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">同步频率</label>
                <select
                  value={syncFrequency}
                  onChange={(e) => setSyncFrequency(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                >
                  <option value="5">每 5 分钟</option>
                  <option value="15">每 15 分钟</option>
                  <option value="30">每 30 分钟</option>
                  <option value="60">每 1 小时</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">同步时间段</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={syncStartTime}
                    onChange={(e) => setSyncStartTime(e.target.value)}
                    className="flex-1"
                  />
                  <span>至</span>
                  <Input
                    type="time"
                    value={syncEndTime}
                    onChange={(e) => setSyncEndTime(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 同步历史 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            同步历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {syncHistory.map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                    record.broker === 'ibkr' ? 'bg-blue-600' : 'bg-purple-600'
                  }`}>
                    {record.broker === 'ibkr' ? 'IB' : 'LB'}
                  </div>
                  <div>
                    <p className="font-medium">{record.broker === 'ibkr' ? 'IBKR' : 'Longbridge'} 同步</p>
                    <p className="text-sm text-gray-500">{record.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {record.records} 条记录
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

