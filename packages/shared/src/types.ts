// Shared TypeScript types for Vatsin Granite ERP

export interface Organization {
  id: number;
  orgCode: string;
  orgName: string;
  pan?: string;
  gstin?: string;
  active: boolean;
}

export interface Quarry {
  id: number;
  orgId: number;
  quarryCode: string;
  quarryName: string;
  mineralType: string;
  district: string;
  state: string;
  operationalStatus: string;
  active: boolean;
}

export interface Block {
  id: number;
  orgId: number;
  quarryId: number;
  blockNo: string;
  varietyId: number;
  grade: string;
  color: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  grossCbm: number;
  netCbm: number;
  status: 'available' | 'reserved' | 'sold' | 'dispatched';
  currentLocationId?: number;
  qrCode?: string;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  orgId: number;
  roles: string[];
}
