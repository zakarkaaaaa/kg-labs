import React from 'react';
import { Radio, Slider, Switch, Space, Typography, Alert, Card, Row, Col } from 'antd';
import { InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

export type ContrastMethod = 'linear' | 'equalizeHsv' | 'equalizeRgb' | 'compareEqualize';

interface Props {
  method: ContrastMethod;
  onChangeMethod: (m: ContrastMethod) => void;
  clipPercent: number;
  onChangeClipPercent: (val: number) => void;
  perChannelLinear: boolean;
  onChangePerChannelLinear: (val: boolean) => void;
}

export const ContrastPanel: React.FC<Props> = ({
  method,
  onChangeMethod,
  clipPercent,
  onChangeClipPercent,
  perChannelLinear,
  onChangePerChannelLinear,
}) => {
  return (
    <Card
      size="small"
      title={
        <Space orientation="horizontal" size="small">
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <Text strong>Настройки контрастирования и гистограммы</Text>
        </Space>
      }
      style={{ background: '#141414', borderColor: '#303030' }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>
          Выберите алгоритм:
        </Text>
        <Radio.Group
          value={method}
          onChange={(e) => onChangeMethod(e.target.value)}
          buttonStyle="solid"
          size="middle"
          style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 6 }}
        >
          <Radio.Button value="linear" style={{ flex: '1 1 auto', textAlign: 'center' }}>
            Линейное контрастирование
          </Radio.Button>
          <Radio.Button value="equalizeHsv" style={{ flex: '1 1 auto', textAlign: 'center' }}>
            Эквализация HSV (Яркость V)
          </Radio.Button>
          <Radio.Button value="equalizeRgb" style={{ flex: '1 1 auto', textAlign: 'center' }}>
            Эквализация RGB (Поканально)
          </Radio.Button>
        </Radio.Group>
      </div>

      {method === 'linear' && (
        <div style={{ background: '#1c1c1c', padding: 12, borderRadius: 6, border: '1px solid #2a2a2a' }}>
          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} md={14}>
              <Text style={{ fontSize: 13 }}>
                Отсечение крайних перцентилей (клиппинг шума): <b>{clipPercent}%</b>
              </Text>
              <Slider
                min={0}
                max={5}
                step={0.1}
                value={clipPercent}
                onChange={onChangeClipPercent}
                tooltip={{ formatter: (v) => `${v}%` }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Игнорирует экстремальные одиночные пиксели (0% = растяжение строго от абсолютно минимального до максимального).
              </Text>
            </Col>
            <Col xs={24} md={10}>
              <Space orientation="vertical" size={4}>
                <Text style={{ fontSize: 13 }}>Режим растяжения диапазона:</Text>
                <Space orientation="horizontal" size="small">
                  <Switch
                    checked={perChannelLinear}
                    onChange={onChangePerChannelLinear}
                    checkedChildren="RGB поканально"
                    unCheckedChildren="По яркости (Global)"
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {perChannelLinear
                      ? 'Каждый канал R, G, B растягивается отдельно'
                      : 'Сохраняет исходное соотношение цветов'}
                  </Text>
                </Space>
              </Space>
            </Col>
          </Row>

          <Alert
            message="Формула линейного контрастирования"
            description="I_out = clamp((I_in - I_min) / (I_max - I_min) * 255). Растягивает узкий динамический диапазон малоконтрастного изображения на всю шкалу [0, 255]."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginTop: 12, fontSize: 12 }}
          />
        </div>
      )}

      {method === 'equalizeHsv' && (
        <Alert
          message="Выравнивание гистограммы в пространстве HSV (Рекомендуемый подход)"
          description={
            <div>
              <Paragraph style={{ margin: 0, fontSize: 12 }}>
                Изображение переводится из <b>RGB в HSV</b>. Эквализация по функции распределения (CDF) применяется <b>только к каналу яркости V</b> (Value), после чего цвета возвращаются в RGB.
              </Paragraph>
              <Paragraph style={{ margin: '4px 0 0 0', fontSize: 12, color: '#52c41a' }}>
                <b>Результат:</b> Контраст эффективно выравнивается, а цветовые оттенки (Hue) и насыщенность (Saturation) не искажаются.
              </Paragraph>
            </div>
          }
          type="success"
          showIcon
        />
      )}

      {method === 'equalizeRgb' && (
        <Alert
          message="Выравнивание гистограммы в пространстве RGB (Поканально)"
          description={
            <div>
              <Paragraph style={{ margin: 0, fontSize: 12 }}>
                Эквализация применяется независимо к каждому каналу: <b>R</b>, <b>G</b> и <b>B</b> со своими отдельными CDF.
              </Paragraph>
              <Paragraph style={{ margin: '4px 0 0 0', fontSize: 12, color: '#ff4d4f' }}>
                <b>Артефакт:</b> Из-за независимого растяжения каналов изменяется их исходное соотношение, что приводит к неестественным цветовым пятнам («выгоранию» или искажению оттенков).
              </Paragraph>
            </div>
          }
          type="warning"
          showIcon
        />
      )}
    </Card>
  );
};
