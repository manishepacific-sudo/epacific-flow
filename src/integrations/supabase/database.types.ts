import { Database } from './types';

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
          status: 'pending' | 'approved' | 'rejected'
          manager_notes: string | null
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
          status?: 'pending' | 'approved' | 'rejected'
          manager_notes?: string | null
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
          status?: 'pending' | 'approved' | 'rejected'
          manager_notes?: string | null
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
      // ... existing tables ...
    }
    // ... rest of the types ...
  }
}