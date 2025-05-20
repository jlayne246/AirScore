import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MusicItem } from '../types';

import { UploadLocalPDF } from '../utils/fileUtils';
import { initDB, insertMusic, getAllMusicWithGroups, getMusicByMultipleGroups } from "../utils/database";

const LibraryScreen = ({}) => {
    const [musicList, setMusicList] = useState<Array<MusicItem & { groups: string[] }>>([]);
    const [loading, setLoading] = useState(false);

    type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Library'>;

    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        initDB();
        loadMusic(); // Call on mount
    }, []);

    const loadMusic = async () => {
        try {
            const results = await getAllMusicWithGroups();
            setMusicList(results); // Set the state here
        } catch (error) {
            console.error('Failed to load music:', error);
        }
    };

    const refreshMusicList = async () => {
        const results = await getAllMusicWithGroups();
        setMusicList(results);
    };

    const handleImport = async () => {
        setLoading(true); // Show loading modal
        const uri = await UploadLocalPDF();
    
        if (uri) {
            try {
                const title = uri.split('/').pop() || 'Untitled';
                const now = new Date().toISOString();
                await insertMusic(title, uri, ['Ungrouped'], now); // Await for DB insert
                await loadMusic(); // Refresh after insert
            } catch (error) {
                console.error("Failed to insert music:", error);
            } finally {
                setLoading(false); // Hide loading modal
            }
        } else {
            setLoading(false); // Hide if no file selected
        }
    };
    

    const openPDF = (uri: string) => {
        navigation.navigate('Reader', { uri });
    };

    return (
        <View className="flex-1 p-4 bg-black">
            <Button title="Import PDF" onPress={handleImport} />
            <FlatList 
                data={musicList}
                keyExtractor={item => item.id?.toString() || ''}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => openPDF(item.uri)} style={styles.listElement}>
                        <Text className="text-white text-lg py-3">{item.title}</Text>
                        {item.created_at && (
                            <Text className="text-gray-400 text-sm">
                                Added on {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            />
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loaderBox}>
                        <ActivityIndicator size="large" color="#ffffff" />
                        <Text style={styles.loadingText}>Importing PDF...</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

export default LibraryScreen;

const styles = StyleSheet.create({
    loadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loaderBox: {
        backgroundColor: '#222',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        margin: 0
    },
    loadingText: {
        marginTop: 12,
        color: 'white',
        fontSize: 16,
    },
    listElement: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "gray"
    }
});
