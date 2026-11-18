import React from 'react';
import { Upload, Button, Space, Typography, Card } from 'antd';
import { UploadOutlined, PictureOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text } = Typography;

export interface SampleItem {
  id: string;
  name: string;
  url: string;
  description: string;
  category: 'contrast' | 'sharpen';
}

export const SAMPLES: SampleItem[] = [
  {
    id: 'low_contrast',
    name: 'Малоконтрастное фото',
    url: './samples/low_contrast.bmp',
    description: 'Узкий диапазон яркости [95..145]. Для линейного контрастирования и эквализации.',
    category: 'contrast',
  },
  {
    id: 'dark_night',
    name: 'Темная ночная сцена',
    url: './samples/dark_night.bmp',
    description: 'Гистограмма смещена влево [5..75]. Демонстрация вытягивания теней.',
    category: 'contrast',
  },
  {
    id: 'colorful',
    name: 'Яркие цветные лепестки',
    url: './samples/colorful.bmp',
    description: 'Насыщенные цвета. Идеально для сравнения эквализации в RGB vs HSV.',
    category: 'contrast',
  },
  {
    id: 'blurry_details',
    name: 'Размытые детали и контуры',
    url: './samples/blurry_details.bmp',
    description: 'Сглаженные кольца и перепады. Для проверки фильтров резкости и Лапласиана.',
    category: 'sharpen',
  },
];

interface Props {
  selectedSampleId: string;
  onSelectSample: (sample: SampleItem) => void;
  onUploadCustom: (imgData: ImageData, fileName: string) => void;
}

export const SamplePicker: React.FC<Props> = ({
  selectedSampleId,
  onSelectSample,
  onUploadCustom,
}) => {
  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, img.width, img.height);
            onUploadCustom(imgData, file.name);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      return false; // prevent automatic HTTP POST
    },
    showUploadList: false,
    accept: 'image/*',
  };

  return (
    <Card
      size="small"
      title={
        <Space orientation="horizontal" size="small">
          <PictureOutlined style={{ color: '#1677ff' }} />
          <Text strong>База тестовых изображений</Text>
        </Space>
      }
      extra={
        <Upload {...uploadProps}>
          <Button size="small" icon={<UploadOutlined />}>
            Загрузить своё фото
          </Button>
        </Upload>
      }
      style={{ background: '#141414', borderColor: '#303030', marginBottom: 16 }}
      styles={{ body: { padding: '8px 12px' } }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        {SAMPLES.map((sample) => {
          const isSelected = selectedSampleId === sample.id;
          return (
            <div
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                borderRadius: 6,
                border: isSelected ? '1px solid #1677ff' : '1px solid #2a2a2a',
                background: isSelected ? 'rgba(22, 119, 255, 0.12)' : '#1f1f1f',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <img
                src={sample.url}
                alt={sample.name}
                style={{
                  width: 48,
                  height: 36,
                  objectFit: 'cover',
                  borderRadius: 4,
                  border: '1px solid #444',
                }}
              />
              <div style={{ overflow: 'hidden' }}>
                <Text
                  strong
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: isSelected ? '#1677ff' : '#ddd',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {sample.name}
                </Text>
                <Text
                  type="secondary"
                  style={{
                    display: 'block',
                    fontSize: 10,
                    lineHeight: 1.2,
                    whiteSpace: 'normal',
                  }}
                >
                  {sample.description}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
