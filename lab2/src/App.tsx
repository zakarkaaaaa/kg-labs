import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ImageCompare } from './components/ImageCompare';
import type { ViewMode } from './components/ImageCompare';
import { CanvasImage } from './components/ImageCompare';
import { HistogramView } from './components/HistogramView';

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

type ActiveTab = 'contrast' | 'sharpen' | 'compare';
type ContrastMethod = 'linear' | 'equalizeHsv' | 'equalizeRgb';
type SharpenMode = 'preset' | 'tunable' | 'unsharp' | 'custom';
type CompareGroup = 'contrast' | 'sharpen';

interface SampleItem {
  id: string;
  label: string;
  url: string;
  defaultTab: ActiveTab;
}

const SAMPLES: SampleItem[] = [
  { id: 'low_contrast', label: 'low_contrast', url: './samples/low_contrast.bmp', defaultTab: 'contrast' },
  { id: 'dark_night', label: 'dark_night', url: './samples/dark_night.bmp', defaultTab: 'contrast' },
  { id: 'colorful', label: 'colorful', url: './samples/colorful.bmp', defaultTab: 'contrast' },
  { id: 'blurry_details', label: 'blurry_details', url: './samples/blurry_details.bmp', defaultTab: 'sharpen' },
];

export const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('low_contrast');
  const [activeTab, setActiveTab] = useState<ActiveTab>('contrast');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Contrast
  const [contrastMethod, setContrastMethod] = useState<ContrastMethod>('linear');
  const [clipPercent, setClipPercent] = useState<number>(1.0);
  const [perChannelLinear, setPerChannelLinear] = useState<boolean>(false);

  // Sharpen
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

  // Compare
  const [compareGroup, setCompareGroup] = useState<CompareGroup>('contrast');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImageFromUrl = useCallback((url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setOriginalImage(ctx.getImageData(0, 0, img.width, img.height));
      }
    };
    img.src = url;
  }, []);

  useEffect(() => {
    loadImageFromUrl(SAMPLES[0].url);
  }, [loadImageFromUrl]);

  const handleSelectSample = (sample: SampleItem) => {
    setSelectedSampleId(sample.id);
    loadImageFromUrl(sample.url);
    if (activeTab !== 'compare') {
      setActiveTab(sample.defaultTab);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedSampleId('custom');
        loadImageFromUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processedImage = useMemo(() => {
    if (!originalImage) return null;

    if (activeTab === 'contrast') {
      if (contrastMethod === 'linear') {
        return applyLinearContrast(originalImage, clipPercent, perChannelLinear);
      }
      if (contrastMethod === 'equalizeHsv') {
        return applyHistogramEqualizationHSV(originalImage);
      }
      return applyHistogramEqualizationRGB(originalImage);
    }

    if (activeTab === 'sharpen') {
      if (sharpenMode === 'preset') {
        const preset = PRESET_KERNELS[selectedPresetKey] || PRESET_KERNELS.sharpenStrong;
        return applyConvolution(originalImage, preset.kernel, preset.divisor, preset.offset);
      }
      if (sharpenMode === 'tunable') {
        return applyTunableSharpen(originalImage, tunableStrength);
      }
      if (sharpenMode === 'unsharp') {
        return applyUnsharpMask(originalImage, unsharpAmount, unsharpThreshold);
      }
      return applyConvolution(originalImage, customKernel, customDivisor || 1, customOffset);
    }

    return originalImage;
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

  const compareItems = useMemo(() => {
    if (!originalImage || activeTab !== 'compare') return [];
    if (compareGroup === 'contrast') {
      return [
        { label: 'Оригинал', data: originalImage },
        { label: 'Линейное (1%)', data: applyLinearContrast(originalImage, 1.0, false) },
        { label: 'Эквализация HSV', data: applyHistogramEqualizationHSV(originalImage) },
        { label: 'Эквализация RGB', data: applyHistogramEqualizationRGB(originalImage) },
      ];
    }
    return [
      { label: 'Оригинал', data: originalImage },
      { label: 'Лапласиан', data: applyConvolution(originalImage, PRESET_KERNELS.laplacianEdges.kernel, PRESET_KERNELS.laplacianEdges.divisor, PRESET_KERNELS.laplacianEdges.offset) },
      { label: 'Резкость 3×3', data: applyConvolution(originalImage, PRESET_KERNELS.sharpenStrong.kernel, PRESET_KERNELS.sharpenStrong.divisor, PRESET_KERNELS.sharpenStrong.offset) },
      { label: 'Unsharp Mask', data: applyUnsharpMask(originalImage, 1.5, 2) },
    ];
  }, [originalImage, activeTab, compareGroup]);

  const beforeHist = useMemo(() => (originalImage ? computeHistograms(originalImage) : null), [originalImage]);
  const afterHist = useMemo(() => (processedImage ? computeHistograms(processedImage) : null), [processedImage]);

  const updateKernelCell = (r: number, c: number, val: string) => {
    const num = Number(val);
    if (Number.isNaN(num)) return;
    setCustomKernel((prev) => {
      const next = prev.map((row) => [...row]) as Kernel3x3;
      next[r][c] = num;
      return next;
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <a href="../index.html" className="back-link" title="Назад">
            ←
          </a>
          <span className="brand">LAB 02</span>
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'contrast' ? 'active' : ''}`}
              onClick={() => setActiveTab('contrast')}
            >
              Контраст
            </button>
            <button
              className={`tab-btn ${activeTab === 'sharpen' ? 'active' : ''}`}
              onClick={() => setActiveTab('sharpen')}
            >
              Резкость
            </button>
            <button
              className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
            >
              Сравнение
            </button>
          </div>
        </div>

        <div className="samples-bar">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              className={`sample-btn ${selectedSampleId === s.id ? 'active' : ''}`}
              onClick={() => handleSelectSample(s)}
            >
              {s.label}
            </button>
          ))}
          <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
            + Файл
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileUpload}
          />
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          {activeTab === 'contrast' && (
            <>
              <div className="section">
                <div className="section-label">Метод</div>
                <div className="seg-group">
                  <button
                    className={`seg-btn ${contrastMethod === 'linear' ? 'active' : ''}`}
                    onClick={() => setContrastMethod('linear')}
                  >
                    Линейное контрастирование
                  </button>
                  <button
                    className={`seg-btn ${contrastMethod === 'equalizeHsv' ? 'active' : ''}`}
                    onClick={() => setContrastMethod('equalizeHsv')}
                  >
                    Эквализация HSV (V)
                  </button>
                  <button
                    className={`seg-btn ${contrastMethod === 'equalizeRgb' ? 'active' : ''}`}
                    onClick={() => setContrastMethod('equalizeRgb')}
                  >
                    Эквализация RGB
                  </button>
                </div>
              </div>

              {contrastMethod === 'linear' && (
                <div className="section">
                  <div className="section-label">Параметры</div>
                  <div className="control-row">
                    <div className="control-header">
                      <span>Отсечение</span>
                      <span className="mono-val">{clipPercent.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={clipPercent}
                      onChange={(e) => setClipPercent(Number(e.target.value))}
                    />
                  </div>

                  <div
                    className="toggle-row"
                    onClick={() => setPerChannelLinear((v) => !v)}
                  >
                    <span>Поканально (RGB)</span>
                    <div className={`toggle-box ${perChannelLinear ? 'on' : ''}`}>
                      <div className="toggle-knob" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'sharpen' && (
            <>
              <div className="section">
                <div className="section-label">Режим</div>
                <div className="seg-group">
                  <button
                    className={`seg-btn ${sharpenMode === 'preset' ? 'active' : ''}`}
                    onClick={() => setSharpenMode('preset')}
                  >
                    Пресет ядра
                  </button>
                  <button
                    className={`seg-btn ${sharpenMode === 'tunable' ? 'active' : ''}`}
                    onClick={() => setSharpenMode('tunable')}
                  >
                    Настраиваемая резкость
                  </button>
                  <button
                    className={`seg-btn ${sharpenMode === 'unsharp' ? 'active' : ''}`}
                    onClick={() => setSharpenMode('unsharp')}
                  >
                    Unsharp Mask
                  </button>
                  <button
                    className={`seg-btn ${sharpenMode === 'custom' ? 'active' : ''}`}
                    onClick={() => setSharpenMode('custom')}
                  >
                    Матрица 3×3
                  </button>
                </div>
              </div>

              {sharpenMode === 'preset' && (
                <div className="section">
                  <div className="section-label">Ядро</div>
                  <div className="seg-group">
                    {Object.entries(PRESET_KERNELS).map(([key, item]) => (
                      <button
                        key={key}
                        className={`seg-btn ${selectedPresetKey === key ? 'active' : ''}`}
                        onClick={() => setSelectedPresetKey(key)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sharpenMode === 'tunable' && (
                <div className="section">
                  <div className="section-label">Параметры</div>
                  <div className="control-row">
                    <div className="control-header">
                      <span>Сила</span>
                      <span className="mono-val">{tunableStrength.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={0.05}
                      value={tunableStrength}
                      onChange={(e) => setTunableStrength(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {sharpenMode === 'unsharp' && (
                <div className="section">
                  <div className="section-label">Параметры</div>
                  <div className="control-row">
                    <div className="control-header">
                      <span>Сила</span>
                      <span className="mono-val">{unsharpAmount.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={0.1}
                      value={unsharpAmount}
                      onChange={(e) => setUnsharpAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="control-row">
                    <div className="control-header">
                      <span>Порог</span>
                      <span className="mono-val">{unsharpThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={unsharpThreshold}
                      onChange={(e) => setUnsharpThreshold(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {sharpenMode === 'custom' && (
                <div className="section">
                  <div className="section-label">Матрица 3×3</div>
                  <div className="kernel-grid">
                    {customKernel.map((row, r) =>
                      row.map((val, c) => (
                        <input
                          key={`${r}-${c}`}
                          type="number"
                          className="kernel-input"
                          value={val}
                          onChange={(e) => updateKernelCell(r, c, e.target.value)}
                        />
                      ))
                    )}
                  </div>
                  <div className="two-col">
                    <div className="control-row">
                      <span className="section-label">Делитель</span>
                      <input
                        type="number"
                        className="kernel-input"
                        value={customDivisor}
                        onChange={(e) => setCustomDivisor(Number(e.target.value) || 1)}
                      />
                    </div>
                    <div className="control-row">
                      <span className="section-label">Смещение</span>
                      <input
                        type="number"
                        className="kernel-input"
                        value={customOffset}
                        onChange={(e) => setCustomOffset(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'compare' && (
            <div className="section">
              <div className="section-label">Набор</div>
              <div className="seg-group">
                <button
                  className={`seg-btn ${compareGroup === 'contrast' ? 'active' : ''}`}
                  onClick={() => setCompareGroup('contrast')}
                >
                  Контрастирование
                </button>
                <button
                  className={`seg-btn ${compareGroup === 'sharpen' ? 'active' : ''}`}
                  onClick={() => setCompareGroup('sharpen')}
                >
                  Фильтры резкости
                </button>
              </div>
            </div>
          )}
        </aside>

        <main className="viewport">
          <div className="viewport-toolbar">
            <span>
              {originalImage ? `${originalImage.width} × ${originalImage.height} px` : '—'}
            </span>
            {activeTab !== 'compare' && (
              <div className="view-modes">
                <button
                  className={`mini-btn ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => setViewMode('split')}
                >
                  Сплит
                </button>
                <button
                  className={`mini-btn ${viewMode === 'side' ? 'active' : ''}`}
                  onClick={() => setViewMode('side')}
                >
                  Рядом
                </button>
                <button
                  className={`mini-btn ${viewMode === 'after' ? 'active' : ''}`}
                  onClick={() => setViewMode('after')}
                >
                  После
                </button>
              </div>
            )}
          </div>

          <div className="canvas-stage">
            {activeTab === 'compare' ? (
              <div className="compare-grid">
                {compareItems.map((item) => (
                  <div key={item.label} className="img-frame">
                    <div className="img-frame-head">{item.label}</div>
                    <CanvasImage imageData={item.data} />
                  </div>
                ))}
              </div>
            ) : (
              <ImageCompare
                original={originalImage}
                processed={processedImage}
                viewMode={viewMode}
              />
            )}
          </div>

          {activeTab !== 'compare' && (
            <HistogramView before={beforeHist} after={afterHist} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
