import { Drug } from './types';

export const INITIAL_INVENTORY: Drug[] = [
  { id: 'd1', name: 'Аспирин 500мг', stock: 100, requiresPrescription: false },
  { id: 'd2', name: 'Амоксициллин 250мг', stock: 20, requiresPrescription: true },
  { id: 'd3', name: 'Ибупрофен 400мг', stock: 50, requiresPrescription: false },
  { id: 'd4', name: 'Аторвастатин 10мг', stock: 15, requiresPrescription: true },
  { id: 'd5', name: 'Метформин 500мг', stock: 30, requiresPrescription: true },
  { id: 'd6', name: 'Витамин С 1000мг', stock: 200, requiresPrescription: false },
  { id: 'd7', name: 'Лизиноприл 10мг', stock: 10, requiresPrescription: true },
  { id: 'd8', name: 'Парацетамол 500мг', stock: 150, requiresPrescription: false },
  { id: 'd9', name: 'Кларитромицин 500мг', stock: 25, requiresPrescription: true },
  { id: 'd10', name: 'Азитромицин 500мг', stock: 40, requiresPrescription: true },
  { id: 'd11', name: 'Цитрамон П', stock: 200, requiresPrescription: false },
  { id: 'd12', name: 'Активированный уголь', stock: 300, requiresPrescription: false },
  { id: 'd13', name: 'Бисопролол 5мг', stock: 60, requiresPrescription: true },
  { id: 'd14', name: 'Нимесил 100мг', stock: 80, requiresPrescription: true },
  { id: 'd15', name: 'Панкреатин 25ЕД', stock: 120, requiresPrescription: false },
  { id: 'd16', name: 'Левотироксин 50мкг', stock: 45, requiresPrescription: true },
  { id: 'd17', name: 'Омепразол 20мг', stock: 90, requiresPrescription: false },
  { id: 'd18', name: 'Флуконазол 150мг', stock: 35, requiresPrescription: true },
];