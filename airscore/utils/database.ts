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

import { MusicItem, Group } from "../types";

/**
 * Opens the SQLite database
 * @returns SQLite Database object
 */
const openDatabase = async () => {
    const database = SQLite.openDatabaseAsync('airscore.db');
    return database;
}

/**
 * Initialises the SQLite database by creating the necessary tables.
 */
export const initDB = async () => {
    const db = await openDatabase();

    // Create tables with proper relationships using execAsync to execute multiple SQL statements at once as a transaction
    try {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS music (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                uri TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS music_groups (
                music_id INTEGER,
                group_id INTEGER,
                PRIMARY KEY (music_id, group_id),
                FOREIGN KEY (music_id) REFERENCES music (id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
            );
        `);

        console.log("Database initialised");
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
}

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
                'INSERT OR IGNORE INTO groups (name) VALUES (?)', [groupName]
            );

            // Get the group ID
            const group = await db.getFirstAsync<Group>(
                'SELECT id FROM groups WHERE name = ?', [groupName]
            );

            // Checks to see if a group id was returned, otherwise, an error is thrown
            if (!group || typeof group.id == 'undefined') {
                throw new Error(`Group "${groupName}" not found after insertion`)
            }

            // Create the relationship between the music item and the group(s)
            await db.runAsync(
                'INSERT INTO music_groups (music_id, group_id) VALUES (?, ?)', [musicId, group.id]
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

/**
 * Gets all music with their groups
 * @returns Array of music items with their groups
 */
export const getAllMusicWithGroups = async (): Promise<
  Array<MusicItem & { groups: string[] }>
> => {
    const db = await openDatabase();

    // Get all music items from the music table
    const musicItems = await db.getAllAsync<MusicItem>('SELECT * FROM music');

    try {
        // For each music item, get its groups
        const result = await Promise.all(
            musicItems.map(async (music) => {
            // Checks to see if the music item exists and is retrievable
            if (!music || typeof music.id == "undefined") {
                throw new Error("Unable to retrieve music item");
            }

            const groups = await db.getAllAsync<{ name: string }>(
                `SELECT g.name
                    FROM groups g
                    JOIN music_groups mg ON g.id = mg.group_id
                    WHERE mg.music_id = ?`,
                [music.id]
            );

            // Returns the music array mapped to the groups from sub-function
            return {
                ...music, // Expanded music array
                groups: groups.map((g) => g.name),
            };
            })
        );

        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Get music items that belong to all of the specified groups
 * @param groupNames - Array of group names to filter by
 * @returns Array of music items that belong to all specified groups
 */
export const getMusicByMultipleGroups = async (groupNames: string[]) : Promise<MusicItem[]> => {
    // If the groupNames param is empty, return an empty array
    if (groupNames.length === 0) {
        return [];
    }

    const db = await openDatabase();

    // Create placeholders for the query
    const placeholders = groupNames.map(() => '?').join(',');

    // Query for all music items that match the specified groups, grouped by groupName
    const result = await db.getAllAsync<MusicItem>(
        `SELECT m.*
        FROM music m
        JOIN music_groups mg ON m.id = mg.music_id
        JOIN groups g ON mg.group_id = g.id
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

  // Due to ON DELETE CASCADE, this will also remove entries in music_groups
  (await db).runAsync('DELETE FROM music WHERE id = ?', [id]);
}

/**
 * Add a music item to a group
 * @param musicId - ID of the music item
 * @param groupName - Name of the group
 */
export const addMusicToGroup = async (musicId: number, groupName: string) => {
    const db = await openDatabase();

    try {
        await db.execAsync('BEGIN TRANSACTION');

        // Insert group if it doesn't exist
        await db.runAsync(
            'INSERT OR IGNORE INTO groups (name) VALUES (?)', [groupName]
        );

        // Get the group ID
        const group = await db.getFirstAsync<Group>(
            'SELECT id FROM groups WHERE name = ?', [groupName]
        );

        // Verify if we get a valid group
        if (!group || typeof group.id == "undefined") {
            throw new Error(`Group "${groupName}" not found`);
        }

        // Create the relationship between the musicItem and its group
        await db.runAsync(
            'INSERT OR IGNORE INTO music_groups (music_id, group_id) VALUES (?, ?)',
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
export const removeMusicFromGroup = async (musicId: number, groupName: string) => {
    const db = await openDatabase();

    // Deletes item from group by ID
    await db.runAsync(
        `DELETE FROM music_groups
        WHERE music_id = ? AND group_id = (
            SELECT id FROM groups WHERE name = ?
        )`, [musicId, groupName]
    );
}

/**
 * Drops specified tables from the database
 * @param tableNames - Array of table names to drop
 * @returns Promise that resolves when all tables are dropped
 */
export const dropTables = async (tableNames: string[] = ['music_groups', 'music', 'groups']) => {
    const db = await openDatabase();
    
    try {
      // Begin transaction to ensure atomicity
      await db.execAsync('BEGIN TRANSACTION');
      
      // Drop tables in the correct order to respect foreign key constraints
      for (const tableName of tableNames) {
        await db.execAsync(`DROP TABLE IF EXISTS ${tableName}`);
        console.log(`Table ${tableName} dropped successfully`);
      }
      
      // Commit the transaction
      await db.execAsync('COMMIT');
      console.log('All specified tables dropped successfully');
      
      // Option to reinitialize the database after dropping
      return true;
    } catch (error) {
      // Rollback on error
      await db.execAsync('ROLLBACK');
      console.error('Error dropping tables:', error);
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