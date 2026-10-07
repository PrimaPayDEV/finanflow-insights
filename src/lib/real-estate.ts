import { supabase } from "@/integrations/supabase/client";

// Tipos
export type RealEstateProperty = {
  id: string;
  company_id: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  internal_id?: string;
  owner_id?: string;
  status: 'AVAILABLE' | 'RENTED' | 'INACTIVE';
  additional_info?: string;
  created_at: string;
};

export type RealEstateOwner = {
  id: string;
  company_id: string;
  name: string;
  document: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  asaas_customer_id?: string;
  asaas_wallet_id?: string;
  created_at: string;
};

export type RealEstateTenant = {
  id: string;
  company_id: string;
  name: string;
  document: string;
  phone?: string;
  email?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  asaas_customer_id?: string;
  created_at: string;
};

export type RealEstateContract = {
  id: string;
  company_id: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  rent_amount: number;
  periodicity: string;
  due_day: number;
  start_date: string;
  end_date: string;
  admin_fee_type: 'PERCENTAGE' | 'FIXED';
  admin_fee_value: number;
  status: 'DRAFT' | 'ACTIVE' | 'DEFAULTED' | 'FINISHED' | 'CANCELLED';
  created_at: string;
  properties?: RealEstateProperty;
  owners?: RealEstateOwner;
  tenants?: RealEstateTenant;
};

// Queries
export const propertiesQuery = {
  queryKey: ['real_estate_properties'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('real_estate_properties')
      .select('*, owners:owner_id (name, document)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }
};

export const ownersQuery = {
  queryKey: ['real_estate_owners'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('real_estate_owners')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data as RealEstateOwner[];
  }
};

export const tenantsQuery = {
  queryKey: ['real_estate_tenants'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('real_estate_tenants')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data as RealEstateTenant[];
  }
};

export const contractsQuery = {
  queryKey: ['real_estate_contracts'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('real_estate_contracts')
      .select('*, properties:property_id (address, number), owners:owner_id (name, asaas_wallet_id), tenants:tenant_id (name, asaas_customer_id)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }
};

export type RealEstateCharge = {
  id: string;
  company_id: string;
  contract_id: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  competence: string;
  due_date: string;
  gross_amount: number;
  admin_fee_amount: number;
  platform_fee_amount: number;
  owner_amount: number;
  expenses_amount: number;
  status: 'PENDING' | 'OVERDUE' | 'RECEIVED' | 'CANCELLED';
  asaas_invoice_id?: string;
  asaas_payment_url?: string;
  split_id?: string;
  created_at: string;
  contracts?: { periodicity: string };
  properties?: { address: string; number: string };
  owners?: { name: string };
  tenants?: { name: string };
};

export const chargesQuery = {
  queryKey: ['real_estate_charges'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('real_estate_charges')
      .select('*, contracts:contract_id(periodicity), properties:property_id(address, number), owners:owner_id(name), tenants:tenant_id(name)')
      .order('due_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data as RealEstateCharge[];
  }
};
