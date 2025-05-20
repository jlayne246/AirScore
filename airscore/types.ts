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

// Define types for the groups
export interface Group {
    id?: number;
    name: string;
}