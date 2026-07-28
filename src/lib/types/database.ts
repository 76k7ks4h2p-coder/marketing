/**
 * Supabase のスキーマ型。
 *
 * supabase/migrations/ の SQL と 1:1 で対応させて手書きしている。
 * Supabase CLI で再生成する場合は次を実行する（生成結果でこのファイルを置き換える）:
 *
 *   pnpm dlx supabase gen types typescript --local > src/lib/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: string
          full_name: string | null
          phone: string | null
          organization_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: string
          full_name?: string | null
          phone?: string | null
          organization_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          organization_name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          owner_id: string
          name: string
          postal_code: string
          prefecture: string
          city: string
          address_line1: string
          address_line2: string | null
          property_type: string
          building_structure: string | null
          built_year: number | null
          unit_count: number | null
          area_sqm: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          postal_code: string
          prefecture: string
          city: string
          address_line1: string
          address_line2?: string | null
          property_type: string
          building_structure?: string | null
          built_year?: number | null
          unit_count?: number | null
          area_sqm?: number | null
          notes?: string | null
        }
        Update: {
          name?: string
          postal_code?: string
          prefecture?: string
          city?: string
          address_line1?: string
          address_line2?: string | null
          property_type?: string
          building_structure?: string | null
          built_year?: number | null
          unit_count?: number | null
          area_sqm?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'properties_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      service_requests: {
        Row: {
          id: string
          request_number: string
          owner_id: string
          property_id: string
          category: string
          target_location: string | null
          title: string
          description: string
          urgency: string
          preferred_timing: string | null
          budget_min_yen: number | null
          budget_max_yen: number | null
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          /** BEFORE INSERT トリガーがサーバー側で採番するため、クライアントからは指定しない。 */
          request_number?: string
          owner_id: string
          property_id: string
          category: string
          target_location?: string | null
          title: string
          description: string
          urgency: string
          preferred_timing?: string | null
          budget_min_yen?: number | null
          budget_max_yen?: number | null
          status?: string
          admin_notes?: string | null
        }
        Update: {
          category?: string
          target_location?: string | null
          title?: string
          description?: string
          urgency?: string
          preferred_timing?: string | null
          budget_min_yen?: number | null
          budget_max_yen?: number | null
          status?: string
          admin_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'service_requests_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
      }
      request_files: {
        Row: {
          id: string
          request_id: string
          uploaded_by: string
          storage_path: string
          original_name: string
          mime_type: string
          file_size: number
          file_kind: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          uploaded_by: string
          storage_path: string
          original_name: string
          mime_type: string
          file_size: number
          file_kind: string
        }
        Update: {
          original_name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'request_files_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'request_files_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      providers: {
        Row: {
          id: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          service_areas: string[] | null
          service_categories: string[] | null
          licenses: string | null
          has_liability_insurance: boolean | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          service_areas?: string[] | null
          service_categories?: string[] | null
          licenses?: string | null
          has_liability_insurance?: boolean | null
          notes?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          service_areas?: string[] | null
          service_categories?: string[] | null
          licenses?: string | null
          has_liability_insurance?: boolean | null
          notes?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          request_id: string
          provider_id: string
          quote_number: string | null
          quote_date: string | null
          valid_until: string | null
          available_date: string | null
          estimated_work_days: number | null
          subtotal_yen: number | null
          tax_yen: number | null
          total_yen: number
          included_scope: string | null
          excluded_scope: string | null
          additional_charge_conditions: string | null
          warranty: string | null
          admin_comment: string | null
          publication_status: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          provider_id: string
          quote_number?: string | null
          quote_date?: string | null
          valid_until?: string | null
          available_date?: string | null
          estimated_work_days?: number | null
          subtotal_yen?: number | null
          tax_yen?: number | null
          total_yen: number
          included_scope?: string | null
          excluded_scope?: string | null
          additional_charge_conditions?: string | null
          warranty?: string | null
          admin_comment?: string | null
          publication_status?: string
          created_by: string
        }
        Update: {
          provider_id?: string
          quote_number?: string | null
          quote_date?: string | null
          valid_until?: string | null
          available_date?: string | null
          estimated_work_days?: number | null
          subtotal_yen?: number | null
          tax_yen?: number | null
          total_yen?: number
          included_scope?: string | null
          excluded_scope?: string | null
          additional_charge_conditions?: string | null
          warranty?: string | null
          admin_comment?: string | null
          publication_status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'quotes_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_provider_id_fkey'
            columns: ['provider_id']
            isOneToOne: false
            referencedRelation: 'providers'
            referencedColumns: ['id']
          },
        ]
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          item_name: string
          quantity: number | null
          unit: string | null
          unit_price_yen: number | null
          amount_yen: number
          notes: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          quote_id: string
          item_name: string
          quantity?: number | null
          unit?: string | null
          unit_price_yen?: number | null
          amount_yen: number
          notes?: string | null
          sort_order?: number
        }
        Update: {
          item_name?: string
          quantity?: number | null
          unit?: string | null
          unit_price_yen?: number | null
          amount_yen?: number
          notes?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'quote_items_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
        ]
      }
      quote_selections: {
        Row: {
          id: string
          request_id: string
          quote_id: string
          owner_id: string
          selected_at: string
        }
        Insert: {
          id?: string
          request_id: string
          quote_id: string
          owner_id: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'quote_selections_request_id_fkey'
            columns: ['request_id']
            isOneToOne: true
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quote_selections_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
        ]
      }
      work_reports: {
        Row: {
          id: string
          request_id: string
          completion_summary: string
          completed_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          completion_summary: string
          completed_at?: string | null
          created_by: string
        }
        Update: {
          completion_summary?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'work_reports_request_id_fkey'
            columns: ['request_id']
            isOneToOne: true
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      /**
       * オーナー向けの安全な業者ビュー。
       * 電話番号・メールアドレス・内部メモは列自体が存在しない。
       */
      provider_public: {
        Row: {
          id: string | null
          name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      select_quote: {
        Args: { p_request_id: string; p_quote_id: string }
        Returns: {
          id: string
          request_id: string
          quote_id: string
          owner_id: string
          selected_at: string
        }
      }
      admin_request_owner_email: {
        Args: { p_request_id: string }
        Returns: string | null
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_owner: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// -----------------------------------------------------------------------------
// 行型のショートハンド
// -----------------------------------------------------------------------------

type PublicTables = Database['public']['Tables']

export type ProfileRow = PublicTables['profiles']['Row']
export type PropertyRow = PublicTables['properties']['Row']
export type ServiceRequestRow = PublicTables['service_requests']['Row']
export type RequestFileRow = PublicTables['request_files']['Row']
export type ProviderRow = PublicTables['providers']['Row']
export type QuoteRow = PublicTables['quotes']['Row']
export type QuoteItemRow = PublicTables['quote_items']['Row']
export type QuoteSelectionRow = PublicTables['quote_selections']['Row']
export type WorkReportRow = PublicTables['work_reports']['Row']

export type ProviderPublicRow = Database['public']['Views']['provider_public']['Row']
