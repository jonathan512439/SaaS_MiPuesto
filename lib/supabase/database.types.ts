export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          orden: number
        }
        Insert: {
          id?: string
          negocio_id: string
          nombre: string
          orden?: number
        }
        Update: {
          id?: string
          negocio_id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "categorias_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_analitica: {
        Row: {
          creado_en: string
          id: string
          negocio_id: string
          producto_id: string | null
          tipo: string
        }
        Insert: {
          creado_en?: string
          id?: string
          negocio_id: string
          producto_id?: string | null
          tipo: string
        }
        Update: {
          creado_en?: string
          id?: string
          negocio_id?: string
          producto_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_analitica_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_analitica_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          activo: boolean
          admin_user_id: string
          creado_en: string
          descripcion: string | null
          horario: Json
          id: string
          logo_url: string | null
          nombre: string
          plantilla_id: string
          portada_url: string | null
          qr_pago_url: string | null
          redes_sociales: Json
          reserva_minutos: number
          slug: string
          telefono_whatsapp: string
          tipo_negocio: string
          verificado: boolean
        }
        Insert: {
          activo?: boolean
          admin_user_id: string
          creado_en?: string
          descripcion?: string | null
          horario?: Json
          id?: string
          logo_url?: string | null
          nombre: string
          plantilla_id?: string
          portada_url?: string | null
          qr_pago_url?: string | null
          redes_sociales?: Json
          reserva_minutos?: number
          slug: string
          telefono_whatsapp: string
          tipo_negocio: string
          verificado?: boolean
        }
        Update: {
          activo?: boolean
          admin_user_id?: string
          creado_en?: string
          descripcion?: string | null
          horario?: Json
          id?: string
          logo_url?: string | null
          nombre?: string
          plantilla_id?: string
          portada_url?: string | null
          qr_pago_url?: string | null
          redes_sociales?: Json
          reserva_minutos?: number
          slug?: string
          telefono_whatsapp?: string
          tipo_negocio?: string
          verificado?: boolean
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          cliente_nombre: string | null
          cliente_telefono: string | null
          creado_en: string
          estado: string
          expira_en: string | null
          id: string
          items: Json
          negocio_id: string
          total: number
        }
        Insert: {
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          creado_en?: string
          estado?: string
          expira_en?: string | null
          id?: string
          items: Json
          negocio_id: string
          total: number
        }
        Update: {
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          creado_en?: string
          estado?: string
          expira_en?: string | null
          id?: string
          items?: Json
          negocio_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          cantidad_stock: number | null
          categoria_id: string | null
          controla_stock: boolean
          creado_en: string
          descripcion: string | null
          estado: string
          fotos: string[]
          id: string
          negocio_id: string
          nombre: string
          orden: number
          precio: number
          reservado_hasta: string | null
          subcategoria_id: string | null
          visible: boolean
        }
        Insert: {
          cantidad_stock?: number | null
          categoria_id?: string | null
          controla_stock?: boolean
          creado_en?: string
          descripcion?: string | null
          estado?: string
          fotos?: string[]
          id?: string
          negocio_id: string
          nombre: string
          orden?: number
          precio: number
          reservado_hasta?: string | null
          subcategoria_id?: string | null
          visible?: boolean
        }
        Update: {
          cantidad_stock?: number | null
          categoria_id?: string | null
          controla_stock?: boolean
          creado_en?: string
          descripcion?: string | null
          estado?: string
          fotos?: string[]
          id?: string
          negocio_id?: string
          nombre?: string
          orden?: number
          precio?: number
          reservado_hasta?: string | null
          subcategoria_id?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      promociones: {
        Row: {
          activo: boolean
          categoria_id: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          negocio_id: string
          producto_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          negocio_id: string
          producto_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          negocio_id?: string
          producto_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "promociones_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promociones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategorias: {
        Row: {
          categoria_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          categoria_id: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          categoria_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      slug_disponible: { Args: { p_slug: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
