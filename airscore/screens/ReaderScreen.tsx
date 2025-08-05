import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PDFViewer from '../components/PDFViewer';

import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type ReaderScreenProps = {
    route: RouteProp<RootStackParamList, 'Reader'>;
    navigation: any;
};

const ReaderScreen = ({ route }: ReaderScreenProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { uri } = route.params;

    React.useLayoutEffect(() => {
        navigation.setOptions({
        headerTitle: 'Sheet Music Viewer',
        headerStyle: {
            backgroundColor: 'white',
        },
        headerTintColor: 'black',
        });
    }, [navigation]);

    return (
        <SafeAreaView style={{ flex: 1 }}>
        <PDFViewer uri={uri} />
        </SafeAreaView>
    );
};

export default ReaderScreen;
