export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          location_latitude: number
          location_longitude: number
          location_address: string | null
          attendance_date: string
          status: 'pending_approval' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
          manager_notes: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string | null
          remarks: string | null
          geofence_valid: boolean
          office_latitude: number | null
          office_longitude: number | null
          distance_from_office: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_url: string
          location_latitude: number
          location_longitude: number
          location_address?: string | null
          attendance_date?: string
          status?: 'pending_approval' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
          manager_notes?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          remarks?: string | null
          geofence_valid?: boolean
          office_latitude?: number | null
          office_longitude?: number | null
          distance_from_office?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_url?: string
          location_latitude?: number
          location_longitude?: number
          location_address?: string | null
          attendance_date?: string
          status?: 'pending_approval' | 'approved' | 'rejected' | 'checked_in' | 'checked_out'
          manager_notes?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          remarks?: string | null
          geofence_valid?: boolean
          office_latitude?: number | null
          office_longitude?: number | null
          distance_from_office?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // ... existing tables ...
    }
    Views: {
      attendance_analytics: {
        Row: {
          date: string
          total_attendance: number
          approved_count: number
          rejected_count: number
          pending_count: number
          valid_location_count: number
          invalid_location_count: number
          avg_distance_from_office: number | null
        }
        Relationships: []
      }
    }
    // ... rest of the types ...
  }
}