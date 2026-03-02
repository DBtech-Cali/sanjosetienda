export type Category = 'Bebida' | 'Mecato' | 'Dulces' | 'Sal' | 'Útiles';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  icon: string;
  stock?: number;
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  name: string;
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  timestamp: any; // Firestore timestamp
}

export interface SaleRecord {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: any; // Firestore timestamp
}
