import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PDFViewer from '../components/PDFViewer';
import BufferedPDFViewer from '../components/BufferedPDFViewer';

import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getMusicWithAllData, getMusicWithMetadata, markMusicAsOpened } from '../utils/database';

type ReaderScreenProps = {
    route: RouteProp<RootStackParamList, 'Reader'>;
    navigation: any;
};

const ReaderScreen = ({ route }: ReaderScreenProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { uri, musicId } = route.params as { uri: string; musicId?: number };

    const [title, setTitle] = useState("Untitled");
    const [composer, setComposer] = useState("");
    const [setlistLabel, setSetlistLabel] = useState("");

    useEffect(() => {
        const loadMetadata = async () => {
            if (!musicId) return;

            const items = await getMusicWithMetadata(musicId);
            const item = Array.isArray(items) ? items[0] : items;
            if (!item) return;

            setTitle(item.metadata?.title ?? item.title ?? "Untitled");
            setComposer(item.composer ?? "");
            setSetlistLabel(item.setlists?.[0] ?? "");
        };

        loadMetadata();
    }, [musicId]);

    if (!uri) {
        return <Text>No PDF selected.</Text>;
    }

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        if (musicId) {
            markMusicAsOpened(musicId);
        }
    }, [musicId]);

    return (
        <SafeAreaView style={{ flex: 1 }}>
        <BufferedPDFViewer 
            uri={uri} 
            musicId={musicId}
            title={title}
            composer={composer}
            setlistLabel={setlistLabel}
        />
        </SafeAreaView>
    );
};

export default ReaderScreen;
