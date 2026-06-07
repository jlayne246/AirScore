/** 
 * This module allows the app to access a database that can be queried through a SQLite API
 * @see {@link https://docs.expo.dev/versions/latest/sdk/sqlite/}
*/
import * as SQLite from 'expo-sqlite';
import { Asset } from "expo-asset";
/** 
 * Imports the Expo file system module which allows the app access to a device's local file system
 * @see {@link https://docs.expo.dev/versions/latest/sdk/filesystem/}
 * */ 
import * as FileSystem from "expo-file-system";

import * as troubleshooting from "./troubleshooting";

import {
  MusicItem,
  Setlist,
  Label,
  MusicMetadata,
  MusicMetadataWithLabels,
  MusicItemWithAllData,
} from "../types";

/**
 * Opens the SQLite database
 * @returns SQLite Database object
 */
let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (_db) return _db;

    _db = await SQLite.openDatabaseAsync('airscore.db');
    return _db;
};


/**
 * Initialises the SQLite database by creating the necessary tables.
 */
export const initDB = async (): Promise<void> => {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const db = await openDatabase();

    try {
      console.log("DB init: enabling foreign keys");
      await db.execAsync(`PRAGMA foreign_keys = ON;`);

      console.log("DB init: creating music table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          uri TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          last_opened_at TEXT DEFAULT (datetime('now'))
        );
      `);

      console.log("DB init: creating setlists table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS setlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        );
      `);

      console.log("DB init: creating music_setlists table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_setlists (
          music_id INTEGER,
          group_id INTEGER,
          PRIMARY KEY (music_id, group_id),
          FOREIGN KEY (music_id) REFERENCES music (id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES setlists (id) ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating music_metadata table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_metadata (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          composer TEXT,
          genre TEXT,
          key_signature TEXT,
          time_signature TEXT,
          page_count INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (id) REFERENCES music (id) ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating labels table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS labels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          colour TEXT
        );
      `);

      console.log("DB init: creating music_labels table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_labels (
          music_id INTEGER,
          label_id INTEGER,
          PRIMARY KEY (music_id, label_id),
          FOREIGN KEY (music_id) REFERENCES music (id) ON DELETE CASCADE,
          FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating duplicate metadata index");
      await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_music_metadata_title_composer
        ON music_metadata (title, composer);
      `);

      console.log("Database initialized");
    } catch (error) {
      _initPromise = null;
      console.error("Database startup failed:", error);
      throw error;
    }
  })();

  return _initPromise;
};

export const getRecentlyOpenedMusic = async (
  limit: number = 10
): Promise<MusicItemWithAllData[]> => {
  const allMusic = await getMusicWithAllData();

  return allMusic
    .filter(item => !!item.last_opened_at)
    .sort(
      (a, b) =>
        new Date(b.last_opened_at!).getTime() -
        new Date(a.last_opened_at!).getTime()
    )
    .slice(0, limit);
};

