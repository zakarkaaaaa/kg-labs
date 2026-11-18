import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Radio, Button, Space, Typography, Tooltip } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  ColumnWidthOutlined,
  BlockOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  originalImage: ImageData | null;
  processedImage: ImageData | null;
  processedTitle?: string;
}

type ViewMode = 'split' | 'sideBySide' | 'processedOnly';

export const ImageCompare: React.FC<Props> = ({
  originalImage,
  processedImage,
  processedTitle = 'Обработанное',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0..100
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const canvasOrigRef = useRef<HTMLCanvasElement | null>(null);
  const canvasProcRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSplitRef = useRef<HTMLCanvasElement | null>(null);

  // Draw images onto canvases
  useEffect(() => {
    if (!originalImage) return;

    if (canvasOrigRef.current) {
      const c = canvasOrigRef.current;
      c.width = originalImage.width;
      c.height = originalImage.height;
      const ctx = c.getContext('2d');
      if (ctx) ctx.putImageData(originalImage, 0, 0);
    }
  }, [originalImage]);

  useEffect(() => {
    if (!processedImage) return;

    if (canvasProcRef.current) {
      const c = canvasProcRef.current;
      c.width = processedImage.width;
      c.height = processedImage.height;
      const ctx = c.getContext('2d');
      if (ctx) ctx.putImageData(processedImage, 0, 0);
    }
  }, [processedImage]);

  // Redraw split canvas whenever images or split position change
  useEffect(() => {
    if (!originalImage || !processedImage || !canvasSplitRef.current) return;

    const canvas = canvasSplitRef.current;
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = originalImage.width;
    const h = originalImage.height;
    const splitX = Math.round((splitPos / 100) * w);

    // Draw processed image on right / full
    ctx.putImageData(processedImage, 0, 0);

    // Clip and draw original image on left side
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, h);
    ctx.clip();
    ctx.putImageData(originalImage, 0, 0);
    ctx.restore();

    // Draw split line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, h);
    ctx.stroke();

    // Draw split handle circle in center
    ctx.fillStyle = '#1677ff';
    ctx.beginPath();
    ctx.arc(splitX, h / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw small arrows on the handle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(splitX - 6, h / 2);
    ctx.lineTo(splitX - 2, h / 2 - 4);
    ctx.lineTo(splitX - 2, h / 2 + 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(splitX + 6, h / 2);
    ctx.lineTo(splitX + 2, h / 2 - 4);
    ctx.lineTo(splitX + 2, h / 2 + 4);
    ctx.closePath();
    ctx.fill();
  }, [originalImage, processedImage, splitPos]);

  // Drag handlers for split view
  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(pct);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleDownload = () => {
    if (!processedImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = processedImage.width;
    canvas.height = processedImage.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(processedImage, 0, 0);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${Date.now()}.png`;
      a.click();
    }
  };

  if (!originalImage || !processedImage) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Изображение не загружено</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* View controls toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Radio.Group
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button value="split">
            <Space orientation="horizontal" size={4}><ColumnWidthOutlined /> Слайдер До/После</Space>
          </Radio.Button>
          <Radio.Button value="sideBySide">
            <Space orientation="horizontal" size={4}><BlockOutlined /> Рядом</Space>
          </Radio.Button>
          <Radio.Button value="processedOnly">
            <Space orientation="horizontal" size={4}><EyeOutlined /> Только результат</Space>
          </Radio.Button>
        </Radio.Group>

        <Space orientation="horizontal" size="small">
          {viewMode === 'processedOnly' && (
            <Button
              size="small"
              onMouseDown={() => setIsHoldingOriginal(true)}
              onMouseUp={() => setIsHoldingOriginal(false)}
              onTouchStart={() => setIsHoldingOriginal(true)}
              onTouchEnd={() => setIsHoldingOriginal(false)}
            >
              Зажать для оригинала
            </Button>
          )}

          <Tooltip title="Скачать обработанное изображение">
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
            >
              Скачать результат
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Visual Canvas Area */}
      <div
        ref={containerRef}
        style={{
          background: '#0a0a0a',
          borderRadius: 8,
          border: '1px solid #2a2a2a',
          padding: 8,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 340,
        }}
      >
        {viewMode === 'split' && (
          <div
            style={{ position: 'relative', maxWidth: '100%', cursor: 'ew-resize' }}
            onMouseDown={handleMouseDown}
          >
            <canvas
              ref={canvasSplitRef}
              style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
            >
              Слева: Исходное
            </div>
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
            >
              Справа: {processedTitle}
            </div>
          </div>
        )}

        {viewMode === 'sideBySide' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                Оригинал ({originalImage.width}×{originalImage.height})
              </Text>
              <canvas
                ref={canvasOrigRef}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 4,
                  border: '1px solid #333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#1677ff' }}>
                {processedTitle}
              </Text>
              <canvas
                ref={canvasProcRef}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 4,
                  border: '1px solid #1677ff',
                  boxShadow: '0 2px 8px rgba(22,119,255,0.2)',
                }}
              />
            </div>
          </div>
        )}

        {viewMode === 'processedOnly' && (
          <div style={{ position: 'relative', maxWidth: '100%' }}>
            <canvas
              ref={isHoldingOriginal ? canvasOrigRef : canvasProcRef}
              style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(0,0,0,0.75)',
                color: isHoldingOriginal ? '#faad14' : '#52c41a',
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 4,
              }}
            >
              {isHoldingOriginal ? 'Просмотр: Оригинал' : `Просмотр: ${processedTitle}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
