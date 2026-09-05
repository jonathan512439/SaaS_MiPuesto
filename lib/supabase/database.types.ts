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
          sesion_id: string
          tipo: string
        }
        Insert: {
          creado_en?: string
          id?: string
          negocio_id: string
          producto_id?: string | null
          sesion_id: string
          tipo: string
        }
        Update: {
          creado_en?: string
          id?: string
          negocio_id?: string
          producto_id?: string | null
          sesion_id?: string
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
      limites_pedidos_ip: {
        Row: {
          cantidad: number
          huella_ip: string
          negocio_id: string
          ventana_inicio: string
        }
        Insert: {
          cantidad?: number
          huella_ip: string
          negocio_id: string
          ventana_inicio?: string
        }
        Update: {
          cantidad?: number
          huella_ip?: string
          negocio_id?: string
          ventana_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "limites_pedidos_ip_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          activo: boolean
          activo_actualizado_en: string | null
          activo_actualizado_por: string | null
          activo_anterior: boolean | null
          admin_user_id: string
          creado_en: string
          descripcion: string | null
          horario: Json
          id: string
          logo_url: string | null
          nombre: string
          paleta_id: string
          plantilla_id: string
          portada_url: string | null
          qr_pago_url: string | null
          redes_sociales: Json
          reserva_minutos: number
          slug: string
          suscripcion_vence_en: string
          suspendido_en: string | null
          telefono_whatsapp: string
          tipo_negocio: string
          ubicacion_url: string | null
          verificado: boolean
        }
        Insert: {
          activo?: boolean
          activo_actualizado_en?: string | null
          activo_actualizado_por?: string | null
          activo_anterior?: boolean | null
          admin_user_id: string
          creado_en?: string
          descripcion?: string | null
          horario?: Json
          id?: string
          logo_url?: string | null
          nombre: string
          paleta_id?: string
          plantilla_id?: string
          portada_url?: string | null
          qr_pago_url?: string | null
          redes_sociales?: Json
          reserva_minutos?: number
          slug: string
          suscripcion_vence_en?: string
          suspendido_en?: string | null
          telefono_whatsapp: string
          tipo_negocio: string
          ubicacion_url?: string | null
          verificado?: boolean
        }
        Update: {
          activo?: boolean
          activo_actualizado_en?: string | null
          activo_actualizado_por?: string | null
          activo_anterior?: boolean | null
          admin_user_id?: string
          creado_en?: string
          descripcion?: string | null
          horario?: Json
          id?: string
          logo_url?: string | null
          nombre?: string
          paleta_id?: string
          plantilla_id?: string
          portada_url?: string | null
          qr_pago_url?: string | null
          redes_sociales?: Json
          reserva_minutos?: number
          slug?: string
          suscripcion_vence_en?: string
          suspendido_en?: string | null
          telefono_whatsapp?: string
          tipo_negocio?: string
          ubicacion_url?: string | null
          verificado?: boolean
        }
        Relationships: []
      }
      pedido_items: {
        Row: {
          cantidad: number
          controla_stock: boolean
          creado_en: string
          id: string
          nombre: string
          pedido_id: string
          precio_unitario: number
          producto_codigo: string
          producto_id: string | null
          reserva_activa: boolean
          subtotal: number
        }
        Insert: {
          cantidad: number
          controla_stock: boolean
          creado_en?: string
          id?: string
          nombre: string
          pedido_id: string
          precio_unitario: number
          producto_codigo: string
          producto_id?: string | null
          reserva_activa?: boolean
          subtotal: number
        }
        Update: {
          cantidad?: number
          controla_stock?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          pedido_id?: string
          precio_unitario?: number
          producto_codigo?: string
          producto_id?: string | null
          reserva_activa?: boolean
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          actualizado_en: string
          cancelado_en: string | null
          cancelado_por: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          codigo: string
          confirmado_en: string | null
          confirmado_por: string | null
          creado_en: string
          estado: string
          expira_en: string | null
          id: string
          idempotencia: string
          items: Json
          negocio_id: string
          total: number
        }
        Insert: {
          actualizado_en?: string
          cancelado_en?: string | null
          cancelado_por?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          codigo?: string
          confirmado_en?: string | null
          confirmado_por?: string | null
          creado_en?: string
          estado?: string
          expira_en?: string | null
          id?: string
          idempotencia?: string
          items: Json
          negocio_id: string
          total: number
        }
        Update: {
          actualizado_en?: string
          cancelado_en?: string | null
          cancelado_por?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          codigo?: string
          confirmado_en?: string | null
          confirmado_por?: string | null
          creado_en?: string
          estado?: string
          expira_en?: string | null
          id?: string
          idempotencia?: string
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
          cantidad_reservada: number
          cantidad_stock: number | null
          categoria_id: string | null
          codigo: string
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
          precio_actualizado_en: string | null
          precio_actualizado_por: string | null
          precio_anterior: number | null
          reservado_hasta: string | null
          subcategoria_id: string | null
          texto_busqueda: string | null
          visible: boolean
        }
        Insert: {
          cantidad_reservada?: number
          cantidad_stock?: number | null
          categoria_id?: string | null
          codigo?: string
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
          precio_actualizado_en?: string | null
          precio_actualizado_por?: string | null
          precio_anterior?: number | null
          reservado_hasta?: string | null
          subcategoria_id?: string | null
          texto_busqueda?: string | null
          visible?: boolean
        }
        Update: {
          cantidad_reservada?: number
          cantidad_stock?: number | null
          categoria_id?: string | null
          codigo?: string
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
          precio_actualizado_en?: string | null
          precio_actualizado_por?: string | null
          precio_anterior?: number | null
          reservado_hasta?: string | null
          subcategoria_id?: string | null
          texto_busqueda?: string | null
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
      cambiar_estado_pedido_admin: {
        Args: {
          p_admin_user_id: string
          p_nuevo_estado: string
          p_pedido_id: string
        }
        Returns: Json
      }
      crear_pedido_reservado: {
        Args: {
          p_cliente_nombre: string
          p_cliente_telefono: string
          p_huella_ip: string
          p_idempotencia: string
          p_items: Json
          p_slug: string
        }
        Returns: Json
      }
      estado_tareas: {
        Args: never
        Returns: {
          atrasada: boolean
          minutos_desde: number
          nunca_corrio: boolean
          tarea: string
          tolerancia_minutos: number
          ultima_corrida: string
        }[]
      }
      expirar_reservas_vencidas: {
        Args: { p_limite?: number }
        Returns: number
      }
      purgar_analitica_vieja: { Args: { p_dias?: number }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slug_disponible: { Args: { p_slug: string }; Returns: boolean }
      suspender_suscripciones_vencidas: { Args: never; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
