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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string | null
          id: string
          neighborhood: string | null
          number: string | null
          profile_id: string | null
          state: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          profile_id?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          profile_id?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_webhooks: {
        Row: {
          created_at: string | null
          event: string | null
          id: string
          payment_id: string | null
          processed_at: string | null
          raw_payload: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event?: string | null
          id?: string
          payment_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string | null
          id?: string
          payment_id?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_digit: string | null
          account_holder_cpf_cnpj: string | null
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          agency: string | null
          agency_digit: string | null
          bank_code: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          payment_type: string
          pix_key: string | null
          pix_key_type: string | null
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_digit?: string | null
          account_holder_cpf_cnpj?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          agency_digit?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          payment_type: string
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_digit?: string | null
          account_holder_cpf_cnpj?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          agency_digit?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          payment_type?: string
          pix_key?: string | null
          pix_key_type?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_rules: {
        Row: {
          cancelled_by_role: string
          created_at: string
          description: string | null
          hours_before_service: number | null
          id: string
          is_active: boolean | null
          pay_to_professional_percent: number
          penalty_percent: number
          refund_to_client_percent: number
        }
        Insert: {
          cancelled_by_role: string
          created_at?: string
          description?: string | null
          hours_before_service?: number | null
          id?: string
          is_active?: boolean | null
          pay_to_professional_percent?: number
          penalty_percent?: number
          refund_to_client_percent?: number
        }
        Update: {
          cancelled_by_role?: string
          created_at?: string
          description?: string | null
          hours_before_service?: number | null
          id?: string
          is_active?: boolean | null
          pay_to_professional_percent?: number
          penalty_percent?: number
          refund_to_client_percent?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          slug?: string
        }
        Relationships: []
      }
      contract_addendums: {
        Row: {
          addendum_hash: string | null
          addendum_text: string | null
          addendum_version: string | null
          asaas_payment_id: string | null
          asaas_payment_status: string | null
          contract_id: string
          created_at: string
          id: string
          items: Json
          merged_with_original: boolean | null
          opportunity_id: string | null
          paid_at: string | null
          payment_method: string | null
          proposed_at: string
          proposed_by: string
          proposed_by_role: string
          proposer_ip: string | null
          proposer_user_agent: string | null
          reason: string | null
          rejection_reason: string | null
          responded_at: string | null
          responded_by: string | null
          responder_ip: string | null
          responder_user_agent: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          addendum_hash?: string | null
          addendum_text?: string | null
          addendum_version?: string | null
          asaas_payment_id?: string | null
          asaas_payment_status?: string | null
          contract_id: string
          created_at?: string
          id?: string
          items?: Json
          merged_with_original?: boolean | null
          opportunity_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          proposed_at?: string
          proposed_by: string
          proposed_by_role: string
          proposer_ip?: string | null
          proposer_user_agent?: string | null
          reason?: string | null
          rejection_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          responder_ip?: string | null
          responder_user_agent?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          addendum_hash?: string | null
          addendum_text?: string | null
          addendum_version?: string | null
          asaas_payment_id?: string | null
          asaas_payment_status?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          items?: Json
          merged_with_original?: boolean | null
          opportunity_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          proposed_at?: string
          proposed_by?: string
          proposed_by_role?: string
          proposer_ip?: string | null
          proposer_user_agent?: string | null
          reason?: string | null
          rejection_reason?: string | null
          responded_at?: string | null
          responded_by?: string | null
          responder_ip?: string | null
          responder_user_agent?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_addendums_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_addendums_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          asaas_payment_id: string | null
          asaas_payment_status: string | null
          auto_confirmed: boolean | null
          cancellation_details: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          client_ip: string | null
          client_signed: boolean | null
          client_signed_at: string | null
          client_user_agent: string | null
          completed_at: string | null
          completion_confirmed_at: string | null
          completion_requested_at: string | null
          contract_hash: string | null
          contract_text: string | null
          contract_version: string | null
          created_at: string | null
          id: string
          opportunity_id: string | null
          payment_method: string | null
          pdf_url: string | null
          pro_user_agent: string | null
          professional_id: string | null
          professional_ip: string | null
          professional_signed: boolean | null
          professional_signed_at: string | null
          sign_token_client: string | null
          sign_token_professional: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          work_finished_at: string | null
          work_started_at: string | null
        }
        Insert: {
          asaas_payment_id?: string | null
          asaas_payment_status?: string | null
          auto_confirmed?: boolean | null
          cancellation_details?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          client_ip?: string | null
          client_signed?: boolean | null
          client_signed_at?: string | null
          client_user_agent?: string | null
          completed_at?: string | null
          completion_confirmed_at?: string | null
          completion_requested_at?: string | null
          contract_hash?: string | null
          contract_text?: string | null
          contract_version?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          pro_user_agent?: string | null
          professional_id?: string | null
          professional_ip?: string | null
          professional_signed?: boolean | null
          professional_signed_at?: string | null
          sign_token_client?: string | null
          sign_token_professional?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          work_finished_at?: string | null
          work_started_at?: string | null
        }
        Update: {
          asaas_payment_id?: string | null
          asaas_payment_status?: string | null
          auto_confirmed?: boolean | null
          cancellation_details?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          client_ip?: string | null
          client_signed?: boolean | null
          client_signed_at?: string | null
          client_user_agent?: string | null
          completed_at?: string | null
          completion_confirmed_at?: string | null
          completion_requested_at?: string | null
          contract_hash?: string | null
          contract_text?: string | null
          contract_version?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          pro_user_agent?: string | null
          professional_id?: string | null
          professional_ip?: string | null
          professional_signed?: boolean | null
          professional_signed_at?: string | null
          sign_token_client?: string | null
          sign_token_professional?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          work_finished_at?: string | null
          work_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          opportunity_id: string | null
          professional_id: string | null
          unread_client: number | null
          unread_pro: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          opportunity_id?: string | null
          professional_id?: string | null
          unread_client?: number | null
          unread_pro?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          opportunity_id?: string | null
          professional_id?: string | null
          unread_client?: number | null
          unread_pro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          doc_type: string
          file_name: string | null
          file_url: string
          id: string
          profile_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doc_type: string
          file_name?: string | null
          file_url: string
          id?: string
          profile_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doc_type?: string
          file_name?: string | null
          file_url?: string
          id?: string
          profile_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          asaas_transfer_id: string | null
          available_at: string | null
          contract_id: string | null
          created_at: string | null
          description: string | null
          gross_amount: number
          id: string
          net_amount: number
          opportunity_id: string | null
          platform_fee: number
          profile_id: string | null
          status: string | null
          transfer_status: string | null
          updated_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          asaas_transfer_id?: string | null
          available_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          opportunity_id?: string | null
          platform_fee?: number
          profile_id?: string | null
          status?: string | null
          transfer_status?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          asaas_transfer_id?: string | null
          available_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          opportunity_id?: string | null
          platform_fee?: number
          profile_id?: string | null
          status?: string | null
          transfer_status?: string | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          question: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          question: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          question?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string | null
          created_at: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          profile_id: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          profile_id?: string | null
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          profile_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          budget: number | null
          category_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          duration_hours: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_private: boolean | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          max_applications: number | null
          platform_fee: number | null
          scheduled_at: string | null
          selected_extras: Json | null
          start_date: string | null
          start_time: string | null
          status: string | null
          subtotal: number | null
          target_professional_id: string | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          budget?: number | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_private?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_applications?: number | null
          platform_fee?: number | null
          scheduled_at?: string | null
          selected_extras?: Json | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          subtotal?: number | null
          target_professional_id?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          budget?: number | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_private?: boolean | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_applications?: number | null
          platform_fee?: number | null
          scheduled_at?: string | null
          selected_extras?: Json | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          subtotal?: number | null
          target_professional_id?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_target_professional_id_fkey"
            columns: ["target_professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_applications: {
        Row: {
          created_at: string | null
          id: string
          opportunity_id: string | null
          professional_id: string | null
          status: string | null
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          professional_id?: string | null
          status?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          professional_id?: string | null
          status?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean | null
          last4: string | null
          stripe_payment_method_id: string
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id: string
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last4?: string | null
          stripe_payment_method_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_hold: number
          client_id: string | null
          contract_id: string | null
          created_at: string
          freelancer_amount: number
          frozen_at: string | null
          gross_amount: number
          id: string
          opportunity_id: string | null
          payment_method: string
          pix_qr_code: string | null
          pix_qr_code_url: string | null
          pix_transaction_id: string | null
          platform_fee: number
          professional_id: string | null
          refunded_at: string | null
          released_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_hold?: number
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          freelancer_amount?: number
          frozen_at?: string | null
          gross_amount: number
          id?: string
          opportunity_id?: string | null
          payment_method?: string
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          pix_transaction_id?: string | null
          platform_fee?: number
          professional_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_hold?: number
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          freelancer_amount?: number
          frozen_at?: string | null
          gross_amount?: number
          id?: string
          opportunity_id?: string | null
          payment_method?: string
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          pix_transaction_id?: string | null
          platform_fee?: number
          professional_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          client_id: string | null
          created_at: string | null
          gross_amount: number
          id: string
          net_amount: number
          opportunity_id: string | null
          paid_at: string | null
          platform_fee: number | null
          professional_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          opportunity_id?: string | null
          paid_at?: string | null
          platform_fee?: number | null
          professional_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          opportunity_id?: string | null
          paid_at?: string | null
          platform_fee?: number | null
          professional_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_keys: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string | null
          pix_key: string
          pix_key_type: string
          professional_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          pix_key: string
          pix_key_type: string
          professional_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          pix_key?: string
          pix_key_type?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_keys_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_photos: {
        Row: {
          created_at: string | null
          file_name: string | null
          id: string
          order_index: number | null
          photo_url: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          id?: string
          order_index?: number | null
          photo_url: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          id?: string
          order_index?: number | null
          photo_url?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_categories: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          profile_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_categories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_equipments: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_equipments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_extras: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          price: number
          profile_id: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          price: number
          profile_id?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          price?: number
          profile_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_extras_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_pricing: {
        Row: {
          created_at: string | null
          currency: string | null
          daily_rate: number | null
          hourly_rate: number | null
          id: string
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_pricing_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_unavailable_dates: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          unavailable_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          unavailable_date: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          unavailable_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string | null
          asaas_account_id: string | null
          asaas_customer_id: string | null
          asaas_error: string | null
          asaas_pix_key: string | null
          asaas_wallet_id: string | null
          avatar_url: string | null
          behance: string | null
          bio: string | null
          cpf_cnpj: string | null
          cpf_cnpj_locked: boolean | null
          cpf_cnpj_type: string | null
          created_at: string | null
          dribbble: string | null
          email: string
          email_locked: boolean | null
          figma: string | null
          full_name: string | null
          github: string | null
          id: string
          instagram: string | null
          is_approved: boolean | null
          is_online: boolean | null
          linkedin: string | null
          phone: string | null
          pinterest: string | null
          stripe_customer_id: string | null
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string | null
          user_type: string | null
          vimeo: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          approval_status?: string | null
          asaas_account_id?: string | null
          asaas_customer_id?: string | null
          asaas_error?: string | null
          asaas_pix_key?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          behance?: string | null
          bio?: string | null
          cpf_cnpj?: string | null
          cpf_cnpj_locked?: boolean | null
          cpf_cnpj_type?: string | null
          created_at?: string | null
          dribbble?: string | null
          email: string
          email_locked?: boolean | null
          figma?: string | null
          full_name?: string | null
          github?: string | null
          id: string
          instagram?: string | null
          is_approved?: boolean | null
          is_online?: boolean | null
          linkedin?: string | null
          phone?: string | null
          pinterest?: string | null
          stripe_customer_id?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_type?: string | null
          vimeo?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          approval_status?: string | null
          asaas_account_id?: string | null
          asaas_customer_id?: string | null
          asaas_error?: string | null
          asaas_pix_key?: string | null
          asaas_wallet_id?: string | null
          avatar_url?: string | null
          behance?: string | null
          bio?: string | null
          cpf_cnpj?: string | null
          cpf_cnpj_locked?: boolean | null
          cpf_cnpj_type?: string | null
          created_at?: string | null
          dribbble?: string | null
          email?: string
          email_locked?: boolean | null
          figma?: string | null
          full_name?: string | null
          github?: string | null
          id?: string
          instagram?: string | null
          is_approved?: boolean | null
          is_online?: boolean | null
          linkedin?: string | null
          phone?: string | null
          pinterest?: string | null
          stripe_customer_id?: string | null
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          user_type?: string | null
          vimeo?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          client_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          opportunity_id: string | null
          professional_id: string | null
          rating: number | null
        }
        Insert: {
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          professional_id?: string | null
          rating?: number | null
        }
        Update: {
          client_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          professional_id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message: string
          profile_id: string | null
          sender: string
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          profile_id?: string | null
          sender: string
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          profile_id?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          version?: string
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          accepted_at: string | null
          id: string
          ip_address: string | null
          profile_id: string | null
          terms_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          ip_address?: string | null
          profile_id?: string | null
          terms_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          id?: string
          ip_address?: string | null
          profile_id?: string | null
          terms_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_acceptance_terms_id_fkey"
            columns: ["terms_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          asaas_status: string | null
          asaas_transfer_id: string | null
          bank_account_id: string | null
          created_at: string | null
          gateway_id: string | null
          id: string
          pix_key: string | null
          pix_key_type: string | null
          pix_receipt_url: string | null
          processed_at: string | null
          profile_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          asaas_status?: string | null
          asaas_transfer_id?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          gateway_id?: string | null
          id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          pix_receipt_url?: string | null
          processed_at?: string | null
          profile_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asaas_status?: string | null
          asaas_transfer_id?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          gateway_id?: string | null
          id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          pix_receipt_url?: string | null
          processed_at?: string | null
          profile_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_opportunity: { Args: { p_opportunity_id: string }; Returns: Json }
      apply_to_opportunity: {
        Args: { p_opportunity_id: string }
        Returns: Json
      }
      approve_document: { Args: { p_document_id: string }; Returns: undefined }
      approve_professional: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      cancel_contract_addendum: {
        Args: { p_addendum_id: string }
        Returns: Json
      }
      check_cpf_cnpj_exists: { Args: { p_cpf_cnpj: string }; Returns: boolean }
      check_email_exists: { Args: { p_email: string }; Returns: boolean }
      check_phone_exists: { Args: { p_phone: string }; Returns: boolean }
      decline_private_opportunity: {
        Args: { p_opportunity_id: string }
        Returns: undefined
      }
      generate_contract: { Args: { p_opportunity_id: string }; Returns: string }
      get_financial_summary: { Args: { p_profile_id: string }; Returns: Json }
      get_platform_fee_rate: {
        Args: { reference_date?: string }
        Returns: number
      }
      get_professional_balance: {
        Args: { p_profile_id: string }
        Returns: number
      }
      get_professional_reserved_balance: {
        Args: { p_profile_id: string }
        Returns: number
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      propose_contract_addendum: {
        Args: {
          p_contract_id: string
          p_ip?: string
          p_items: Json
          p_reason: string
          p_user_agent?: string
        }
        Returns: Json
      }
      refuse_contract: { Args: { p_contract_id: string }; Returns: Json }
      reject_document: {
        Args: { p_document_id: string; p_reason: string }
        Returns: undefined
      }
      respond_contract_addendum: {
        Args: {
          p_action: string
          p_addendum_id: string
          p_ip?: string
          p_rejection_reason?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      select_professional: {
        Args: { p_opportunity_id: string; p_professional_id: string }
        Returns: Json
      }
      sign_contract: {
        Args: {
          p_contract_id: string
          p_ip_address: string
          p_signer_type: string
          p_user_agent: string
        }
        Returns: Json
      }
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
