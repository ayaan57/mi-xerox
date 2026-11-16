import { PrintFile, PrintOptions } from './types';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateCode(): string {
  let code = 'MX-';
  for (let i = 0; i < 4; i++) {
    code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return code;
}

export function calculateCost(files: PrintFile[], options: PrintOptions): number {
  const baseRate = options.colorMode === 'color' ? 10 : 2; // ₹ per page
  const a3Surcharge = options.paperSize === 'A3' ? 3 : 0;  // ₹ per page
  const perPage = baseRate + a3Surcharge;
  // Assume 1 page per file
  const totalPages = files.length;
  return totalPages * perPage * options.copies;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${units[i]}`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'printing':
      return 'text-blue-600 bg-blue-50';
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'paid':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getPaperSizes(): { value: string; label: string }[] {
  return [
    { value: 'A4', label: 'A4 (210 × 297 mm)' },
    { value: 'A3', label: 'A3 (297 × 420 mm)' },
    { value: 'A5', label: 'A5 (148 × 210 mm)' },
    { value: 'Letter', label: 'Letter (8.5 × 11 in)' },
    { value: 'Legal', label: 'Legal (8.5 × 14 in)' },
  ];
}