export const markMusicAsOpened = async (musicId: number): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    UPDATE music
    SET last_opened_at = ?
    WHERE id = ?
    `,
    [new Date().toISOString(), musicId]
  );
};

/**
 * Inserts a new music item into the database
 * @param title - The title of the music item
 * @param uri - The uri / path of the music item
 * @param groupNames - The group names selected for the music item
 * @returns musicId - The id of the music item inserted
 */
export const insertMusic = async (
  title: string,
  uri: string,
  groupNames: string[],
  created_at: string
) : Promise<number> => {
    const db = await openDatabase();
    const created = created_at || new Date().toISOString();

    try {
        // Begins transaction to ensure atomicity
        await db.execAsync('BEGIN TRANSACTION');

        // Checks to see if a title is undefined
        if (!title || typeof title == 'undefined') {
            throw new Error("No title given");
        }

        // Insert the music item
        const musicResult = await db.runAsync(
            'INSERT INTO music (title, uri, created_at) VALUES (?, ?, ?)', [title, uri, created]
        );

        const musicId = musicResult.lastInsertRowId;

        // Process each group
        for (const groupName of groupNames) {
            // Insert group if it doesn't exist
            await db.runAsync(
                'INSERT OR IGNORE INTO setlists (name) VALUES (?)', [groupName]
            );

            // Get the group ID
            const group = await db.getFirstAsync<Setlist>(
                'SELECT id FROM setlists WHERE name = ?', [groupName]
            );

            // Checks to see if a group id was returned, otherwise, an error is thrown
            if (!group || typeof group.id == 'undefined') {
                throw new Error(`Setlist "${groupName}" not found after insertion`)
            }

            // Create the relationship between the music item and the group(s)
            await db.runAsync(
                'INSERT INTO music_setlists (music_id, group_id) VALUES (?, ?)', [musicId, group.id]
            );
        }

        // Commit the transaction
        await db.execAsync('COMMIT');

        return musicId;
    } catch (error) {
        // Rollback on error
        await db.execAsync('ROLLBACK');
        throw error;
    }
};

export const metadataExists = async (
  title: string,
  composer?: string,
  excludeMusicId?: number
): Promise<boolean> => {
  const db = await openDatabase();

  const normalisedTitle = title.trim().toLowerCase();
  const normalisedComposer = (composer ?? "").trim().toLowerCase();

  const existing = await db.getFirstAsync<{ id: number }>(
    `
    SELECT id
    FROM music_metadata
    WHERE lower(trim(title)) = ?
      AND lower(trim(coalesce(composer, ''))) = ?
      AND (? IS NULL OR id != ?)
    LIMIT 1
    `,
    [
      normalisedTitle,
      normalisedComposer,
      excludeMusicId ?? null,
      excludeMusicId ?? null,
    ]
  );

  return !!existing;
};

export const musicExistsByUri = async (
  uri: string,
  excludeMusicId?: number
): Promise<boolean> => {
  const db = await openDatabase();

  const existing = await db.getFirstAsync<{ id: number }>(
    `
    SELECT id
    FROM music
    WHERE uri = ?
      AND (? IS NULL OR id != ?)
    LIMIT 1
    `,
    [
      uri,
      excludeMusicId ?? null,
      excludeMusicId ?? null
    ]
  );

  return !!existing;
};

export const updateMusic = async (
  id: number,
  title: string,
  uri: string,
  groupNames: string[],
  updated_at: string
): Promise<void> => {
  const db = await openDatabase();
  const updated = updated_at || new Date().toISOString();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    // Ensure music entry exists
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM music WHERE id = ?",
      [id]
    );
    if (!existing) {
      throw new Error(`Music item with id ${id} does not exist`);
    }

    // Update the music item
    await db.runAsync(
      "UPDATE music SET title = ?, uri = ?, updated_at = ? WHERE id = ?",
      [title, uri, updated, id]
    );

    // Insert any new setlists (ignore existing)
    for (const groupName of groupNames) {
      await db.runAsync("INSERT OR IGNORE INTO setlists (name) VALUES (?)", [
        groupName,
      ]);
    }

    // Get all current group IDs
    const groupIds = [];
    for (const name of groupNames) {
      const group = await db.getFirstAsync<Setlist>(
        "SELECT id FROM setlists WHERE name = ?",
        [name]
      );
      if (!group || group.id === undefined) {
        throw new Error(`Setlist "${name}" not found after insertion`);
      }
      groupIds.push(group.id);
    }

    // Remove all existing associations
    await db.runAsync("DELETE FROM music_setlists WHERE music_id = ?", [id]);

    // Re-insert updated associations
    for (const groupId of groupIds) {
      await db.runAsync(
        "INSERT INTO music_setlists (music_id, group_id) VALUES (?, ?)",
        [id, groupId]
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
};
  

/**
 * Gets all music with their setlists
 * @returns Array of music items with their setlists
 */
export const getAllMusicWithSetlists = async (): Promise<
  Array<MusicItem & { setlists: string[] }>
> => {
    const db = await openDatabase();

    // Get all music items from the music table
    const musicItems = await db.getAllAsync<MusicItem>('SELECT * FROM music');

    if (!musicItems) {
        console.log("No music here");
    }

    console.log("Here!")

    try {
        // For each music item, get its setlists
        const result = await Promise.all(
            musicItems.map(async (music) => {
            // Checks to see if the music item exists and is retrievable
            if (!music || typeof music.id == "undefined") {
                throw new Error("Unable to retrieve music item");
            }

            const setlists = await db.getAllAsync<{ name: string }>(
                `SELECT g.name
                    FROM setlists g
                    JOIN music_setlists mg ON g.id = mg.group_id
                    WHERE mg.music_id = ?`,
                [music.id]
            );

            // Returns the music array mapped to the setlists from sub-function
            return {
                ...music, // Expanded music array
                setlists: setlists.map((g) => g.name),
            };
            })
        );

        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Get music items that belong to all of the specified setlists
 * @param groupNames - Array of group names to filter by
 * @returns Array of music items that belong to all specified setlists
 */
export const getMusicByMultipleSetlists = async (groupNames: string[]) : Promise<MusicItem[]> => {
    // If the groupNames param is empty, return an empty array
    if (groupNames.length === 0) {
        return [];
    }

    const db = await openDatabase();

    // Create placeholders for the query
    const placeholders = groupNames.map(() => '?').join(',');

    // Query for all music items that match the specified setlists, grouped by groupName
    const result = await db.getAllAsync<MusicItem>(
        `SELECT m.*
        FROM music m
        JOIN music_setlists mg ON m.id = mg.music_id
        JOIN setlists g ON mg.group_id = g.id
        WHERE g.name IN (${placeholders})
        GROUP BY m.id
        HAVING COUNT(DISTINCT g.name) = ?`, 
        [...groupNames, groupNames.length]
    );

    return result;
} 

/**
 * Delete a music item by ID
 * @param id - ID of the music item to delete
 */
export const deleteMusic = async (id: number) => {
  const db = openDatabase();

  // Due to ON DELETE CASCADE, this will also remove entries in music_setlists
  (await db).runAsync('DELETE FROM music WHERE id = ?', [id]);
}

/**
 * Add a music item to a group
 * @param musicId - ID of the music item
 * @param groupName - Name of the group
 */
export const addMusicToSetlist = async (musicId: number, groupName: string) => {
    const db = await openDatabase();

    try {
        await db.execAsync('BEGIN TRANSACTION');

        // Insert group if it doesn't exist
        if (groupName !== "Ungrouped") {
          await db.runAsync("INSERT OR IGNORE INTO setlists (name) VALUES (?)", [
            groupName,
          ]);
        }          

        console.log(musicId, groupName);

        // Get the group ID
        const group = await db.getFirstAsync<Setlist>(
            'SELECT id FROM setlists WHERE name = ?', [groupName]
        );

        // Verify if we get a valid group
        if (!group || typeof group.id == "undefined") {
            throw new Error(`Setlist "${groupName}" not found`);
        }

        // Create the relationship between the musicItem and its group
        await db.runAsync(
            'INSERT OR IGNORE INTO music_setlists (music_id, group_id) VALUES (?, ?)',
            [musicId, group.id]
        );

        // Commits if successful
        await db.execAsync('COMMIT');
    } catch (error) {
        // Rollback on error
        await db.execAsync('ROLLBACK');
        throw error;
    }
}

/**
 * Removes a music item from a group
 * @param musicId - ID of the music item
 * @param groupName - Name of the group
 */
export const removeMusicFromSetlist = async (musicId: number, groupName: string) => {
    const db = await openDatabase();

    // Deletes item from group by ID
    await db.runAsync(
        `DELETE FROM music_setlists
        WHERE music_id = ? AND group_id = (
            SELECT id FROM setlists WHERE name = ?
        )`, [musicId, groupName]
    );
}

export const setMusicSetlists = async (musicId: number, groupNames: string[]) => {
    const db = await openDatabase();

    try {
        await db.execAsync("BEGIN TRANSACTION");

        // Remove all current setlists
        await db.runAsync("DELETE FROM music_setlists WHERE music_id = ?", [musicId]);

        // Re-add current selections (excluding "Ungrouped")
        for (const groupName of groupNames.filter((g) => g !== "Ungrouped")) {
        await db.runAsync("INSERT OR IGNORE INTO setlists (name) VALUES (?)", [
            groupName,
        ]);

        const group = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM setlists WHERE name = ?",
            [groupName]
        );

        if (group?.id !== undefined) {
            await db.runAsync(
            "INSERT INTO music_setlists (music_id, group_id) VALUES (?, ?)",
            [musicId, group.id]
            );
        }
        }

        await db.execAsync("COMMIT");
    } catch (error) {
        await db.execAsync("ROLLBACK");
        console.error("Failed to set music setlists:", error);
        throw error;
    }
};
  

/**
 * Drops specified tables from the database
 * @param tableNames - Array of table names to drop
 * @returns Promise that resolves when all tables are dropped
 */
export const dropTables = async (
  tableNames: string[] = [
    "music_labels",
    "music_setlists",
    "music_metadata",
    "labels",
    "setlists",
    "music"
  ]
) => {
  const db = await openDatabase();

  try {
    await db.execAsync("PRAGMA foreign_keys = OFF;");
    await db.execAsync("BEGIN TRANSACTION;");

    for (const tableName of tableNames) {
      await db.execAsync(`DROP TABLE IF EXISTS ${tableName};`);
      console.log(`Table ${tableName} dropped successfully`);
    }

    await db.execAsync(`
        DROP INDEX IF EXISTS idx_music_metadata_title_composer;
    `);

    await db.execAsync("COMMIT;");
    await db.execAsync("PRAGMA foreign_keys = ON;");

    return true;
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    await db.execAsync("PRAGMA foreign_keys = ON;");
    console.error("Error dropping tables:", error);
    throw error;
  }
};
  
  /**
   * Reset the database by dropping all tables and reinitializing
   * Useful during development or for features like "Reset App Data"
   */
  export const resetDatabase = async () => {
    try {
      // Drop tables in the correct order (respecting foreign key constraints)
      await dropTables();
      
      // Reinitialize the database structure
      await initDB();
      
      console.log('Database has been reset successfully');
      return true;
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  };

/**
 * Saves or updates metadata for a music item
 * @param musicId - The ID of the music item
 * @param metadata - The metadata object (without id field)
 * @returns Promise<void>
 */
export const saveMusicMetadata = async (
    musicId: number, 
    metadata: Omit<MusicMetadata, 'id'>
): Promise<void> => {
    const db = await openDatabase();

    try {
        await db.execAsync('BEGIN TRANSACTION');

        // Insert or replace metadata
        await db.runAsync(`
            INSERT OR REPLACE INTO music_metadata (
                id, title, composer, genre, key_signature, 
                time_signature, page_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            musicId,
            metadata.title,
            metadata.composer || null,
            metadata.genre || null,
            metadata.key_signature || null,
            metadata.time_signature || null,
            metadata.page_count || null,
            metadata.created_at || new Date().toISOString()
        ]);

        await db.execAsync('COMMIT');
        console.log(`Metadata saved for music ID: ${musicId}`);
    } catch (error) {
        await db.execAsync('ROLLBACK');
        console.error("Failed to save music metadata:", error);
        throw error;
    }
};

