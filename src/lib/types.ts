export interface PrintFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface PrintOptions {
  colorMode: 'bw' | 'color';
  paperSize: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
  copies: number;
  doubleSided: boolean;
}

export interface Order {
  id: string;
  code: string; // e.g. "MX-A3K9"
  files: PrintFile[];
  printOptions: PrintOptions;
  paymentMethod: 'upi' | 'cash';
  paymentStatus: 'pending' | 'paid';
  orderStatus: 'pending' | 'printing' | 'completed';
  estimatedCost: number;
  createdAt: string;
}
