import Dexie, { Table } from 'dexie';
import { ItemCategory } from '../data/masterItems';

export interface BusinessProfile {
  id?: number;
  name: string;
  tagline: string;
  ownerName: string;
  phone1: string;
  phone2: string;
  address: string;
  logoUri: string;
}

export interface Order {
  id?: number;
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  eventType: string;
  eventDate: string;
  notes: string;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id?: number;
  orderId: number;
  itemKey: string;
  itemNameGu: string;
  itemNameEn: string;
  category: ItemCategory;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  kg: number;
  gram: number;
  isCustom: number;
  sortOrder: number;
}

export interface CustomItem {
  id?: number;
  itemKey: string;
  itemNameGu: string;
  itemNameEn: string;
  category: ItemCategory;
  createdAt: string;
}

export class CaterBillDB extends Dexie {
  businessProfile!: Table<BusinessProfile, number>;
  orders!: Table<Order, number>;
  orderItems!: Table<OrderItem, number>;
  customItems!: Table<CustomItem, number>;

  constructor() {
    super('CaterBillDB');
    this.version(1).stores({
      businessProfile: '++id',
      orders: '++id, orderNumber, customerName, eventDate, status',
      orderItems: '++id, orderId, itemKey, category, timeSlot',
      customItems: '++id, itemKey, category',
    });

    // v2 adds missing indexes used by Home/NewOrder queries.
    this.version(2).stores({
      businessProfile: '++id',
      orders:
        '++id, orderNumber, customerName, eventDate, status, createdAt, updatedAt',
      orderItems: '++id, orderId, itemKey, category, timeSlot',
      customItems: '++id, itemKey, category',
    });

    // v3 adds optimized compound index for OrderQuantities queries
    this.version(3).stores({
      businessProfile: '++id',
      orders:
        '++id, orderNumber, customerName, eventDate, status, createdAt, updatedAt',
      orderItems: '++id, [orderId+timeSlot], orderId, itemKey, category, timeSlot',
      customItems: '++id, itemKey, category',
    });
  }
}

export const db = new CaterBillDB();

export const initDb = async () => {
  const count = await db.businessProfile.count();
  if (count === 0) {
    await db.businessProfile.add({
      name: 'શ્રી ઉમિયા કેટર્સ',
      tagline: 'લેબત કામ કેટર્સ તથા મજૂરીથી રસોઈ બનાવનાર',
      ownerName: '',
      phone1: '',
      phone2: '',
      address: '',
      logoUri: '',
    });
  }
};
