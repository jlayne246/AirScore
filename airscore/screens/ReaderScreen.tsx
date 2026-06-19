import React, { useEffect } from 'react';
import { View, Text, SafeAreaView } from 'react-native';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PDFViewer from '../components/PDFViewer';
import BufferedPDFViewer from '../components/BufferedPDFViewer';

import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { markMusicAsOpened } from '../utils/database';

type ReaderScreenProps = {
    route: RouteProp<RootStackParamList, 'Reader'>;
    navigation: any;
};

const ReaderScreen = ({ route }: ReaderScreenProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { uri, musicId } = route.params as { uri: string; musicId?: number };

    if (!uri) {
        return <Text>No PDF selected.</Text>;
    }

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: 'Sheet Music Viewer',
            headerStyle: {
                backgroundColor: 'white',
            },
            headerTintColor: 'black',
        });
    }, [navigation]);

    useEffect(() => {
        if (musicId) {
            markMusicAsOpened(musicId);
        }
    }, [musicId]);

    return (
        <SafeAreaView style={{ flex: 1 }}>
        <BufferedPDFViewer uri={uri} />
        </SafeAreaView>
    );
};

export default ReaderScreen;
