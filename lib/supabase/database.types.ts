export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_usage: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          creator_id: string | null;
          generation_round_id: string | null;
          id: string;
          images: number;
          input_image_tokens: number | null;
          input_text_tokens: number | null;
          model: string;
          output_tokens: number | null;
          provider: string;
          purpose: string;
          quality: string | null;
          rate_input_image: number | null;
          rate_input_text: number | null;
          rate_output: number | null;
          reference_images: number;
          size: string | null;
          style_preview_id: string | null;
          total_tokens: number | null;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          creator_id?: string | null;
          generation_round_id?: string | null;
          id?: string;
          images: number;
          input_image_tokens?: number | null;
          input_text_tokens?: number | null;
          model: string;
          output_tokens?: number | null;
          provider: string;
          purpose: string;
          quality?: string | null;
          rate_input_image?: number | null;
          rate_input_text?: number | null;
          rate_output?: number | null;
          reference_images: number;
          size?: string | null;
          style_preview_id?: string | null;
          total_tokens?: number | null;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          creator_id?: string | null;
          generation_round_id?: string | null;
          id?: string;
          images?: number;
          input_image_tokens?: number | null;
          input_text_tokens?: number | null;
          model?: string;
          output_tokens?: number | null;
          provider?: string;
          purpose?: string;
          quality?: string | null;
          rate_input_image?: number | null;
          rate_input_text?: number | null;
          rate_output?: number | null;
          reference_images?: number;
          size?: string | null;
          style_preview_id?: string | null;
          total_tokens?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_generation_round_id_fkey";
            columns: ["generation_round_id"];
            isOneToOne: false;
            referencedRelation: "generation_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_style_preview_id_fkey";
            columns: ["style_preview_id"];
            isOneToOne: false;
            referencedRelation: "creator_style_previews";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          created_at: string;
          generated_artwork_id: string;
          generation_session_id: string;
          id: string;
          product_id: string;
          quantity: number;
        };
        Insert: {
          created_at?: string;
          generated_artwork_id: string;
          generation_session_id: string;
          id?: string;
          product_id: string;
          quantity: number;
        };
        Update: {
          created_at?: string;
          generated_artwork_id?: string;
          generation_session_id?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_generated_artwork_id_fkey";
            columns: ["generated_artwork_id"];
            isOneToOne: false;
            referencedRelation: "generated_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_generation_session_id_fkey";
            columns: ["generation_session_id"];
            isOneToOne: false;
            referencedRelation: "generation_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_examples: {
        Row: {
          caption: string;
          created_at: string;
          creator_id: string;
          id: string;
          image_url: string;
          sort_order: number;
          source_url: string;
          style_preview_id: string | null;
        };
        Insert: {
          caption?: string;
          created_at?: string;
          creator_id: string;
          id?: string;
          image_url: string;
          sort_order?: number;
          source_url: string;
          style_preview_id?: string | null;
        };
        Update: {
          caption?: string;
          created_at?: string;
          creator_id?: string;
          id?: string;
          image_url?: string;
          sort_order?: number;
          source_url?: string;
          style_preview_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "creator_examples_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creator_examples_style_preview_id_fkey";
            columns: ["style_preview_id"];
            isOneToOne: true;
            referencedRelation: "creator_style_previews";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_payouts: {
        Row: {
          amount: number;
          created_at: string;
          creator_id: string;
          currency: string;
          failure_reason: string | null;
          id: string;
          order_count: number;
          period: string;
          status: string;
          stripe_transfer_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          creator_id: string;
          currency: string;
          failure_reason?: string | null;
          id?: string;
          order_count: number;
          period: string;
          status?: string;
          stripe_transfer_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          creator_id?: string;
          currency?: string;
          failure_reason?: string | null;
          id?: string;
          order_count?: number;
          period?: string;
          status?: string;
          stripe_transfer_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_payouts_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_reference_images: {
        Row: {
          active: boolean;
          canvas_rotation: number;
          canvas_x: number | null;
          canvas_y: number | null;
          canvas_z: number;
          created_at: string;
          creator_id: string;
          height_px: number | null;
          id: string;
          sort_order: number;
          storage_path: string;
          width_px: number | null;
        };
        Insert: {
          active?: boolean;
          canvas_rotation?: number;
          canvas_x?: number | null;
          canvas_y?: number | null;
          canvas_z?: number;
          created_at?: string;
          creator_id: string;
          height_px?: number | null;
          id?: string;
          sort_order?: number;
          storage_path: string;
          width_px?: number | null;
        };
        Update: {
          active?: boolean;
          canvas_rotation?: number;
          canvas_x?: number | null;
          canvas_y?: number | null;
          canvas_z?: number;
          created_at?: string;
          creator_id?: string;
          height_px?: number | null;
          id?: string;
          sort_order?: number;
          storage_path?: string;
          width_px?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "creator_reference_images_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
        ];
      };
      creator_style_previews: {
        Row: {
          created_at: string;
          creator_id: string;
          id: string;
          position: number;
          sample_path: string | null;
          signature: string | null;
          stage: string | null;
          status: string;
          storage_path: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          id?: string;
          position: number;
          sample_path?: string | null;
          signature?: string | null;
          stage?: string | null;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          id?: string;
          position?: number;
          sample_path?: string | null;
          signature?: string | null;
          stage?: string | null;
          status?: string;
          storage_path?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_style_previews_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
        ];
      };
      creators: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          currency: string;
          deleted_at: string | null;
          description: string;
          hero_url: string | null;
          id: string;
          name: string;
          owner_user_id: string | null;
          payouts_status: string;
          preview_sample_path: string | null;
          preview_signature: string | null;
          preview_status: string;
          preview_storage_path: string | null;
          preview_updated_at: string | null;
          rights_confirmed_at: string | null;
          slug: string;
          status: Database["public"]["Enums"]["creator_status"];
          stripe_account_id: string | null;
          transformation_instruction: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          currency?: string;
          deleted_at?: string | null;
          description?: string;
          hero_url?: string | null;
          id?: string;
          name: string;
          owner_user_id?: string | null;
          payouts_status?: string;
          preview_sample_path?: string | null;
          preview_signature?: string | null;
          preview_status?: string;
          preview_storage_path?: string | null;
          preview_updated_at?: string | null;
          rights_confirmed_at?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["creator_status"];
          stripe_account_id?: string | null;
          transformation_instruction?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          currency?: string;
          deleted_at?: string | null;
          description?: string;
          hero_url?: string | null;
          id?: string;
          name?: string;
          owner_user_id?: string | null;
          payouts_status?: string;
          preview_sample_path?: string | null;
          preview_signature?: string | null;
          preview_status?: string;
          preview_storage_path?: string | null;
          preview_updated_at?: string | null;
          rights_confirmed_at?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["creator_status"];
          stripe_account_id?: string | null;
          transformation_instruction?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creators_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_artworks: {
        Row: {
          created_at: string;
          creator_id: string;
          delete_after: string;
          generation_session_id: string;
          height_px: number;
          id: string;
          model: string;
          original_storage_path: string;
          print_storage_path: string | null;
          provider: string;
          provider_metadata: Json | null;
          round_id: string;
          selected: boolean;
          status: string;
          storage_path: string;
          width_px: number;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          delete_after?: string;
          generation_session_id: string;
          height_px: number;
          id?: string;
          model: string;
          original_storage_path: string;
          print_storage_path?: string | null;
          provider: string;
          provider_metadata?: Json | null;
          round_id: string;
          selected?: boolean;
          status?: string;
          storage_path: string;
          width_px: number;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          delete_after?: string;
          generation_session_id?: string;
          height_px?: number;
          id?: string;
          model?: string;
          original_storage_path?: string;
          print_storage_path?: string | null;
          provider?: string;
          provider_metadata?: Json | null;
          round_id?: string;
          selected?: boolean;
          status?: string;
          storage_path?: string;
          width_px?: number;
        };
        Relationships: [
          {
            foreignKeyName: "generated_artworks_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_artworks_generation_session_id_fkey";
            columns: ["generation_session_id"];
            isOneToOne: false;
            referencedRelation: "generation_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_artworks_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "generation_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_rounds: {
        Row: {
          created_at: string;
          error_code: string | null;
          finished_at: string | null;
          generation_session_id: string;
          id: string;
          round_number: number;
          status: string;
        };
        Insert: {
          created_at?: string;
          error_code?: string | null;
          finished_at?: string | null;
          generation_session_id: string;
          id?: string;
          round_number: number;
          status?: string;
        };
        Update: {
          created_at?: string;
          error_code?: string | null;
          finished_at?: string | null;
          generation_session_id?: string;
          id?: string;
          round_number?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_rounds_generation_session_id_fkey";
            columns: ["generation_session_id"];
            isOneToOne: false;
            referencedRelation: "generation_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_sessions: {
        Row: {
          created_at: string;
          creator_id: string;
          expires_at: string;
          id: string;
          rights_confirmed_at: string;
          round_count: number;
          session_token: string;
          source_delete_after: string;
          source_image_path: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          creator_id: string;
          expires_at?: string;
          id?: string;
          rights_confirmed_at?: string;
          round_count?: number;
          session_token: string;
          source_delete_after?: string;
          source_image_path: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          creator_id?: string;
          expires_at?: string;
          id?: string;
          rights_confirmed_at?: string;
          round_count?: number;
          session_token?: string;
          source_delete_after?: string;
          source_image_path?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_sessions_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          generated_artwork_id: string;
          id: string;
          order_id: string;
          print_storage_path: string;
          product_id: string;
          product_snapshot: Json;
          quantity: number;
          unit_amount: number;
        };
        Insert: {
          created_at?: string;
          generated_artwork_id: string;
          id?: string;
          order_id: string;
          print_storage_path: string;
          product_id: string;
          product_snapshot: Json;
          quantity: number;
          unit_amount: number;
        };
        Update: {
          created_at?: string;
          generated_artwork_id?: string;
          id?: string;
          order_id?: string;
          print_storage_path?: string;
          product_id?: string;
          product_snapshot?: Json;
          quantity?: number;
          unit_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_generated_artwork_id_fkey";
            columns: ["generated_artwork_id"];
            isOneToOne: false;
            referencedRelation: "generated_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          amount_total: number;
          cart_key: string | null;
          checkout_attempt: number;
          checkout_url: string | null;
          created_at: string;
          creator_earnings_amount: number | null;
          creator_id: string;
          creator_note: string | null;
          currency: string;
          customer_email: string | null;
          customer_name: string | null;
          fulfilled_at: string | null;
          fulfillment_claimed_at: string | null;
          fulfillment_error: string | null;
          fulfillment_status: string;
          gelato_order_id: string | null;
          gelato_status: string | null;
          gelato_submitted_at: string | null;
          generated_artwork_id: string | null;
          generation_session_id: string;
          id: string;
          payment_fee_amount: number | null;
          payment_status: string;
          payout_id: string | null;
          platform_fee_amount: number | null;
          print_storage_path: string | null;
          product_id: string | null;
          product_snapshot: Json | null;
          production_cost_amount: number | null;
          provider_response: Json | null;
          shipping_address: Json | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount_total: number;
          cart_key?: string | null;
          checkout_attempt?: number;
          checkout_url?: string | null;
          created_at?: string;
          creator_earnings_amount?: number | null;
          creator_id: string;
          creator_note?: string | null;
          currency: string;
          customer_email?: string | null;
          customer_name?: string | null;
          fulfilled_at?: string | null;
          fulfillment_claimed_at?: string | null;
          fulfillment_error?: string | null;
          fulfillment_status?: string;
          gelato_order_id?: string | null;
          gelato_status?: string | null;
          gelato_submitted_at?: string | null;
          generated_artwork_id?: string | null;
          generation_session_id: string;
          id?: string;
          payment_fee_amount?: number | null;
          payment_status?: string;
          payout_id?: string | null;
          platform_fee_amount?: number | null;
          print_storage_path?: string | null;
          product_id?: string | null;
          product_snapshot?: Json | null;
          production_cost_amount?: number | null;
          provider_response?: Json | null;
          shipping_address?: Json | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_total?: number;
          cart_key?: string | null;
          checkout_attempt?: number;
          checkout_url?: string | null;
          created_at?: string;
          creator_earnings_amount?: number | null;
          creator_id?: string;
          creator_note?: string | null;
          currency?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          fulfilled_at?: string | null;
          fulfillment_claimed_at?: string | null;
          fulfillment_error?: string | null;
          fulfillment_status?: string;
          gelato_order_id?: string | null;
          gelato_status?: string | null;
          gelato_submitted_at?: string | null;
          generated_artwork_id?: string | null;
          generation_session_id?: string;
          id?: string;
          payment_fee_amount?: number | null;
          payment_status?: string;
          payout_id?: string | null;
          platform_fee_amount?: number | null;
          print_storage_path?: string | null;
          product_id?: string | null;
          product_snapshot?: Json | null;
          production_cost_amount?: number | null;
          provider_response?: Json | null;
          shipping_address?: Json | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_generated_artwork_id_fkey";
            columns: ["generated_artwork_id"];
            isOneToOne: false;
            referencedRelation: "generated_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_generation_session_id_fkey";
            columns: ["generation_session_id"];
            isOneToOne: false;
            referencedRelation: "generation_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_payout_id_fkey";
            columns: ["payout_id"];
            isOneToOne: false;
            referencedRelation: "creator_payouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          aspect_ratio: string;
          created_at: string;
          creator_id: string | null;
          currency: string;
          description: string;
          gelato_attributes: Json;
          gelato_catalog: string | null;
          gelato_product_uid: string | null;
          height_mm: number;
          id: string;
          name: string;
          price_amount: number;
          slug: string;
          sort_order: number;
          updated_at: string;
          width_mm: number;
        };
        Insert: {
          active?: boolean;
          aspect_ratio?: string;
          created_at?: string;
          creator_id?: string | null;
          currency: string;
          description?: string;
          gelato_attributes?: Json;
          gelato_catalog?: string | null;
          gelato_product_uid?: string | null;
          height_mm: number;
          id?: string;
          name: string;
          price_amount: number;
          slug: string;
          sort_order?: number;
          updated_at?: string;
          width_mm: number;
        };
        Update: {
          active?: boolean;
          aspect_ratio?: string;
          created_at?: string;
          creator_id?: string | null;
          currency?: string;
          description?: string;
          gelato_attributes?: Json;
          gelato_catalog?: string | null;
          gelato_product_uid?: string | null;
          height_mm?: number;
          id?: string;
          name?: string;
          price_amount?: number;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
          width_mm?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          notify_needs_attention: boolean;
          notify_new_order: boolean;
          notify_payout_sent: boolean;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          notify_needs_attention?: boolean;
          notify_new_order?: boolean;
          notify_payout_sent?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          notify_needs_attention?: boolean;
          notify_new_order?: boolean;
          notify_payout_sent?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          reset_at: string;
        };
        Insert: {
          count: number;
          key: string;
          reset_at: string;
        };
        Update: {
          count?: number;
          key?: string;
          reset_at?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          order_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stripe_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_generation: {
        Args: { p_max_rounds: number; p_session: string };
        Returns: {
          created_at: string;
          error_code: string | null;
          finished_at: string | null;
          generation_session_id: string;
          id: string;
          round_number: number;
          status: string;
        };
        SetofOptions: {
          from: "*";
          to: "generation_rounds";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      record_payment: {
        Args: {
          p_address: Json;
          p_amount: number;
          p_currency: string;
          p_email: string;
          p_event: string;
          p_intent: string;
          p_name: string;
          p_order: string;
          p_session: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      creator_status: "draft" | "live" | "disabled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      creator_status: ["draft", "live", "disabled"],
    },
  },
} as const;
