export type RootStackParamList = {
  Library: undefined;
  Reader: { uri: string, musicId?: number };
  Dashboard: undefined;
};

// Define types for music items
export interface MusicItem {
  id?: number;
  title: string;
  uri: string;
  created_at: string;
  last_opened_at?: string;
}

// Define types for music item metadata
export interface MusicMetadata {
  id?: number;
  title: string;
  composer: string;
  genre: string;
  key_signature: string;
  time_signature: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

// Define types for labels
export interface Label {
  id: number;
  name: string;
  colour?: string;
}

export interface MusicMetadataWithLabels extends MusicMetadata {
  labels: string[];
  // setlists: string[];
}

export type MusicItemWithAllData = MusicItem & {
  setlists: string[];
  metadata?: MusicMetadataWithLabels | null;
};

// Define types for the setlists
export interface Setlist {
    id?: number;
    name: string;
}

// Updated interface to include all metadata
export interface MetadataFormData {
  title: string;
  setlists: string[];
  // Add all the metadata fields
  composer?: string;
  genre?: string;
  key_signature?: string;
  time_signature?: string;
  page_count?: number;
  labels?: string[];
}