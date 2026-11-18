import React from 'react';
import { Modal, Typography, Divider, Alert, Tag } from 'antd';
import { BookOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<Props> = ({ open, onClose }) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOutlined style={{ color: '#1677ff' }} />
          <span>Теоретические сведения и пояснения к лабораторной работе №2</span>
        </div>
      }
      open={open}
      onOk={onClose}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
        <Alert
          message="Материалы для защиты работы (Критерий «Пояснения: 30 баллов»)"
          description="Здесь приведены строгие математические формулы, физический смысл алгоритмов и разбор ключевых вопросов преподавателя."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Title level={4}>1. Линейное контрастирование изображения</Title>
        <Paragraph>
          <b>Физический смысл:</b> Растяжение динамического диапазона яркостей малоконтрастного изображения на весь допустимый диапазон $[0, 255]$.
        </Paragraph>
        <div style={{ background: '#1f1f1f', padding: 12, borderRadius: 6, marginBottom: 12 }}>
          <Text code style={{ fontSize: 13, color: '#faad14' }}>
            I_out(x, y) = clamp( ((I_in(x, y) - I_min) / (I_max - I_min)) * 255, 0, 255 )
          </Text>
        </div>
        <Paragraph>
          <b>Зачем нужно отсечение по перцентилям (Percentile Clipping):</b>
          <br />
          Если на фотографии есть хотя бы один случайный битый белый пиксель (255) или черный пиксель (0), наивное линейное контрастирование ничего не сделает (I_max - I_min = 255). Отсечение крайних 1–3% распределения игнорирует единичный шум и эффективно расширяет диапазон реальной сцены.
        </Paragraph>

        <Divider style={{ borderColor: '#333' }} />

        <Title level={4}>2. Эквализация гистограммы (Histogram Equalization)</Title>
        <Paragraph>
          <b>Физический смысл:</b> Нелинейное преобразование яркостей, стремящееся сделать плотность распределения яркостей равномерной (плоской). В результате повышается локальный контраст и энтропия изображения.
        </Paragraph>
        <Paragraph>
          Преобразование строится на основе нормализованной кумулятивной функции распределения (CDF):
        </Paragraph>
        <div style={{ background: '#1f1f1f', padding: 12, borderRadius: 6, marginBottom: 12 }}>
          <Text style={{ display: 'block', color: '#52c41a', fontSize: 13, marginBottom: 4 }}>
            1. Вероятность яркости: P(k) = H(k) / N, где H(k) — гистограмма, N — число пикселей.
          </Text>
          <Text style={{ display: 'block', color: '#faad14', fontSize: 13, marginBottom: 4 }}>
            2. Интегральная функция (CDF): CDF(k) = Σ (j = 0 .. k) P(j).
          </Text>
          <Text style={{ display: 'block', color: '#1677ff', fontSize: 13 }}>
            3. Отображение в новую яркость: I_new(k) = round( ((CDF(k) - CDF_min) / (1 - CDF_min)) * 255 ).
          </Text>
        </div>

        <Divider style={{ borderColor: '#333' }} />

        <Title level={4}>3. Сравнение подходов эквализации цветных изображений</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ background: '#2a1215', border: '1px solid #5c2223', padding: 10, borderRadius: 6 }}>
            <Tag color="red" style={{ marginBottom: 6 }}>Подход A: RGB поканально</Tag>
            <Paragraph style={{ fontSize: 12, margin: 0 }}>
              Эквализация применяется независимо к R, G и B.
              <br /><br />
              <b>Недостаток:</b> Нарушается исходное пропорциональное соотношение каналов ($R:G:B$), что приводит к искажению цветового тона (сдвиг оттенка) и появлению неестественных цветных пятен («выгорание»).
            </Paragraph>
          </div>
          <div style={{ background: '#112518', border: '1px solid #1e4a2a', padding: 10, borderRadius: 6 }}>
            <Tag color="green" style={{ marginBottom: 6 }}>Подход B: В пространстве HSV / HSL</Tag>
            <Paragraph style={{ fontSize: 12, margin: 0 }}>
              Изображение переводится в HSV, где эквализируется <b>только компонента яркости V</b> (Value), а цветовой тон H и насыщенность S остаются неизменными.
              <br /><br />
              <b>Преимущество:</b> Контраст увеличивается без малейшего смещения цветов и нарушения баланса белого.
            </Paragraph>
          </div>
        </div>

        <Divider style={{ borderColor: '#333' }} />

        <Title level={4}>4. Высокочастотные фильтры (Увеличение резкости)</Title>
        <Paragraph>
          <b>Пространственные частоты:</b>
          <br />
          - <i>Низкие частоты</i> — плавно меняющиеся области (небо, гладкая кожа, фон).
          <br />
          - <i>Высокие частоты</i> — резкие скачки яркости (границы объектов, текстуры, мелкий текст).
        </Paragraph>
        <Paragraph>
          <b>Оператор Лапласа (дискретная 2-я производная):</b>
          <br />
          Вычисляет сумму вторых разностей по координатам.
        </Paragraph>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ background: '#1f1f1f', padding: 10, borderRadius: 6, flex: 1, minWidth: 200 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              4-связный Лапласиан резкости:
            </Text>
            <pre style={{ margin: 0, fontSize: 12, color: '#52c41a' }}>
{`[  0, -1,  0 ]
[ -1,  5, -1 ]
[  0, -1,  0 ]`}
            </pre>
          </div>
          <div style={{ background: '#1f1f1f', padding: 10, borderRadius: 6, flex: 1, minWidth: 200 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              8-связный Лапласиан резкости:
            </Text>
            <pre style={{ margin: 0, fontSize: 12, color: '#faad14' }}>
{`[ -1, -1, -1 ]
[ -1,  9, -1 ]
[ -1, -1, -1 ]`}
            </pre>
          </div>
        </div>
        <Paragraph>
          Сумма коэффициентов ядра равна $1$, поэтому общая яркость изображения сохраняется, а перепады яркости на границах умножаются на веса.
        </Paragraph>

        <Paragraph>
          <b>Нерезкое маскирование (Unsharp Masking):</b>
          <br />
          Классический полиграфический метод:
          <br />
          1. Создается размытая копия <code>I_blur</code> (Гауссовское сглаживание).
          <br />
          2. Вычисляется маска высоких частот: <code>M = I_orig - I_blur</code>.
          <br />
          3. Результат: <code>I_sharp = I_orig + k * M</code>, где <code>k</code> — коэффициент усиления.
        </Paragraph>
      </div>
    </Modal>
  );
};
