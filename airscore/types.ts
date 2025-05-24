export type RootStackParamList = {
  Library: undefined;
  Reader: { uri: string };
};

// Define types for music items
export interface MusicItem {
  id?: number;
  title: string;
  uri: string;
  created_at: string;
}

// Define types for music item metadata
export interface MusicMetadata {
  id?: number;
  title: string;
  composer: string;
  genre: string;
  key_signature: string;
  rating: number; // 1-5
  difficulty: number; // 1-10
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
}

export type MusicItemWithAllData = MusicItem & {
  groups: string[];
  metadata?: MusicMetadataWithLabels | null;
};

// Define types for the groups
export interface Group {
    id?: number;
    name: string;
}

// Updated interface to include all metadata
export interface MetadataFormData {
  title: string;
  groups: string[];
  // Add all the metadata fields
  composer?: string;
  genre?: string;
  key_signature?: string;
  rating?: number;
  difficulty?: number;
  time_signature?: string;
  page_count?: number;
  labels?: string[];
}