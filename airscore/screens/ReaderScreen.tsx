import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView } from 'react-native';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PDFViewer from '../components/PDFViewer';
import BufferedPDFViewer from '../components/BufferedPDFViewer';

import { RouteProp } from '@react-navigation/native';
import { MusicMetadataWithLabels, ReaderContext, RootStackParamList } from '../types';
import { getMusicWithAllData, getMusicWithMetadata, markMusicAsOpened } from '../utils/database';
import AirScorePdfRenderer from '../native/AirScorePdfRenderer';

type ReaderScreenProps = {
    route: RouteProp<RootStackParamList, 'Reader'>;
    navigation: any;
};

const ReaderScreen = ({ route }: ReaderScreenProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { uri, musicId, context, startPage } = route.params as { uri: string; musicId?: number, context: ReaderContext, startPage?: number };

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

    const openSetlistScore = async (
        nextIndex: number,
        openAt: "first" | "last" = "first"
    ) => {
        if (!context?.musicIds?.length) return;
        if (nextIndex < 0 || nextIndex >= context.musicIds.length) return;

        const nextMusicId = context.musicIds[nextIndex];

        const allMusic = await getMusicWithAllData();
        const fullItem = allMusic.find(item => item.id === nextMusicId);

        if (!fullItem?.uri) return;

        let startPage = 1;

        if (openAt === "last") {
            startPage = await AirScorePdfRenderer.getPageCount(fullItem.uri);
        }

        navigation.replace("Reader", {
            uri: fullItem.uri,
            musicId: nextMusicId,
            startPage,
            context: {
            ...context,
            currentIndex: nextIndex + 1,
            },
        });
    };

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
            onPreviousScore={() =>
                openSetlistScore(context.currentIndex - 2, "first")
            }

            onNextScore={() =>
                openSetlistScore(context.currentIndex, "first")
            }

            onPreviousScoreFromPageTurn={() =>
                openSetlistScore(context.currentIndex - 2, "last")
            }

            onNextScoreFromPageTurn={() =>
                openSetlistScore(context.currentIndex, "first")
            }
            context={context}
            initialPage={startPage}
        />
        </SafeAreaView>
    );
};

export default ReaderScreen;
