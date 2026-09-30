export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  sort: number;
};

export type Brand = {
  id: string;
  name_ar: string;
  name_en: string;
};

/** One row of `products.specs`: `[{ label: {ar,en}, value: {ar,en} }]`. */
export type SpecRow = {
  label: { ar?: string | null; en?: string | null };
  value: { ar?: string | null; en?: string | null };
};

export type Product = {
  id: number;
  name_ar: string;
  name_en: string;
  category_id: string;
  brand_id: string | null;
  image_path: string | null;
  description_ar: string | null;
  description_en: string | null;
  features_ar: string[];
  features_en: string[];
  specs: SpecRow[];
  created_at: string;
  updated_at: string;
};

/** Columns the public grid needs — the list query must never ask for more. */
export type ProductListRow = Pick<
  Product,
  "id" | "name_ar" | "name_en" | "category_id" | "brand_id" | "image_path"
>;

export type Admin = {
  user_id: string;
  created_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: {
          id: string;
          name_ar: string;
          name_en: string;
          sort?: number;
        };
        Update: Partial<Category>;
        Relationships: [];
      };
      brands: {
        Row: Brand;
        Insert: {
          id: string;
          name_ar: string;
          name_en: string;
        };
        Update: Partial<Brand>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: {
          id: number;
          name_ar: string;
          name_en: string;
          category_id: string;
          brand_id?: string | null;
          image_path?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          features_ar?: string[];
          features_en?: string[];
          specs?: SpecRow[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Product>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
        ];
      };
      admins: {
        Row: Admin;
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Admin>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums = never;

export type CompositeTypes = never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
