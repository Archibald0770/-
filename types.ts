export interface Drug {
  id: string;
  name: string;
  stock: number;
  requiresPrescription: boolean;
}

export interface OrderItem {
  id: string;
  drugId: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  orderDate: string; // ISO Date string YYYY-MM-DD
  prescriptionForDrugIds: string[]; // IDs of the drugs the customer has prescriptions for
  items: OrderItem[];
}

export interface ValidationResult {
  success: boolean;
  message?: string;
}