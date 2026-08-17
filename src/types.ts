export interface Product {
  id: string;
  maker: string;
  category: string;
  name: string;
  capacity: string;
  size: string;
  priceInclTax: number;
  priceExclTax: number;
  sellingPrice: number;
  currentStock?: number; // Real-time stock for diapers and hygiene products
}

export interface Withdrawal {
  id: string;
  date: string;
  userName: string;
  staffName: string;
  productId: string;
  product: Product;
  quantity: number;
  billingMonth: string;
  status: 'unbilled' | 'billed';
  billedDate: string | null;
}

export interface Stockpile {
  id: string;
  name: string;
  currentStock: number;
  requiredStock: number;
  unit: string;
  location: string;
  manager: string;
  notes: string;
  alertDismissed: boolean;
}

export type ActiveTab = 'helper' | 'helper2' | 'billing' | 'stockpile';
