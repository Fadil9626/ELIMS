// ===================================================
// 🧬 LAB CONFIG DATA TYPES
// ===================================================

export interface Unit {
    id: number;
    unit_name: string;
    symbol: string;
    description?: string;
    is_active?: boolean;
  }
  
  export interface Department {
    id: number;
    name: string;
    description?: string;
    is_active?: boolean;
  }
  
  export interface Test {
    id: number;
    test_name: string;
    price: number;
    is_active: boolean;
    unit_name?: string;
    unit_symbol?: string;
    department?: string;
    unit_id?: number;
    department_id?: number;
  }
  
  export type RangeType = "numeric" | "symbolic" | "qualitative";
  
  export interface NormalRange {
    id: number;
    test_id: number;
    range_type: RangeType;
    gender: "Male" | "Female" | "Any";
    age_min?: number | null;
    age_max?: number | null;
    unit_id?: number | null;
    min_value?: number | null;
    max_value?: number | null;
    symbol_operator?: string | null;
    qualitative_value?: string | null;
    note?: string | null;
    unit_name?: string | null;
  }
  