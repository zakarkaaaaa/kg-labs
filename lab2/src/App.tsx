import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ConfigProvider,
  theme,
  Layout,
  Typography,
  Space,
  Button,
  Tabs,
  Tag,
  Row,
  Col,
  Spin,
} from 'antd';
import {
  BookOutlined,
  ThunderboltOutlined,
  AimOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';

import { SAMPLES, SamplePicker } from './components/SamplePicker';
import type { SampleItem } from './components/SamplePicker';
import { ImageCompare } from './components/ImageCompare';
import { HistogramView } from './components/HistogramView';
import { ContrastPanel } from './components/ContrastPanel';
import type { ContrastMethod } from './components/ContrastPanel';
import { SharpenPanel } from './components/SharpenPanel';
import type { SharpenMode } from './components/SharpenPanel';
import { MethodComparisonTab } from './components/MethodComparisonTab';
import { TheoryModal } from './components/TheoryModal';

import { computeHistograms } from './utils/histogram';
import {
  applyLinearContrast,
  applyHistogramEqualizationRGB,
  applyHistogramEqualizationHSV,
} from './utils/contrast';
import type { Kernel3x3 } from './utils/convolution';
import {
  PRESET_KERNELS,
  applyConvolution,
  applyTunableSharpen,
  applyUnsharpMask,
} from './utils/convolution';

import './App.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

export const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('low_contrast');
  const [activeTab, setActiveTab] = useState<string>('contrast');
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Contrast parameters
  const [contrastMethod, setContrastMethod] = useState<ContrastMethod>('linear');
  const [clipPercent, setClipPercent] = useState<number>(1.0);
  const [perChannelLinear, setPerChannelLinear] = useState<boolean>(false);

  // Sharpen parameters
  const [sharpenMode, setSharpenMode] = useState<SharpenMode>('preset');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('sharpenStrong');
  const [tunableStrength, setTunableStrength] = useState<number>(1.0);
  const [unsharpAmount, setUnsharpAmount] = useState<number>(1.5);
  const [unsharpThreshold, setUnsharpThreshold] = useState<number>(2);
  const [customKernel, setCustomKernel] = useState<Kernel3x3>([
    [-1, -1, -1],
    [-1, 9, -1],
    [-1, -1, -1],
  ]);
  const [customDivisor, setCustomDivisor] = useState<number>(1);
  const [customOffset, setCustomOffset] = useState<number>(0);

  // Helper to load an image URL into ImageData
  const loadImageFromUrl = useCallback((url: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height);
        setOriginalImage(data);
      }
      setIsProcessing(false);
    };
    img.onerror = () => {
      setIsProcessing(false);
    };
    img.src = url;
  }, []);

  // Load default sample on mount
  useEffect(() => {
    const defaultSample = SAMPLES.find((s) => s.id === 'low_contrast') || SAMPLES[0];
    if (defaultSample) {
      loadImageFromUrl(defaultSample.url);
    }
  }, [loadImageFromUrl]);

  const handleSelectSample = (sample: SampleItem) => {
    setSelectedSampleId(sample.id);
    loadImageFromUrl(sample.url);
    // Automatically switch tabs for best demo experience
    if (sample.category === 'sharpen' && activeTab === 'contrast') {
      setActiveTab('sharpen');
    }
  };

  const handleUploadCustom = (imgData: ImageData, _fileName: string) => {
    setSelectedSampleId('custom');
    setOriginalImage(imgData);
  };

  // Compute processed image based on active tab and settings
  const { processedImage, processedTitle } = useMemo(() => {
    if (!originalImage) {
      return { processedImage: null, processedTitle: '' };
    }

    if (activeTab === 'contrast') {
      if (contrastMethod === 'linear') {
        const title = `Линейное контрастирование (${clipPercent}% clip, ${perChannelLinear ? 'поканально' : 'по яркости'})`;
        return {
          processedImage: applyLinearContrast(originalImage, clipPercent, perChannelLinear),
          processedTitle: title,
        };
      }
      if (contrastMethod === 'equalizeHsv') {
        return {
          processedImage: applyHistogramEqualizationHSV(originalImage),
          processedTitle: 'Эквализация гистограммы в HSV (Яркость V)',
        };
      }
      if (contrastMethod === 'equalizeRgb') {
        return {
          processedImage: applyHistogramEqualizationRGB(originalImage),
          processedTitle: 'Эквализация гистограммы в RGB (Поканально)',
        };
      }
    }

    if (activeTab === 'sharpen') {
      if (sharpenMode === 'preset') {
        const p = PRESET_KERNELS[selectedPresetKey] || PRESET_KERNELS.sharpenStrong;
        return {
          processedImage: applyConvolution(originalImage, p.kernel, p.divisor, p.offset),
          processedTitle: p.name,
        };
      }
      if (sharpenMode === 'tunable') {
        return {
          processedImage: applyTunableSharpen(originalImage, tunableStrength),
          processedTitle: `Настраиваемая резкость (w = ${tunableStrength.toFixed(2)})`,
        };
      }
      if (sharpenMode === 'unsharpMask') {
        return {
          processedImage: applyUnsharpMask(originalImage, unsharpAmount, unsharpThreshold),
          processedTitle: `Нерезкое маскирование (k = ${unsharpAmount.toFixed(1)}, t = ${unsharpThreshold})`,
        };
      }
      if (sharpenMode === 'custom') {
        return {
          processedImage: applyConvolution(originalImage, customKernel, customDivisor, customOffset),
          processedTitle: `Пользовательское ядро 3×3 (div: ${customDivisor}, off: ${customOffset})`,
        };
      }
    }

    return { processedImage: originalImage, processedTitle: 'Исходное' };
  }, [
    originalImage,
    activeTab,
    contrastMethod,
    clipPercent,
    perChannelLinear,
    sharpenMode,
    selectedPresetKey,
    tunableStrength,
    unsharpAmount,
    unsharpThreshold,
    customKernel,
    customDivisor,
    customOffset,
  ]);

  // Compute histograms for both original and processed image
  const totalPixels = originalImage ? originalImage.width * originalImage.height : 1;
  const originalHistograms = useMemo(
    () => (originalImage ? computeHistograms(originalImage) : null),
    [originalImage]
  );
  const processedHistograms = useMemo(
    () => (processedImage ? computeHistograms(processedImage) : null),
    [processedImage]
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          colorBgContainer: '#141414',
          colorBgElevated: '#1f1f1f',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#0d1117' }}>
        {/* Header */}
        <Header
          style={{
            background: '#161b22',
            borderBottom: '1px solid #30363d',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
          }}
        >
          <Space orientation="horizontal" size="middle" align="center">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              href="../"
              style={{ color: '#8b949e' }}
            >
              К списку лаб
            </Button>
            <Title level={4} style={{ margin: 0, color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Лабораторная работа 2</span>
              <Tag color="blue">Вариант 3</Tag>
            </Title>
          </Space>

          <Space orientation="horizontal" size="small">
            <Button
              type="primary"
              ghost
              icon={<BookOutlined />}
              onClick={() => setIsTheoryOpen(true)}
            >
              Теория и пояснения к защите (30 баллов)
            </Button>
          </Space>
        </Header>

        {/* Content */}
        <Content style={{ padding: '20px 24px' }}>
          <div className="app-container">
            {/* Test Image Gallery */}
            <SamplePicker
              selectedSampleId={selectedSampleId}
              onSelectSample={handleSelectSample}
              onUploadCustom={handleUploadCustom}
            />

            {/* Main Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="middle"
              items={[
                {
                  key: 'contrast',
                  label: (
                    <Space orientation="horizontal" size={6}>
                      <ThunderboltOutlined />
                      <span>Контрастирование и гистограммы</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <ContrastPanel
                        method={contrastMethod}
                        onChangeMethod={setContrastMethod}
                        clipPercent={clipPercent}
                        onChangeClipPercent={setClipPercent}
                        perChannelLinear={perChannelLinear}
                        onChangePerChannelLinear={setPerChannelLinear}
                      />

                      <Spin spinning={isProcessing}>
                        <ImageCompare
                          originalImage={originalImage}
                          processedImage={processedImage}
                          processedTitle={processedTitle}
                        />
                      </Spin>

                      {originalHistograms && processedHistograms && (
                        <Row gutter={[16, 16]}>
                          <Col xs={24} lg={12}>
                            <HistogramView
                              histograms={originalHistograms}
                              totalPixels={totalPixels}
                              title="Гистограмма исходного изображения"
                            />
                          </Col>
                          <Col xs={24} lg={12}>
                            <HistogramView
                              histograms={processedHistograms}
                              totalPixels={totalPixels}
                              title={`Гистограмма после: ${processedTitle}`}
                            />
                          </Col>
                        </Row>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'sharpen',
                  label: (
                    <Space orientation="horizontal" size={6}>
                      <AimOutlined />
                      <span>Высокочастотные фильтры (Резкость)</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <SharpenPanel
                        mode={sharpenMode}
                        onChangeMode={setSharpenMode}
                        selectedPresetKey={selectedPresetKey}
                        onChangePresetKey={setSelectedPresetKey}
                        tunableStrength={tunableStrength}
                        onChangeTunableStrength={setTunableStrength}
                        unsharpAmount={unsharpAmount}
                        onChangeUnsharpAmount={setUnsharpAmount}
                        unsharpThreshold={unsharpThreshold}
                        onChangeUnsharpThreshold={setUnsharpThreshold}
                        customKernel={customKernel}
                        onChangeCustomKernel={setCustomKernel}
                        customDivisor={customDivisor}
                        onChangeCustomDivisor={setCustomDivisor}
                        customOffset={customOffset}
                        onChangeCustomOffset={setCustomOffset}
                      />

                      <Spin spinning={isProcessing}>
                        <ImageCompare
                          originalImage={originalImage}
                          processedImage={processedImage}
                          processedTitle={processedTitle}
                        />
                      </Spin>

                      {originalHistograms && processedHistograms && (
                        <Row gutter={[16, 16]}>
                          <Col xs={24} lg={12}>
                            <HistogramView
                              histograms={originalHistograms}
                              totalPixels={totalPixels}
                              title="Гистограмма исходного изображения"
                            />
                          </Col>
                          <Col xs={24} lg={12}>
                            <HistogramView
                              histograms={processedHistograms}
                              totalPixels={totalPixels}
                              title={`Гистограмма после фильтра: ${processedTitle}`}
                            />
                          </Col>
                        </Row>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'comparison',
                  label: (
                    <Space orientation="horizontal" size={6}>
                      <AppstoreOutlined />
                      <span>Сравнительный анализ (4 метода)</span>
                    </Space>
                  ),
                  children: <MethodComparisonTab originalImage={originalImage} />,
                },
              ]}
            />
          </div>
        </Content>

        <Footer style={{ textAlign: 'center', background: '#0d1117', color: '#6e7681', fontSize: 12 }}>
          Компьютерная графика • Лабораторная работа №2 • Вариант 3: Высокочастотные фильтры & Гистограммы
        </Footer>

        {/* Theoretical Defense Modal */}
        <TheoryModal open={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} />
      </Layout>
    </ConfigProvider>
  );
};

export default App;
