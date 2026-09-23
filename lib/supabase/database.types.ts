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
      agenda_recurso: {
        Row: {
          actualizado_en: string
          anticipacion_minima_horas: number
          cupo_por_franja: number
          dias_maximos: number
          duracion_minutos: number
          franjas: Json
          negocio_id: string
          recurso_id: string
        }
        Insert: {
          actualizado_en?: string
          anticipacion_minima_horas?: number
          cupo_por_franja?: number
          dias_maximos?: number
          duracion_minutos?: number
          franjas?: Json
          negocio_id: string
          recurso_id: string
        }
        Update: {
          actualizado_en?: string
          anticipacion_minima_horas?: number
          cupo_por_franja?: number
          dias_maximos?: number
          duracion_minutos?: number
          franjas?: Json
          negocio_id?: string
          recurso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_recurso_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_recurso_padre"
            columns: ["recurso_id", "negocio_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id", "negocio_id"]
          },
        ]
      }
      atributos_categoria: {
        Row: {
          categoria_id: string
          clave: string
          creado_en: string
          en_resumen: boolean
          en_tarjeta: boolean
          id: string
          negocio_id: string
          nombre: string
          obligatorio: boolean
          opciones: string[]
          orden: number
          tipo: string
          unidad: string | null
        }
        Insert: {
          categoria_id: string
          clave: string
          creado_en?: string
          en_resumen?: boolean
          en_tarjeta?: boolean
          id?: string
          negocio_id: string
          nombre: string
          obligatorio?: boolean
          opciones?: string[]
          orden?: number
          tipo: string
          unidad?: string | null
        }
        Update: {
          categoria_id?: string
          clave?: string
          creado_en?: string
          en_resumen?: boolean
          en_tarjeta?: boolean
          id?: string
          negocio_id?: string
          nombre?: string
          obligatorio?: boolean
          opciones?: string[]
          orden?: number
          tipo?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atributos_categoria_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atributos_categoria_padre"
            columns: ["categoria_id", "negocio_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id", "negocio_id"]
          },
        ]
      }
      bitacora_plataforma: {
        Row: {
          accion: string
          actor: string
          creado_en: string
          detalle: Json
          id: string
          negocio_id: string | null
        }
        Insert: {
          accion: string
          actor: string
          creado_en?: string
          detalle?: Json
          id?: string
          negocio_id?: string | null
        }
        Update: {
          accion?: string
          actor?: string
          creado_en?: string
          detalle?: Json
          id?: string
          negocio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bitacora_plataforma_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      busquedas_sin_resultado: {
        Row: {
          cantidad: number
          ciudad: string
          termino: string
          ultima_vez: string
        }
        Insert: {
          cantidad?: number
          ciudad?: string
          termino: string
          ultima_vez?: string
        }
        Update: {
          cantidad?: number
          ciudad?: string
          termino?: string
          ultima_vez?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          icono: string
          id: string
          negocio_id: string
          nombre: string
          orden: number
          vende: string
          visible: boolean
        }
        Insert: {
          icono?: string
          id?: string
          negocio_id: string
          nombre: string
          orden?: number
          vende?: string
          visible?: boolean
        }
        Update: {
          icono?: string
          id?: string
          negocio_id?: string
          nombre?: string
          orden?: number
          vende?: string
          visible?: boolean
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
      citas: {
        Row: {
          cancelado_en: string | null
          categoria_id: string | null
          codigo: string
          creado_en: string
          cupo: number
          estado: string
          id: string
          idempotencia: string
          negocio_id: string
          nombre_cliente: string
          nota: string | null
          nota_interna: string | null
          origen: string
          producto_id: string | null
          rango: unknown
          recurso_id: string
          telefono_cliente: string | null
        }
        Insert: {
          cancelado_en?: string | null
          categoria_id?: string | null
          codigo?: string
          creado_en?: string
          cupo?: number
          estado?: string
          id?: string
          idempotencia?: string
          negocio_id: string
          nombre_cliente: string
          nota?: string | null
          nota_interna?: string | null
          origen?: string
          producto_id?: string | null
          rango: unknown
          recurso_id: string
          telefono_cliente?: string | null
        }
        Update: {
          cancelado_en?: string | null
          categoria_id?: string | null
          codigo?: string
          creado_en?: string
          cupo?: number
          estado?: string
          id?: string
          idempotencia?: string
          negocio_id?: string
          nombre_cliente?: string
          nota?: string | null
          nota_interna?: string | null
          origen?: string
          producto_id?: string | null
          rango?: unknown
          recurso_id?: string
          telefono_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_categoria_padre"
            columns: ["categoria_id", "negocio_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id", "negocio_id"]
          },
          {
            foreignKeyName: "citas_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_padre"
            columns: ["producto_id", "negocio_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id", "negocio_id"]
          },
          {
            foreignKeyName: "citas_recurso_padre"
            columns: ["recurso_id", "negocio_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id", "negocio_id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          codigo: string
          creado_en: string
          negocio_id: string | null
          nota: string | null
          reasignado_en: string | null
          ultimo_uso_en: string | null
        }
        Insert: {
          codigo: string
          creado_en?: string
          negocio_id?: string | null
          nota?: string | null
          reasignado_en?: string | null
          ultimo_uso_en?: string | null
        }
        Update: {
          codigo?: string
          creado_en?: string
          negocio_id?: string | null
          nota?: string | null
          reasignado_en?: string | null
          ultimo_uso_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etiquetas_negocio_id_fkey"
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
      limites_analitica_ip: {
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
            foreignKeyName: "limites_analitica_ip_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
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
      llamadas_ia: {
        Row: {
          creado_en: string
          exito: boolean
          herramienta: string
          id: number
          negocio_id: string | null
          tokens: number
        }
        Insert: {
          creado_en?: string
          exito: boolean
          herramienta: string
          id?: never
          negocio_id?: string | null
          tokens?: number
        }
        Update: {
          creado_en?: string
          exito?: boolean
          herramienta?: string
          id?: never
          negocio_id?: string | null
          tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "llamadas_ia_negocio_id_fkey"
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
          alta_completada_en: string | null
          alta_paso: number
          aparece_en_directorio: boolean | null
          banners: Json
          ciudad: string | null
          creado_en: string
          descripcion: string | null
          direccion_manual: string | null
          forma_tarjeta: string
          foto_ia_habilitada: boolean
          foto_ia_habilitada_en: string | null
          horario: Json
          id: string
          logo_url: string | null
          maps_calificacion: number | null
          maps_consultado_en: string | null
          maps_direccion: string | null
          maps_nombre: string | null
          maps_opiniones: number | null
          maps_place_id: string | null
          maps_visible: boolean
          nombre: string
          nombre_admin: string | null
          paleta_id: string
          patron_fondo: boolean
          patron_opacidad: number
          pide_numero_mesa: boolean
          plan_id: string
          portada_texto: Json
          portada_url: string | null
          qr_pago_url: string | null
          redes_sociales: Json
          resenas_url: string | null
          reserva_minutos: number
          rubro: string | null
          rubro_bloqueado_en: string | null
          rubro_publico: string | null
          rubros_secundarios: string[]
          slug: string
          subnombre: string | null
          suscripcion_vence_en: string
          suspendido_en: string | null
          telefono_whatsapp: string
          tipo_negocio: string
          ubicacion_lat: number | null
          ubicacion_lng: number | null
          ubicacion_url: string | null
          verificado: boolean
          zona: string | null
          zona_id: string | null
          zona_propuesta: string | null
        }
        Insert: {
          activo?: boolean
          activo_actualizado_en?: string | null
          activo_actualizado_por?: string | null
          activo_anterior?: boolean | null
          admin_user_id: string
          alta_completada_en?: string | null
          alta_paso?: number
          aparece_en_directorio?: boolean | null
          banners?: Json
          ciudad?: string | null
          creado_en?: string
          descripcion?: string | null
          direccion_manual?: string | null
          forma_tarjeta?: string
          foto_ia_habilitada?: boolean
          foto_ia_habilitada_en?: string | null
          horario?: Json
          id?: string
          logo_url?: string | null
          maps_calificacion?: number | null
          maps_consultado_en?: string | null
          maps_direccion?: string | null
          maps_nombre?: string | null
          maps_opiniones?: number | null
          maps_place_id?: string | null
          maps_visible?: boolean
          nombre: string
          nombre_admin?: string | null
          paleta_id?: string
          patron_fondo?: boolean
          patron_opacidad?: number
          pide_numero_mesa?: boolean
          plan_id?: string
          portada_texto?: Json
          portada_url?: string | null
          qr_pago_url?: string | null
          redes_sociales?: Json
          resenas_url?: string | null
          reserva_minutos?: number
          rubro?: string | null
          rubro_bloqueado_en?: string | null
          rubro_publico?: string | null
          rubros_secundarios?: string[]
          slug: string
          subnombre?: string | null
          suscripcion_vence_en?: string
          suspendido_en?: string | null
          telefono_whatsapp: string
          tipo_negocio: string
          ubicacion_lat?: number | null
          ubicacion_lng?: number | null
          ubicacion_url?: string | null
          verificado?: boolean
          zona?: string | null
          zona_id?: string | null
          zona_propuesta?: string | null
        }
        Update: {
          activo?: boolean
          activo_actualizado_en?: string | null
          activo_actualizado_por?: string | null
          activo_anterior?: boolean | null
          admin_user_id?: string
          alta_completada_en?: string | null
          alta_paso?: number
          aparece_en_directorio?: boolean | null
          banners?: Json
          ciudad?: string | null
          creado_en?: string
          descripcion?: string | null
          direccion_manual?: string | null
          forma_tarjeta?: string
          foto_ia_habilitada?: boolean
          foto_ia_habilitada_en?: string | null
          horario?: Json
          id?: string
          logo_url?: string | null
          maps_calificacion?: number | null
          maps_consultado_en?: string | null
          maps_direccion?: string | null
          maps_nombre?: string | null
          maps_opiniones?: number | null
          maps_place_id?: string | null
          maps_visible?: boolean
          nombre?: string
          nombre_admin?: string | null
          paleta_id?: string
          patron_fondo?: boolean
          patron_opacidad?: number
          pide_numero_mesa?: boolean
          plan_id?: string
          portada_texto?: Json
          portada_url?: string | null
          qr_pago_url?: string | null
          redes_sociales?: Json
          resenas_url?: string | null
          reserva_minutos?: number
          rubro?: string | null
          rubro_bloqueado_en?: string | null
          rubro_publico?: string | null
          rubros_secundarios?: string[]
          slug?: string
          subnombre?: string | null
          suscripcion_vence_en?: string
          suspendido_en?: string | null
          telefono_whatsapp?: string
          tipo_negocio?: string
          ubicacion_lat?: number | null
          ubicacion_lng?: number | null
          ubicacion_url?: string | null
          verificado?: boolean
          zona?: string | null
          zona_id?: string | null
          zona_propuesta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negocios_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas"
            referencedColumns: ["id"]
          },
        ]
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
          numero_mesa: string | null
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
          numero_mesa?: string | null
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
          numero_mesa?: string | null
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
      plataforma_admins: {
        Row: {
          creado_en: string
          nota: string | null
          user_id: string
        }
        Insert: {
          creado_en?: string
          nota?: string | null
          user_id: string
        }
        Update: {
          creado_en?: string
          nota?: string | null
          user_id?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          atributos: Json
          cantidad_reservada: number
          cantidad_stock: number | null
          categoria_id: string | null
          codigo: string
          controla_stock: boolean
          creado_en: string
          descripcion: string | null
          duracion_minutos: number | null
          eliminado_en: string | null
          en_carta_hasta: string | null
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
          recurso_id: string | null
          reservado_hasta: string | null
          subcategoria_id: string | null
          texto_busqueda: string | null
          visible: boolean
        }
        Insert: {
          atributos?: Json
          cantidad_reservada?: number
          cantidad_stock?: number | null
          categoria_id?: string | null
          codigo?: string
          controla_stock?: boolean
          creado_en?: string
          descripcion?: string | null
          duracion_minutos?: number | null
          eliminado_en?: string | null
          en_carta_hasta?: string | null
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
          recurso_id?: string | null
          reservado_hasta?: string | null
          subcategoria_id?: string | null
          texto_busqueda?: string | null
          visible?: boolean
        }
        Update: {
          atributos?: Json
          cantidad_reservada?: number
          cantidad_stock?: number | null
          categoria_id?: string | null
          codigo?: string
          controla_stock?: boolean
          creado_en?: string
          descripcion?: string | null
          duracion_minutos?: number | null
          eliminado_en?: string | null
          en_carta_hasta?: string | null
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
          recurso_id?: string | null
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
            foreignKeyName: "productos_recurso"
            columns: ["recurso_id", "negocio_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id", "negocio_id"]
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
          dias: number[] | null
          fecha_fin: string | null
          fecha_inicio: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          negocio_id: string
          producto_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          dias?: number[] | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          negocio_id: string
          producto_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          dias?: number[] | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
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
      recursos: {
        Row: {
          acepta_reservas: boolean
          activo: boolean
          creado_en: string
          id: string
          negocio_id: string
          nombre: string
          orden: number
        }
        Insert: {
          acepta_reservas?: boolean
          activo?: boolean
          creado_en?: string
          id?: string
          negocio_id: string
          nombre: string
          orden?: number
        }
        Update: {
          acepta_reservas?: boolean
          activo?: boolean
          creado_en?: string
          id?: string
          negocio_id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "recursos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      sinonimos_busqueda: {
        Row: {
          creado_en: string
          equivalentes: string[]
          termino: string
        }
        Insert: {
          creado_en?: string
          equivalentes: string[]
          termino: string
        }
        Update: {
          creado_en?: string
          equivalentes?: string[]
          termino?: string
        }
        Relationships: []
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
      uso_ia_negocio: {
        Row: {
          cantidad: number
          cantidad_dia: number
          dia: string | null
          mes: string
          negocio_id: string
        }
        Insert: {
          cantidad?: number
          cantidad_dia?: number
          dia?: string | null
          mes: string
          negocio_id: string
        }
        Update: {
          cantidad?: number
          cantidad_dia?: number
          dia?: string | null
          mes?: string
          negocio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uso_ia_negocio_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      variantes_producto: {
        Row: {
          cantidad_stock: number | null
          creado_en: string
          id: string
          negocio_id: string
          nombre: string
          orden: number
          precio: number | null
          producto_id: string
          visible: boolean
        }
        Insert: {
          cantidad_stock?: number | null
          creado_en?: string
          id?: string
          negocio_id: string
          nombre: string
          orden?: number
          precio?: number | null
          producto_id: string
          visible?: boolean
        }
        Update: {
          cantidad_stock?: number | null
          creado_en?: string
          id?: string
          negocio_id?: string
          nombre?: string
          orden?: number
          precio?: number | null
          producto_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "variantes_padre"
            columns: ["producto_id", "negocio_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id", "negocio_id"]
          },
          {
            foreignKeyName: "variantes_producto_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      vigilancia_salud: {
        Row: {
          estado: string
          http: number | null
          id: number
          latencia_ms: number | null
          medido_en: string
          sano: boolean
        }
        Insert: {
          estado: string
          http?: number | null
          id?: never
          latencia_ms?: number | null
          medido_en?: string
          sano: boolean
        }
        Update: {
          estado?: string
          http?: number | null
          id?: never
          latencia_ms?: number | null
          medido_en?: string
          sano?: boolean
        }
        Relationships: []
      }
      zonas: {
        Row: {
          activa: boolean
          ciudad: string
          creado_en: string
          id: string
          latitud: number
          longitud: number
          nombre: string
        }
        Insert: {
          activa?: boolean
          ciudad: string
          creado_en?: string
          id?: string
          latitud: number
          longitud: number
          nombre: string
        }
        Update: {
          activa?: boolean
          ciudad?: string
          creado_en?: string
          id?: string
          latitud?: number
          longitud?: number
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_asignar_zona: {
        Args: { p_negocio_id: string; p_zona_id: string }
        Returns: Json
      }
      admin_cambiar_foto_ia: {
        Args: { p_cupo?: number; p_habilitada: boolean; p_negocio_id: string }
        Returns: Json
      }
      admin_cambiar_plan: {
        Args: { p_negocio_id: string; p_plan: string }
        Returns: Json
      }
      admin_cambiar_publicacion: {
        Args: { p_activo: boolean; p_motivo?: string; p_negocio_id: string }
        Returns: Json
      }
      admin_cambiar_rubro: {
        Args: { p_negocio_id: string; p_rubro: string; p_siembra?: Json }
        Returns: Json
      }
      admin_cambiar_rubro_publico: {
        Args: { p_negocio_id: string; p_rubro_publico: string }
        Returns: Json
      }
      admin_registrar_invitacion: {
        Args: { p_correo: string }
        Returns: undefined
      }
      admin_renovar_suscripcion: {
        Args: { p_meses?: number; p_negocio_id: string }
        Returns: Json
      }
      buscar_en_directorio: {
        Args: {
          p_ciudad?: string
          p_lat?: number
          p_lng?: number
          p_pagina?: number
          p_palabras?: string[]
          p_rubro?: string
          p_rubros_que_coinciden?: string[]
          p_zona_id?: string
        }
        Returns: {
          ciudad: string
          coincidencias: number
          descripcion: string
          distancia_km: number
          horario: Json
          id: string
          logo_url: string
          nombre: string
          palabra: string
          portada_url: string
          productos: Json
          puntaje: number
          rubro_publico: string
          slug: string
          total: number
          zona: string
        }[]
      }
      cambiar_estado_pedido_admin: {
        Args: {
          p_admin_user_id: string
          p_nuevo_estado: string
          p_pedido_id: string
        }
        Returns: Json
      }
      consumir_credito_ia: {
        Args: {
          p_negocio_id: string
          p_tokens?: number
          p_tope: number
          p_tope_diario: number
        }
        Returns: Json
      }
      contar_intento_publico: {
        Args: { p_huella_ip: string; p_negocio_id: string }
        Returns: number
      }
      crear_pedido_reservado: {
        Args: {
          p_cliente_nombre: string
          p_cliente_telefono: string
          p_huella_ip: string
          p_idempotencia: string
          p_items: Json
          p_numero_mesa?: string
          p_slug: string
        }
        Returns: Json
      }
      devolver_credito_ia: {
        Args: { p_negocio_id: string }
        Returns: undefined
      }
      es_admin_plataforma: { Args: never; Returns: boolean }
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
      estado_vigilancia: { Args: never; Returns: Json }
      expirar_reservas_vencidas: {
        Args: { p_limite?: number }
        Returns: number
      }
      ocupacion_recurso: {
        Args: { p_desde: string; p_hasta: string; p_recurso_id: string }
        Returns: {
          cupo: number
          fin: string
          inicio: string
        }[]
      }
      permisos_de_columnas_negocios: {
        Args: never
        Returns: {
          column_name: string
          grantee: string
          privilege_type: string
        }[]
      }
      purgar_analitica_vieja: { Args: { p_dias?: number }; Returns: number }
      purgar_busquedas_sin_resultado: {
        Args: { p_dias?: number }
        Returns: number
      }
      purgar_vigilancia_salud: { Args: never; Returns: number }
      registrar_busqueda_sin_resultado: {
        Args: { p_ciudad: string; p_termino: string }
        Returns: undefined
      }
      registrar_evento_analitica: {
        Args: {
          p_huella_ip: string
          p_negocio_id: string
          p_producto_id: string
          p_sesion_id: string
          p_tipo: string
        }
        Returns: boolean
      }
      registrar_llamada_ia: {
        Args: {
          p_exito: boolean
          p_herramienta: string
          p_negocio_id: string
          p_tokens: number
        }
        Returns: undefined
      }
      registrar_medicion_salud: {
        Args: {
          p_estado: string
          p_http?: number
          p_latencia_ms?: number
          p_sano: boolean
        }
        Returns: string
      }
      resolver_etiqueta: { Args: { p_codigo: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slug_disponible: { Args: { p_slug: string }; Returns: boolean }
      suspender_suscripciones_vencidas: { Args: never; Returns: number }
      uso_almacenamiento: { Args: never; Returns: Json }
      uso_almacenamiento_servicio: { Args: never; Returns: Json }
      uso_ia: { Args: never; Returns: Json }
      uso_ia_servicio: { Args: never; Returns: Json }
      vigilar_salud: { Args: never; Returns: string }
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
