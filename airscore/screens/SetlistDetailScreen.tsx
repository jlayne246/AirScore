import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { MusicItemWithAllData } from '../types';
import { getMusicIdsForSetlist, getMusicWithAllData } from '../utils/database';
import MusicItemCard from '../components/MusicItemCard';

const SetlistDetailScreen = ({ route, navigation }: any) => {
    const { setlistId, setlistName } = route.params;

    const [scores, setScores] = useState<MusicItemWithAllData[]>([]);

    useEffect(() => {
        const load = async () => {
            const ids = await getMusicIdsForSetlist(setlistId);

            const allMusic = await getMusicWithAllData();

            setScores(
                allMusic.filter(m => ids.includes(m.id!))
            );
        };

        load();
    }, [setlistId]);

    const musicIds = scores
        .map(score => score.id)
        .filter((id): id is number => typeof id === 'number');

    return (
        <FlatList
            data={scores}
            keyExtractor={(item) => item.id!.toString()}
            renderItem={({ item, index }) => (
                <MusicItemCard
                    item={item}
                    onOpen={() =>
                            navigation.navigate("Reader", {
                            uri: item.uri,
                            musicId: item.id,
                            context: {
                                setlistId: setlistId,
                                setlistName: setlistName,
                                currentIndex: index + 1,
                                totalItems: scores.length,
                                musicIds
                            },
                        })
                    }
                    onEditMetadata={() => {}}
                    onDelete={() => {}}
                />
            )}
        />
    );
};

export default SetlistDetailScreen;