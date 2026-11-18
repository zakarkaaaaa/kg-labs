import React from 'react';
import { Radio, Slider, Space, Typography, Card, InputNumber, Row, Col, Button } from 'antd';
import { AimOutlined, EditOutlined } from '@ant-design/icons';
import type { Kernel3x3 } from '../utils/convolution';
import { PRESET_KERNELS } from '../utils/convolution';

const { Text, Paragraph } = Typography;

export type SharpenMode = 'preset' | 'tunable' | 'unsharpMask' | 'custom';

interface Props {
  mode: SharpenMode;
  onChangeMode: (m: SharpenMode) => void;
  selectedPresetKey: string;
  onChangePresetKey: (key: string) => void;
  tunableStrength: number;
  onChangeTunableStrength: (val: number) => void;
  unsharpAmount: number;
  onChangeUnsharpAmount: (val: number) => void;
  unsharpThreshold: number;
  onChangeUnsharpThreshold: (val: number) => void;
  customKernel: Kernel3x3;
  onChangeCustomKernel: (kernel: Kernel3x3) => void;
  customDivisor: number;
  onChangeCustomDivisor: (val: number) => void;
  customOffset: number;
  onChangeCustomOffset: (val: number) => void;
}

export const SharpenPanel: React.FC<Props> = ({
  mode,
  onChangeMode,
  selectedPresetKey,
  onChangePresetKey,
  tunableStrength,
  onChangeTunableStrength,
  unsharpAmount,
  onChangeUnsharpAmount,
  unsharpThreshold,
  onChangeUnsharpThreshold,
  customKernel,
  onChangeCustomKernel,
  customDivisor,
  onChangeCustomDivisor,
  customOffset,
  onChangeCustomOffset,
}) => {
  const handleKernelCellChange = (r: number, c: number, val: number | null) => {
    const updated: Kernel3x3 = [
      [...customKernel[0]],
      [...customKernel[1]],
      [...customKernel[2]],
    ];
    updated[r][c] = val ?? 0;
    onChangeCustomKernel(updated);
  };

  const handleCopyPresetToCustom = (presetKey: string) => {
    const p = PRESET_KERNELS[presetKey];
    if (p) {
      onChangeCustomKernel([
        [...p.kernel[0]],
        [...p.kernel[1]],
        [...p.kernel[2]],
      ]);
      onChangeCustomDivisor(p.divisor);
      onChangeCustomOffset(p.offset);
    }
  };

  return (
    <Card
      size="small"
      title={
        <Space orientation="horizontal" size="small">
          <AimOutlined style={{ color: '#52c41a' }} />
          <Text strong>Высокочастотные фильтры (увеличение резкости)</Text>
        </Space>
      }
      style={{ background: '#141414', borderColor: '#303030' }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>
          Метод увеличения резкости:
        </Text>
        <Radio.Group
          value={mode}
          onChange={(e) => onChangeMode(e.target.value)}
          buttonStyle="solid"
          size="middle"
          style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 6 }}
        >
          <Radio.Button value="preset" style={{ flex: '1 1 auto', textAlign: 'center' }}>
            Предустановленные ядра 3x3
          </Radio.Button>
          <Radio.Button value="tunable" style={{ flex: '1 1 auto', textAlign: 'center' }}>
            Плавная резкость
          </Radio.Button>
          <Radio.Button value="unsharpMask" style={{ flex: '1 1 auto', textAlign: 'center' }}>
            Нерезкое маскирование
          </Radio.Button>
          <Radio.Button value="custom" style={{ flex: '1 1 auto', textAlign: 'center' }}>
            <EditOutlined /> Своя матрица 3x3
          </Radio.Button>
        </Radio.Group>
      </div>

      {mode === 'preset' && (
        <div style={{ background: '#1c1c1c', padding: 12, borderRadius: 6, border: '1px solid #2a2a2a' }}>
          <Text style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Выберите фильтр:</Text>
          <Radio.Group
            value={selectedPresetKey}
            onChange={(e) => onChangePresetKey(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {Object.entries(PRESET_KERNELS).map(([k, p]) => (
              <Radio key={k} value={k}>
                <Space orientation="vertical" size={0}>
                  <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{p.description}</Text>
                </Space>
              </Radio>
            ))}
          </Radio.Group>

          {PRESET_KERNELS[selectedPresetKey] && (
            <div style={{ marginTop: 12, padding: 8, background: '#141414', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                Матрица свертки 3×3 (Делитель: {PRESET_KERNELS[selectedPresetKey].divisor}, Смещение:{' '}
                {PRESET_KERNELS[selectedPresetKey].offset}):
              </Text>
              <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 40px)', gap: 4 }}>
                {PRESET_KERNELS[selectedPresetKey].kernel.flat().map((v, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#262626',
                      color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#888',
                      textAlign: 'center',
                      padding: '4px 0',
                      borderRadius: 3,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'tunable' && (
        <div style={{ background: '#1c1c1c', padding: 12, borderRadius: 6, border: '1px solid #2a2a2a' }}>
          <Text style={{ fontSize: 13 }}>
            Коэффициент увеличения резкости (w): <b>{tunableStrength.toFixed(2)}</b>
          </Text>
          <Slider
            min={0.0}
            max={3.0}
            step={0.05}
            value={tunableStrength}
            onChange={onChangeTunableStrength}
            marks={{ 0: 'Оригинал', 0.5: 'Мягко', 1.0: 'Лапласиан (8)', 2.0: 'Ультра' }}
          />
          <Paragraph type="secondary" style={{ fontSize: 11, marginTop: 8, marginBottom: 0 }}>
            Динамически строит ядро свертки с центральным элементом <code>1 + 8*w</code> и соседними <code>-w</code>.
            При <code>w = 0</code> ядро равно единичному (нет изменений), при росте <code>w</code> усиливаются высокие пространственные частоты.
          </Paragraph>
        </div>
      )}

      {mode === 'unsharpMask' && (
        <div style={{ background: '#1c1c1c', padding: 12, borderRadius: 6, border: '1px solid #2a2a2a' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} md={12}>
              <Text style={{ fontSize: 13 }}>
                Коэффициент усиления (Amount k): <b>{unsharpAmount.toFixed(1)}</b>
              </Text>
              <Slider
                min={0.1}
                max={4.0}
                step={0.1}
                value={unsharpAmount}
                onChange={onChangeUnsharpAmount}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Масштаб добавления маски высоких частот: <code>I_sharp = I_orig + k * (I_orig - I_blur)</code>.
              </Text>
            </Col>
            <Col xs={24} md={12}>
              <Text style={{ fontSize: 13 }}>
                Порог отсечения шума (Threshold): <b>{unsharpThreshold}</b>
              </Text>
              <Slider
                min={0}
                max={30}
                step={1}
                value={unsharpThreshold}
                onChange={onChangeUnsharpThreshold}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Игнорирует изменения меньше порога, предотвращая появление зернистости на гладких поверхностях.
              </Text>
            </Col>
          </Row>
        </div>
      )}

      {mode === 'custom' && (
        <div style={{ background: '#1c1c1c', padding: 12, borderRadius: 6, border: '1px solid #2a2a2a' }}>
          <Text style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            Пользовательская матрица свертки 3×3:
          </Text>
          <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, 70px)', gap: 6, marginBottom: 12 }}>
            {customKernel.map((row, r) =>
              row.map((val, c) => (
                <InputNumber
                  key={`${r}-${c}`}
                  value={val}
                  step={0.5}
                  size="small"
                  onChange={(v) => handleKernelCellChange(r, c, v)}
                  style={{ width: '100%' }}
                />
              ))
            )}
          </div>

          <Row gutter={[16, 8]} align="middle">
            <Col xs={12} sm={8}>
              <Text style={{ fontSize: 12, display: 'block' }}>Делитель (Divisor):</Text>
              <InputNumber
                value={customDivisor}
                size="small"
                step={1}
                onChange={(v) => onChangeCustomDivisor(v ?? 1)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Text style={{ fontSize: 12, display: 'block' }}>Смещение (Offset):</Text>
              <InputNumber
                value={customOffset}
                size="small"
                step={1}
                onChange={(v) => onChangeCustomOffset(v ?? 0)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 11, display: 'block', color: '#888' }}>Загрузить в шаблон:</Text>
              <Space orientation="horizontal" size={4} wrap>
                <Button size="small" onClick={() => handleCopyPresetToCustom('sharpenBasic')}>
                  Лаплас 4
                </Button>
                <Button size="small" onClick={() => handleCopyPresetToCustom('sharpenStrong')}>
                  Лаплас 8
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
};
