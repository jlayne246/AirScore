import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { RefreshControl, View, ScrollView, Text, FlatList, SectionList, Animated, Button, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MusicItem, MusicItemWithAllData, MetadataFormData, MusicMetadata } from '../types';

import {MaterialIcons, Ionicons} from '@expo/vector-icons';
import * as SolarIconSet from "solar-icon-set";

import MusicItemCard from '../components/MusicItemCard';

const DashboardScreen = ({}) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    useLayoutEffect(() => {
        navigation.setOptions({
            header: () => (
                <View
                    style={{
                        height: 100,
                        backgroundColor: 'white',
                        justifyContent: 'flex-end',
                        padding: 12,
                    }}
                >
                <Text
                    style={{
                        color: 'black',
                        fontWeight: '300',
                        fontSize: 24,
                        padding: 12,
                        marginLeft: 20,
                        marginTop: 12,
                    }}
                >
                    AirScore
                </Text>
                </View>
            ),
            });

    }, [navigation]);

    const [recentMusicItems, setRecentMusicItems] = useState<MusicItemWithAllData[]>([]);

    return (
        <View className="flex-1 bg-white">
            {/* Quick Options Menu */}
            <View className="flex-row justify-between pt-10 pb-10 mt-4 mb-4 bg-white shadow-md w-[75%] self-center rounded-lg">
                {/* Library */}
                <View className="flex-1 justify-center items-center">
                    <TouchableOpacity className="p-2 m-1 rounded justify-center items-center w-full" onPress={() => navigation.navigate('Library')}>
                        <MaterialIcons name="library-music" size={48} color="dodgerblue" />
                        <Text className="text-[16px] text-dodger p-1">Library</Text>
                    </TouchableOpacity>
                </View>

                <View className="w-px h-full bg-dodger" />

                {/* Sets */}
                <View className="flex-1 justify-center items-center">
                    <TouchableOpacity className="p-2 m-1 rounded justify-center items-center w-full">
                        <Ionicons name="folder-open" size={48} color="dodgerblue" />
                        <Text className="text-[16px] text-dodger p-1">Sets</Text>
                    </TouchableOpacity>
                </View>

                <View className="w-px h-full bg-dodger" />

                {/* Add Score */}
                <View className="flex-1 justify-center items-center">
                    <TouchableOpacity className="p-2 m-1 rounded justify-center items-center w-full">
                        <MaterialIcons name="add" size={48} color="dodgerblue" />
                        <Text className="text-[16px] text-dodger p-1">Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View className='flex-1 ml-14'>
                <Text className="text-dodger text-xl mt-4">Recent Items</Text>

                {recentMusicItems && (recentMusicItems.length > 0) ? (
                    <FlatList
                        data={recentMusicItems}
                        renderItem={({ item }) => (
                            <MusicItemCard
                                item={item as MusicItemWithAllData}
                                onEditMetadata={(id, title) => console.log(`Edit ${id} with title ${title}`)}
                                onDelete={(id) => console.log(`Delete ${id}`)}
                                onShare={(id) => console.log(`Share ${id}`)}
                            />
                    )}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={{ padding: 10 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={false}
                            onRefresh={() => console.log('Refreshing...')}
                        />
                    } />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-gray-500 text-lg">No recent items.</Text>
                    </View>
                )}
            </View>

            {/* Placeholder for future content */}
        </View>
    )
}

export default DashboardScreen;