/**
 * Creates a new label or returns existing one
 * @param name - Label name
 * @param colour - Optional color for the label
 * @returns Promise<number> - The label ID
 */
export const createOrGetLabel = async (name: string, colour?: string): Promise<number> => {
    const db = await openDatabase();

    try {
        // Try to get existing label
        const existing = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM labels WHERE name = ?', [name]
        );

        if (existing) {
            return existing.id;
        }

        // Create new label
        const result = await db.runAsync(
            'INSERT INTO labels (name, colour) VALUES (?, ?)', 
            [name, colour || null]
        );

        return result.lastInsertRowId;
    } catch (error) {
        console.error("Failed to create or get label:", error);
        throw error;
    }
};

/**
 * Assigns labels to a music item
 * @param musicId - The ID of the music item
 * @param labelNames - Array of label names to assign
 * @returns Promise<void>
 */
export const assignLabelsToMusic = async (
    musicId: number, 
    labelNames: string[]
): Promise<void> => {
    console.log("Assigning - Stage 1: ", labelNames);

    // if (labelNames.length === 0) return;

    const db = await openDatabase();

    try {
        await db.execAsync('BEGIN TRANSACTION');

        // Remove existing labels for this music item
        await db.runAsync('DELETE FROM music_labels WHERE music_id = ?', [musicId]);

        console.log("Assigning - Stage 2 : ", labelNames);

        // Add new labels
        for (const labelName of labelNames) {
            const labelId = await createOrGetLabel(labelName);
            
            await db.runAsync(
                'INSERT INTO music_labels (music_id, label_id) VALUES (?, ?)',
                [musicId, labelId]
            );
        }

        await db.execAsync('COMMIT');
        console.log(`Labels assigned to music ID: ${musicId}`);
    } catch (error) {
        await db.execAsync('ROLLBACK');
        console.error("Failed to assign labels to music:", error);
        throw error;
    }
};

