import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PDFViewer from '../components/PDFViewer';
import BufferedPDFViewer from '../components/BufferedPDFViewer';

import { RouteProp } from '@react-navigation/native';
import { MusicMetadataWithLabels, RootStackParamList } from '../types';
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
    const [music, setMusic] = useState<any>(null);

    const loadMetadata = async () => {
        if (!musicId) return;

        const items = await getMusicWithMetadata(musicId);
        const item = Array.isArray(items) ? items[0] : items;

        if (!item) return;

        setMusic(item);
    };

    useEffect(() => {
        loadMetadata();
    }, [musicId]);

    if (!uri) {
        return <Text>No PDF selected.</Text>;
    }

    if (!musicId) {
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
            score={{
                title: music?.metadata?.title ?? music?.title ?? "Untitled",
                document_type: music?.document_type ?? "Single Work",
                composer: music?.composer ?? "",
                arranger: music?.arranger ?? "",
                editor: music?.editor ?? "",
                publisher: music?.publisher ?? "",
                notes: music?.notes ?? "",
                labels: music?.labels ?? [],
            }}
            onMetadataUpdated={async () => {
                await loadMetadata();
            }}
        />
        </SafeAreaView>
    );
};

export default ReaderScreen;
