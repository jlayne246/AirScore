import React, { useEffect, useState } from 'react';
import { RefreshControl, View, ScrollView, Text, FlatList, Button, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MusicItem, MusicItemWithAllData, MetadataFormData } from '../types';

import { UploadLocalPDF } from '../utils/fileUtils';
import { initDB, insertMusic, getMusicWithAllData, getMusicByMultipleGroups, deleteMusic, saveCompleteMetadata } from "../utils/database";

import MetadataForm from '../components/MetadataForm'; // Adjust path as needed
import DeleteModal from '../components/DeleteModal'; // Adjust path as needed

const LibraryScreen = ({}) => {
    const [musicList, setMusicList] = useState<Array<MusicItem & { groups: string[] }>>([]);
    const [selectedMusicId, setSelectedMusicId] = useState<number | undefined>();
    const [deletedMusicId, setDeletedMusicId] = useState<number>();
    const [pendingPdfUri, setPendingPdfUri] = useState<string | null>(null);
    const [prefilledTitle, setPrefilledTitle] = useState<string | undefined>();
    const [infoboxMode, setInfoboxMode] = useState<string>("new");
    const [showMetadataForm, setShowMetadataForm] = useState(false);
    const [showDeleteForm, setShowDeleteForm] = useState(false);
    const [loading, setLoading] = useState(false);

    type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Library'>;

    const navigation = useNavigation<NavigationProp>();

    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        initDB();
        loadMusic(); // Call on mount
    }, []);

    const loadMusic = async () => {
        try {
            const results = await getMusicWithAllData();
            setMusicList(results); // Set the state here
        } catch (error) {
            console.error('Failed to load music:', error);
        }
    };

    const refreshMusicList = async () => {
        const results = await getMusicWithAllData();
        setMusicList(results);
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshMusicList();
        setTimeout(() => {
        setRefreshing(false);
        }, 2000);
    }, [refreshMusicList]);

    // Handle opening metadata form
    const handleEditMetadata = (musicId: number, musicTitle: string) => {
        setSelectedMusicId(musicId);
        setInfoboxMode("edit");
        setPrefilledTitle(undefined); // Clear prefilled title for existing items
        setShowMetadataForm(true);
    };

    // Handle metadata form save
    const handleMetadataSave = async (formData?: MetadataFormData) => {
        setShowMetadataForm(false);
        setSelectedMusicId(undefined);
        setPrefilledTitle(undefined);
      
        if (formData && pendingPdfUri) {
          try {
            const now = new Date().toISOString();
            
            // Create the music record first
            const insertedId = await insertMusic(
              formData.title,
              pendingPdfUri,
              formData.groups ?? ['Ungrouped'],
              now
            );

            console.log("Music Record Created")
            
            // Now save the metadata with the new musicId
            if (insertedId) {
              const metadataToSave = {
                title: formData.title,
                composer: formData.composer || '',
                genre: formData.genre || '',
                key_signature: formData.key_signature || '',
                rating: formData.rating || 0,
                difficulty: formData.difficulty || 0,
                time_signature: formData.time_signature || '',
                page_count: formData.page_count || 0,
                created_at: now,
                updated_at: now,
              };
              
              await saveCompleteMetadata(insertedId, metadataToSave, formData.labels || []);
            }
            
            setPendingPdfUri(null);
            await loadMusic(); // Refresh the music list
          } catch (err) {
            console.error('Error saving music and metadata:', err);
          }
        } else if (formData && selectedMusicId) {
          // This is for editing existing items - metadata form handles this
          await loadMusic(); // Just refresh the list
        } else {
          setPendingPdfUri(null); // Clear if cancelled
        }
    };
      

    // Handle metadata form cancel
    const handleMetadataCancel = () => {
        setShowMetadataForm(false);
        setSelectedMusicId(undefined);
        setPrefilledTitle(undefined); // Clear prefilled title
    };

    const handleImport = async () => {
        setLoading(true);
        const uri = await UploadLocalPDF();
      
        if (uri) {
          const raw_title = uri.split('/').pop() || 'Untitled';
          const title = raw_title.replace('.pdf', '');
      
          setPendingPdfUri(uri);              // store the file path
          setPrefilledTitle(title);          // prefill title for metadata form
          setInfoboxMode("new"); 
          setShowMetadataForm(true);         // show metadata form
        }
      
        setLoading(false);
      };
      
    
    const handleDelete = async (id: number) => {
        console.log("Handling Delete")
        setShowDeleteForm(true);
        setDeletedMusicId(id);
    }

    const openPDF = (uri: string) => {
        navigation.navigate('Reader', { uri });
    };

    // Render individual music item
    const renderMusicItem = ({ item }: { item: MusicItemWithAllData }) => (
        <View className="bg-white rounded-lg p-4 mb-3 flex-row justify-between items-center shadow-sm shadow-black/10 elevation-3">
        <View className="flex-1">
            <Text className="text-base font-semibold text-gray-800 mb-1">{item.metadata?.title ?? '[No title]'}</Text>
            <Text className="text-sm text-gray-600">
            Groups: {item.groups.length > 0 ? item.groups.join(', ') : 'None'}
            </Text>
            {item.metadata?.labels && item.metadata.labels.length > 0 && (
                <Text className="text-sm text-gray-500 mt-1">
                Labels: {item.metadata.labels.join(', ')}
                </Text>
            )}
        </View>
        
        <View className="flex-row gap-2">
            {/* Edit Metadata Button */}
            <TouchableOpacity
            className="bg-blue-500 py-1.5 px-3 rounded"
            onPress={() =>
                item.id && handleEditMetadata(item.id, item.metadata?.title ?? item.title)
              }
            >
                <Text className="text-white text-xs font-semibold">Info</Text>
            </TouchableOpacity>
            
            {/* Your existing buttons (play, edit, delete, etc.) */}
            <TouchableOpacity className="bg-red-500 py-1.5 px-3 rounded"
            onPress={() => item.id && handleDelete(item.id)}>
                <Text className="text-white text-xs font-semibold">Delete</Text>
            </TouchableOpacity>
        </View>
        </View>
    );

    // const deleteModal = (item_id: number) => (
    //     <View>
    //         <Text>Are you sure you want to delete?</Text>
    //         <TouchableOpacity
    //         className="bg-blue-500 py-1.5 px-3 rounded"
    //         >
    //             <Text className="text-white text-xs font-semibold">Cancel</Text>
    //         </TouchableOpacity>
    //         <TouchableOpacity className="bg-red-500 py-1.5 px-3 rounded"
    //         onPress={() => item_id && deleteMusic(item_id)}>
    //             <Text className="text-white text-xs font-semibold">Delete</Text>
    //         </TouchableOpacity>
    //     </View>
    // )

    return (
        <View className="flex-1 bg-white-100">
            {musicList && musicList.length > 0 ? (
                <FlatList
                    data={musicList}
                    renderItem={renderMusicItem}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    className="p-4"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                      }
                />
            ) : (
                <View className="flex-1 items-center justify-center px-4">
                    <Text className="text-center text-sm text-gray-600">
                        No music in library. Please press the (+) to add music.
                    </Text>
                </View>
            )}



            {/* Metadata Form Modal */}
            <MetadataForm
                visible={showMetadataForm}
                musicId={selectedMusicId}
                initialTitle={prefilledTitle} // New prop
                onSave={handleMetadataSave}
                onCancel={handleMetadataCancel}
                mode={infoboxMode}
            />

            {/* {loading && (
                <View className="absolute inset-0 bg-black/60 flex justify-center items-center z-50">
                    <View className="bg-gray-800 px-6 py-4 rounded-xl items-center w-64">
                        <ActivityIndicator size="large" color="#ffffff" />
                        <Text className="mt-3 text-white text-base text-center">Importing PDF...</Text>
                    </View>
                </View>
            )} */}

            {/* Delete Modal */}
            {showDeleteForm && (
                <DeleteModal
                    itemId={deletedMusicId!}
                    onCancel={() => setShowDeleteForm(false)}
                    onDelete={() => {
                    if (deletedMusicId) deleteMusic(deletedMusicId);
                    setShowDeleteForm(false); refreshMusicList();
                    }}
                />
            )}


            {/* Floating Import (+) Button */}
            <TouchableOpacity
                className="absolute bottom-6 right-6 bg-blue-500 rounded-full w-14 h-14 justify-center items-center shadow-md shadow-black/20 elevation-5"
                onPress={handleImport}
            >
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

        </View>
    );
};

export default LibraryScreen;