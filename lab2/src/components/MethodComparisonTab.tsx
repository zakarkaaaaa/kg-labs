import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Row, Col, Tag, Slider, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import {
  applyLinearContrast,
  applyHistogramEqualizationRGB,
  applyHistogramEqualizationHSV,
} from '../utils/contrast';
import { computeHistograms, computeStats } from '../utils/histogram';

const { Text } = Typography;

interface Props {
  originalImage: ImageData | null;
}

export const MethodComparisonTab: React.FC<Props> = ({ originalImage }) => {
  const [clipPercent, setClipPercent] = useState<number>(1.0);

  const canvasOrigRef = useRef<HTMLCanvasElement | null>(null);
  const canvasLinearRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRgbEqRef = useRef<HTMLCanvasElement | null>(null);
  const canvasHsvEqRef = useRef<HTMLCanvasElement | null>(null);

  const [stats, setStats] = useState<{
    orig: { mean: number; stdDev: number; min: number; max: number };
    linear: { mean: number; stdDev: number; min: number; max: number };
    rgb: { mean: number; stdDev: number; min: number; max: number };
    hsv: { mean: number; stdDev: number; min: number; max: number };
  } | null>(null);

  useEffect(() => {
    if (!originalImage) return;

    const total = originalImage.width * originalImage.height;

    // 1. Orig
    const hOrig = computeHistograms(originalImage);
    const sOrig = computeStats(hOrig.luminance, total);

    // 2. Linear Contrast
    const imgLinear = applyLinearContrast(originalImage, clipPercent, false);
    const hLinear = computeHistograms(imgLinear);
    const sLinear = computeStats(hLinear.luminance, total);

    // 3. RGB Equalization
    const imgRgb = applyHistogramEqualizationRGB(originalImage);
    const hRgb = computeHistograms(imgRgb);
    const sRgb = computeStats(hRgb.luminance, total);

    // 4. HSV Equalization
    const imgHsv = applyHistogramEqualizationHSV(originalImage);
    const hHsv = computeHistograms(imgHsv);
    const sHsv = computeStats(hHsv.luminance, total);

    setStats({
      orig: sOrig,
      linear: sLinear,
      rgb: sRgb,
      hsv: sHsv,
    });

    // Draw on canvases
    const draw = (canvas: HTMLCanvasElement | null, img: ImageData) => {
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.putImageData(img, 0, 0);
    };

    draw(canvasOrigRef.current, originalImage);
    draw(canvasLinearRef.current, imgLinear);
    draw(canvasRgbEqRef.current, imgRgb);
    draw(canvasHsvEqRef.current, imgHsv);
  }, [originalImage, clipPercent]);

  const handleDownloadCanvas = (canvas: HTMLCanvasElement | null, name: string) => {
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${Date.now()}.png`;
    a.click();
  };

  if (!originalImage) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Изображение не загружено</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#1c1c1c', padding: '12px 16px', borderRadius: 8, border: '1px solid #2a2a2a' }}>
        <Row gutter={[16, 8]} align="middle">
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 13 }}>
              Сравнительный анализ методов повышения контраста и подходов к эквализации
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
              Все 4 варианта генерируются в реальном времени из одного исходного изображения.
            </Text>
          </Col>
          <Col xs={24} md={12}>
            <Text style={{ fontSize: 12 }}>
              Клиппинг перцентилей линейного метода: <b>{clipPercent}%</b>
            </Text>
            <Slider
              min={0}
              max={5}
              step={0.2}
              value={clipPercent}
              onChange={setClipPercent}
              style={{ margin: '6px 0 0 0' }}
            />
          </Col>
        </Row>
      </div>

      <Row gutter={[12, 12]}>
        {/* 1. Original */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={<Text strong>1. Исходное изображение</Text>}
            extra={<Tag color="default">Оригинал</Tag>}
            style={{ background: '#141414', borderColor: '#303030' }}
          >
            <canvas
              ref={canvasOrigRef}
              style={{ width: '100%', height: 'auto', borderRadius: 4, display: 'block' }}
            />
            {stats && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag color="default">Диапазон: [{stats.orig.min}..{stats.orig.max}]</Tag>
                <Tag color="cyan">Среднее: {stats.orig.mean.toFixed(1)}</Tag>
                <Tag color="purple">Контраст (σ): {stats.orig.stdDev.toFixed(1)}</Tag>
              </div>
            )}
          </Card>
        </Col>

        {/* 2. Linear Contrast */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={<Text strong>2. Линейное контрастирование</Text>}
            extra={
              <Button
                size="small"
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadCanvas(canvasLinearRef.current, 'linear_contrast')}
              />
            }
            style={{ background: '#141414', borderColor: '#303030' }}
          >
            <canvas
              ref={canvasLinearRef}
              style={{ width: '100%', height: 'auto', borderRadius: 4, display: 'block' }}
            />
            {stats && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag color="blue">Диапазон: [{stats.linear.min}..{stats.linear.max}]</Tag>
                <Tag color="cyan">Среднее: {stats.linear.mean.toFixed(1)}</Tag>
                <Tag color="purple">Контраст (σ): {stats.linear.stdDev.toFixed(1)}</Tag>
              </div>
            )}
          </Card>
        </Col>

        {/* 3. RGB Equalization */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={<Text strong>3. Эквализация в RGB (Поканально)</Text>}
            extra={<Tag color="red">Искажение цвета</Tag>}
            style={{ background: '#141414', borderColor: '#5c2223' }}
          >
            <canvas
              ref={canvasRgbEqRef}
              style={{ width: '100%', height: 'auto', borderRadius: 4, display: 'block' }}
            />
            {stats && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag color="red">Диапазон: [{stats.rgb.min}..{stats.rgb.max}]</Tag>
                <Tag color="cyan">Среднее: {stats.rgb.mean.toFixed(1)}</Tag>
                <Tag color="purple">Контраст (σ): {stats.rgb.stdDev.toFixed(1)}</Tag>
              </div>
            )}
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
              Каналы R, G, B выравниваются независимо — возникают паразитные оттенки и сдвиг баланса белого.
            </Text>
          </Card>
        </Col>

        {/* 4. HSV Equalization */}
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={<Text strong>4. Эквализация в HSV (Только яркость V)</Text>}
            extra={<Tag color="green">Естественные цвета</Tag>}
            style={{ background: '#141414', borderColor: '#1e4a2a' }}
          >
            <canvas
              ref={canvasHsvEqRef}
              style={{ width: '100%', height: 'auto', borderRadius: 4, display: 'block' }}
            />
            {stats && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag color="green">Диапазон: [{stats.hsv.min}..{stats.hsv.max}]</Tag>
                <Tag color="cyan">Среднее: {stats.hsv.mean.toFixed(1)}</Tag>
                <Tag color="purple">Контраст (σ): {stats.hsv.stdDev.toFixed(1)}</Tag>
              </div>
            )}
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
              Выравнивается только яркость Value, цвета Hue и насыщенность Saturation сохраняются.
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
