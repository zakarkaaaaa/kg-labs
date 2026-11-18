import type { Point } from './types.ts'

export interface ScenePreset {
  id: string
  name: string
  description: string
  inputText: string
  subjectPolygon: Point[]
  clipPolygon: Point[]
}

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'variant3-basic',
    name: 'Базовый набор (Вариант 3)',
    description: 'Отрезки всех типов: внутри, пересекающие, касающиеся и полностью снаружи',
    inputText: `6
4 3 8 7
0 5 12 5
6 0 6 10
0 0 12 10
-2 7 4 11
1 2 11 2
2 2 10 8`,
    subjectPolygon: [
      { x: 0, y: 4 },
      { x: 6, y: -1 },
      { x: 12, y: 5 },
      { x: 9, y: 10 },
      { x: 2, y: 9 },
    ],
    clipPolygon: [
      { x: 2, y: 2 },
      { x: 10, y: 2 },
      { x: 11, y: 6 },
      { x: 6, y: 9 },
      { x: 1, y: 6 },
    ],
  },
  {
    id: 'star-clip',
    name: 'Сетка и диагонали',
    description: 'Веер отрезков из центра и диагональные пересечения углов окна',
    inputText: `7
-4 -2 14 12
-4 12 14 -2
5 -5 5 15
-5 5 15 5
3 4 7 6
-3 1 3 -3
11 1 13 9
0 0 10 10`,
    subjectPolygon: [
      { x: -2, y: 5 },
      { x: 5, y: -3 },
      { x: 12, y: 5 },
      { x: 5, y: 13 },
    ],
    clipPolygon: [
      { x: 1, y: 1 },
      { x: 9, y: 1 },
      { x: 11, y: 5 },
      { x: 7, y: 10 },
      { x: 2, y: 9 },
    ],
  },
  {
    id: 'large-scale',
    name: 'Крупный масштаб (−120..120)',
    description: 'Проверка автоматического масштабирования системы координат',
    inputText: `5
-110 -80 110 90
-100 40 100 40
-30 -100 30 100
-20 10 40 30
70 -90 120 -20
-60 -50 60 50`,
    subjectPolygon: [
      { x: -90, y: -20 },
      { x: 0, y: -85 },
      { x: 95, y: 10 },
      { x: 40, y: 85 },
      { x: -70, y: 60 },
    ],
    clipPolygon: [
      { x: -60, y: -50 },
      { x: 60, y: -50 },
      { x: 75, y: 15 },
      { x: 0, y: 65 },
      { x: -70, y: 20 },
    ],
  },
]
