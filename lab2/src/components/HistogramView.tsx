import React, { useRef, useEffect, useState } from 'react';
import { Radio, Switch, Space, Typography, Tag, Card } from 'antd';
import type { ChannelHistograms } from '../utils/histogram';
import { computeCdf, computeStats } from '../utils/histogram';

const { Text } = Typography;

interface Props {
  histograms: ChannelHistograms;
  totalPixels: number;
  title?: string;
  height?: number;
}

type ChannelMode = 'luminance' | 'rgb' | 'r' | 'g' | 'b';

export const HistogramView: React.FC<Props> = ({
  histograms,
  totalPixels,
  title = 'Гистограмма',
  height = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [channel, setChannel] = useState<ChannelMode>('luminance');
  const [showCdf, setShowCdf] = useState<boolean>(true);
  const [hoverInfo, setHoverInfo] = useState<{ bin: number; count: number; cdfPct: number } | null>(null);

  // Compute active channel stats & cdf
  const activeHist =
    channel === 'r'
      ? histograms.r
      : channel === 'g'
      ? histograms.g
      : channel === 'b'
      ? histograms.b
      : histograms.luminance;

  const stats = computeStats(activeHist, totalPixels);
  const cdf = computeCdf(activeHist, totalPixels);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      const x = (w / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Determine max peak for scaling (ignore isolated spike at 0 or 255 if too extreme)
    let maxVal = 1;
    const searchHists = channel === 'rgb' ? [histograms.r, histograms.g, histograms.b] : [activeHist];
    for (const hst of searchHists) {
      for (let i = 0; i < 256; i++) {
        if (hst[i] > maxVal) maxVal = hst[i];
      }
    }

    const barWidth = w / 256;

    const drawSingleHist = (histData: Uint32Array, color: string, alpha: number) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < 256; i++) {
        const count = histData[i];
        const barHeight = (count / maxVal) * (h - 10);
        ctx.fillRect(i * barWidth, h - barHeight, Math.max(1, barWidth), barHeight);
      }
      ctx.globalAlpha = 1.0;
    };

    if (channel === 'rgb') {
      ctx.globalCompositeOperation = 'screen';
      drawSingleHist(histograms.r, '#ff4d4f', 0.65);
      drawSingleHist(histograms.g, '#52c41a', 0.65);
      drawSingleHist(histograms.b, '#1890ff', 0.65);
      ctx.globalCompositeOperation = 'source-over';
    } else if (channel === 'luminance') {
      drawSingleHist(histograms.luminance, '#e0e0e0', 0.85);
    } else if (channel === 'r') {
      drawSingleHist(histograms.r, '#ff4d4f', 0.85);
    } else if (channel === 'g') {
      drawSingleHist(histograms.g, '#52c41a', 0.85);
    } else if (channel === 'b') {
      drawSingleHist(histograms.b, '#1890ff', 0.85);
    }

    // Draw CDF curve
    if (showCdf) {
      ctx.strokeStyle = '#faad14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 256; i++) {
        const x = i * barWidth + barWidth / 2;
        const y = h - cdf[i] * (h - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw min / max markers
    ctx.strokeStyle = '#fa8c16';
    ctx.setLineDash([3, 3]);
    const minX = stats.min * barWidth;
    const maxX = stats.max * barWidth;
    ctx.beginPath();
    ctx.moveTo(minX, 0);
    ctx.lineTo(minX, h);
    ctx.moveTo(maxX, 0);
    ctx.lineTo(maxX, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [histograms, channel, showCdf, height, activeHist, cdf, stats]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const bin = Math.min(255, Math.max(0, Math.floor((x / rect.width) * 256)));
    const count = activeHist[bin];
    const cdfPct = Math.round(cdf[bin] * 100);
    setHoverInfo({ bin, count, cdfPct });
  };

  return (
    <Card
      size="small"
      title={<Text strong>{title}</Text>}
      extra={
        <Space orientation="horizontal" size="small">
          <Radio.Group
            size="small"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="luminance">Яркость</Radio.Button>
            <Radio.Button value="rgb">RGB</Radio.Button>
            <Radio.Button value="r">R</Radio.Button>
            <Radio.Button value="g">G</Radio.Button>
            <Radio.Button value="b">B</Radio.Button>
          </Radio.Group>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>CDF</Text>
            <Switch size="small" checked={showCdf} onChange={setShowCdf} />
          </Space>
        </Space>
      }
      style={{ background: '#141414', borderColor: '#303030' }}
      styles={{ body: { padding: '8px 12px' } }}
    >
      <div style={{ position: 'relative', cursor: 'crosshair' }}>
        <canvas
          ref={canvasRef}
          width={512}
          height={height}
          style={{ width: '100%', height, display: 'block', borderRadius: 4 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
        />
        {hoverInfo && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 8,
              background: 'rgba(0,0,0,0.75)',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              color: '#fff',
              pointerEvents: 'none',
              border: '1px solid #444',
            }}
          >
            Яркость: <b>{hoverInfo.bin}</b> | Пикселей: <b>{hoverInfo.count.toLocaleString()}</b> | CDF:{' '}
            <b style={{ color: '#faad14' }}>{hoverInfo.cdfPct}%</b>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }}>
        <Space orientation="horizontal" size={4} wrap>
          <Tag color="default">Мин: {stats.min}</Tag>
          <Tag color="default">Макс: {stats.max}</Tag>
          <Tag color="blue">Диапазон: {stats.max - stats.min}</Tag>
          <Tag color="cyan">Среднее: {stats.mean.toFixed(1)}</Tag>
          <Tag color="purple">СКО (σ): {stats.stdDev.toFixed(1)}</Tag>
        </Space>
        {showCdf && <Tag color="warning" style={{ fontSize: 11 }}>— Оранжевая кривая: CDF (Кумулята)</Tag>}
      </div>
    </Card>
  );
};
