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
  pdfColor: string;
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

export interface CustomCategory {
  id?: number;
  categoryKeyGu: string;
  categoryLabelGu: string;
  categoryLabelEn: string;
  isBuiltIn: boolean;
  createdAt: string;
}

export class CaterBillDB extends Dexie {
  businessProfile!: Table<BusinessProfile, number>;
  orders!: Table<Order, number>;
  orderItems!: Table<OrderItem, number>;
  customItems!: Table<CustomItem, number>;
  customCategories!: Table<CustomCategory, number>;

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

    // v4 adds pdfColor for customizing PDF header color
    this.version(4).stores({
      businessProfile: '++id',
      orders:
        '++id, orderNumber, customerName, eventDate, status, createdAt, updatedAt',
      orderItems: '++id, [orderId+timeSlot], orderId, itemKey, category, timeSlot',
      customItems: '++id, itemKey, category',
    });

    // v5 adds customCategories table for user-created item categories
    this.version(5).stores({
      businessProfile: '++id',
      orders:
        '++id, orderNumber, customerName, eventDate, status, createdAt, updatedAt',
      orderItems: '++id, [orderId+timeSlot], orderId, itemKey, category, timeSlot',
      customItems: '++id, itemKey, category',
      customCategories: '++id, categoryKeyGu, createdAt',
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
      pdfColor: '#8B0000',
    });
  } else {
    // Ensure existing profiles have pdfColor field
    const profile = await db.businessProfile.toCollection().first();
    if (profile && !profile.pdfColor) {
      await db.businessProfile.update(profile.id || 1, { pdfColor: '#8B0000' });
    }
  }

  // Clean up duplicate categories and initialize with fresh built-in set
  try {
    const allCategories = await db.customCategories.toArray();
    
    // Separate built-in and custom categories
    const builtInCategories = allCategories.filter(c => c.isBuiltIn);
    const customCategories = allCategories.filter(c => !c.isBuiltIn);

    // Delete ALL built-in categories (removes all duplicates)
    for (const category of builtInCategories) {
      if (category.id) {
        await db.customCategories.delete(category.id);
      }
    }

    // Define fresh built-in categories
    const defaultCategories: CustomCategory[] = [
      { categoryKeyGu: 'લોટ_અને_બેસન', categoryLabelGu: 'લોટ અને બેસન', categoryLabelEn: 'Flour & Besan', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'મસાલા', categoryLabelGu: 'મસાલા', categoryLabelEn: 'Spices', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'કઠોળ_અને_દાળ', categoryLabelGu: 'કઠોળ અને દાળ', categoryLabelEn: 'Beans & Lentils', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'શાકભાજી', categoryLabelGu: 'શાકભાજી', categoryLabelEn: 'Vegetables', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'ફળ', categoryLabelGu: 'ફળ', categoryLabelEn: 'Fruits', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'ડ્રાયફ્રૂટ', categoryLabelGu: 'ડ્રાયફ્રૂટ', categoryLabelEn: 'Dry Fruits', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'ઘી_અને_તેલ', categoryLabelGu: 'ઘી અને તેલ', categoryLabelEn: 'Ghee & Oil', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'ડેરી', categoryLabelGu: 'ડેરી', categoryLabelEn: 'Dairy', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'મીઠાઈ_સામગ્રી', categoryLabelGu: 'મીઠાઈ સામગ્રી', categoryLabelEn: 'Sweets Materials', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'વાસણો', categoryLabelGu: 'વાસણો', categoryLabelEn: 'Utensils', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'ડીસ્પોઝેબલ', categoryLabelGu: 'ડીસ્પોઝેબલ', categoryLabelEn: 'Disposable', isBuiltIn: true, createdAt: new Date().toISOString() },
      { categoryKeyGu: 'અન્ય', categoryLabelGu: 'અન્ય', categoryLabelEn: 'Others', isBuiltIn: true, createdAt: new Date().toISOString() },
    ];
    
    // Add fresh built-in categories
    await db.customCategories.bulkAdd(defaultCategories);
    
    console.log(`✓ Categories cleaned & rebuilt. Built-in: ${defaultCategories.length}, Custom: ${customCategories.length}`);
  } catch (error) {
    console.error('Error initializing categories:', error);
  }
};
