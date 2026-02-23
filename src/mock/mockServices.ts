import type { Category } from '../types';

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-001',
    name: 'Auto & Mechanics',
    icon: 'car',
    color: '#E74C3C',
    subcategories: [
      { id: 'sub-001', categoryId: 'cat-001', name: 'Engine Repair' },
      { id: 'sub-002', categoryId: 'cat-001', name: 'Tire & Wheel Service' },
      { id: 'sub-003', categoryId: 'cat-001', name: 'Oil Change' },
      { id: 'sub-004', categoryId: 'cat-001', name: 'Auto Diagnostics' },
    ],
  },
  {
    id: 'cat-002',
    name: 'Cleaning',
    icon: 'sparkles',
    color: '#3498DB',
    subcategories: [
      { id: 'sub-005', categoryId: 'cat-002', name: 'Home Deep Clean' },
      { id: 'sub-006', categoryId: 'cat-002', name: 'Office Cleaning' },
      { id: 'sub-007', categoryId: 'cat-002', name: 'Move-In / Move-Out' },
      { id: 'sub-008', categoryId: 'cat-002', name: 'Carpet Cleaning' },
    ],
  },
  {
    id: 'cat-003',
    name: 'Plumbing',
    icon: 'droplets',
    color: '#1ABC9C',
    subcategories: [
      { id: 'sub-009', categoryId: 'cat-003', name: 'Leak Repair' },
      { id: 'sub-010', categoryId: 'cat-003', name: 'Drain Cleaning' },
      { id: 'sub-011', categoryId: 'cat-003', name: 'Water Heater' },
    ],
  },
  {
    id: 'cat-004',
    name: 'Electrical',
    icon: 'bolt',
    color: '#F39C12',
    subcategories: [
      { id: 'sub-012', categoryId: 'cat-004', name: 'Wiring & Installation' },
      { id: 'sub-013', categoryId: 'cat-004', name: 'Panel Upgrade' },
      { id: 'sub-014', categoryId: 'cat-004', name: 'EV Charging' },
    ],
  },
  {
    id: 'cat-005',
    name: 'Moving',
    icon: 'truck',
    color: '#9B59B6',
    subcategories: [
      { id: 'sub-015', categoryId: 'cat-005', name: 'Local Moving' },
      { id: 'sub-016', categoryId: 'cat-005', name: 'Long-Distance Moving' },
      { id: 'sub-017', categoryId: 'cat-005', name: 'Furniture Assembly' },
    ],
  },
  {
    id: 'cat-006',
    name: 'Beauty & Wellness',
    icon: 'heart',
    color: '#E91E63',
    subcategories: [
      { id: 'sub-018', categoryId: 'cat-006', name: 'Haircut & Styling' },
      { id: 'sub-019', categoryId: 'cat-006', name: 'Makeup & Beauty' },
      { id: 'sub-020', categoryId: 'cat-006', name: 'Massage Therapy' },
    ],
  },
  {
    id: 'cat-007',
    name: 'Tutoring & Education',
    icon: 'school',
    color: '#00B4D8',
    subcategories: [
      { id: 'sub-021', categoryId: 'cat-007', name: 'Math & Science' },
      { id: 'sub-022', categoryId: 'cat-007', name: 'Language Lessons' },
      { id: 'sub-023', categoryId: 'cat-007', name: 'Music Lessons' },
    ],
  },
  {
    id: 'cat-008',
    name: 'IT & Tech Support',
    icon: 'device-laptop',
    color: '#2C3E50',
    subcategories: [
      { id: 'sub-024', categoryId: 'cat-008', name: 'Computer Repair' },
      { id: 'sub-025', categoryId: 'cat-008', name: 'Network Setup' },
      { id: 'sub-026', categoryId: 'cat-008', name: 'Software Help' },
    ],
  },
];