/**
 * Saves complete music metadata including labels
 * @param musicId - The ID of the music item
 * @param metadata - The metadata object
 * @param labelNames - Array of label names
 * @returns Promise<void>
 */
export const saveCompleteMetadata = async (
    musicId: number,
    metadata: Omit<MusicMetadata, 'id'>,
    labelNames: string[] = []
): Promise<void> => {
    try {
        // Save metadata
        console.log("Saving complete metadata for music ID:", musicId, " with data: ", metadata, " and labels: ", labelNames);
        await saveMusicMetadata(musicId, metadata);
        
        // Assign labels
        await assignLabelsToMusic(musicId, labelNames);
        
        console.log(`Complete metadata saved for music ID: ${musicId}`);
    } catch (error) {
        console.error("Failed to save complete metadata:", error);
        throw error;
    }
};

/**
 * Retrieves metadata for a music item including labels
 * @param musicId - The ID of the music item
 * @returns Promise<MusicMetadataWithLabels | null>
 */
export const getMusicWithMetadata = async (
    musicId: number
): Promise<MusicMetadataWithLabels | null> => {
    const db = await openDatabase();

    try {
        // Get metadata
        const metadata = await db.getFirstAsync<MusicMetadata>(
            'SELECT * FROM music_metadata WHERE id = ?', [musicId]
        );

        if (!metadata) return null;

        // Get labels
        const labels = await db.getAllAsync<{ name: string }>(
            `SELECT l.name 
             FROM labels l 
             JOIN music_labels ml ON l.id = ml.label_id 
             WHERE ml.music_id = ?`, 
            [musicId]
        );

        return {
            ...metadata,
            labels: labels.map(l => l.name)
        };
    } catch (error) {
        console.error("Failed to get music metadata:", error);
        throw error;
    }
};

