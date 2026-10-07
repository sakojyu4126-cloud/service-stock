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
  category?: string; // ①衛生用品-1（日常業務用）, ②衛生用品-2（BCP感染症対策）, ③消耗品類（洗剤など）, ④デイサービス
  location: string;
  manager: string;
  notes: string;
  alertDismissed: boolean;
}

export interface StaffWithdrawal {
  id: string;
  date: string;
  office: string; // サ高住, ヘルパーステーション, デイサービス
  category: string;
  itemName: string;
  quantity: number;
  staffName: string;
}

export type ActiveTab = 'helper' | 'helper2' | 'billing' | 'stockpile' | 'history';