/**
 * Gets all available labels
 * @returns Promise<Label[]>
 */
export const getAllLabels = async (): Promise<Label[]> => {
    const db = await openDatabase();

    console.log("Label DB - ", db)
    
    try {
        const labels = await db.getAllAsync<Label>('SELECT * FROM labels ORDER BY name'); // Seemingly error line
        console.log(labels)
        return labels;
    } catch (error) {
        console.error("Failed to get all labels:", error);
        throw error;
    }
};


export const getMusicWithAllData = async (): Promise<
  MusicItemWithAllData[]
> => {
    const db = await openDatabase();

    // Fetch all music items
    const musicItems = await db.getAllAsync<MusicItem>("SELECT * FROM music");
    const musicMetaItems = await db.getAllAsync<MusicItem>("SELECT * FROM music_metadata");

    console.log(musicItems, musicMetaItems);

    if (!musicItems || musicItems.length === 0) {
        console.log("No music here");
        return [];
    }

    try {
        const result = await Promise.all(
        musicItems.map(async (music) => {
            if (!music || typeof music.id === "undefined") {
            throw new Error("Unable to retrieve music item");
            }

            // Get setlists
            const setlists = await db.getAllAsync<{ name: string }>(
            `SELECT g.name
                        FROM setlists g
                        JOIN music_setlists mg ON g.id = mg.group_id
                        WHERE mg.music_id = ?`,
            [music.id]
            );

            // Get metadata
            const metadata = await db.getFirstAsync<MusicMetadata>(
            "SELECT * FROM music_metadata WHERE id = ?",
            [music.id]
            );

            // Get labels for metadata (only if metadata exists)
            let labels: string[] = [];
            if (metadata) {
            const labelResults = await db.getAllAsync<{ name: string }>(
                `SELECT l.name 
                            FROM labels l 
                            JOIN music_labels ml ON l.id = ml.label_id 
                            WHERE ml.music_id = ?`,
                [music.id]
            );
            labels = labelResults.map((l) => l.name);
            }

            return {
            ...music,
            setlists: setlists.map((g) => g.name),
            metadata: metadata ? { ...metadata, labels, setlists } : null,
            };
        })
        );

        return result;
    } catch (error) {
        console.error("Error fetching music with setlists and metadata:", error);
        throw error;
    }
};


/**
 * 
 * @returns 
 */
export const getAllSetlists = async (): Promise<string[]> => {
    const db = await openDatabase();

    try {
        const setlists = await db.getAllAsync<{ group_name: string }>(`
            SELECT DISTINCT name as group_name
            FROM setlists
            WHERE name IS NOT NULL
            ORDER BY name ASC
        `);

        return setlists.map((g) => g.group_name);
    } catch (error) {
        console.error("Error getting all setlists:", error);
        return []; // No fallback 'Ungrouped' needed here
    }
};
  

export const getSetlistsForMusic = async (musicId: number): Promise<string[]> => {
    const db = await openDatabase();

    try {
        // Query to get setlists associated with a specific music item
        // This assumes you have a junction table like 'music_setlists' or similar
        const setlists = await db.getAllAsync<{ group_name: string }>(
        `
            SELECT g.name as group_name
            FROM setlists g
            INNER JOIN music_setlists mg ON g.id = mg.group_id
            WHERE mg.music_id = ?
            ORDER BY g.name ASC
        `,
        [musicId]
        );

        console.log(setlists);

        return setlists.length > 0 ? setlists.map((g) => g.group_name) : ["Ungrouped"];      
    } catch (error) {
        console.error("Error getting setlists for music:", error);
        return ["Ungrouped"]; // Return default group on error
    }
};