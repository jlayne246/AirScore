import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

// Imports the navigation capabilitiies
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useShareIntent } from "expo-share-intent";

// Imports the different screens
import LibraryScreen from './screens/LibraryScreen';
import ReaderScreen from './screens/ReaderScreen';
import DashboardScreen from './screens/DashboardScreen';
import SetlistsScreen from './screens/SetlistsScreen';
import SetlistDetailScreen from './screens/SetlistDetailScreen';

import DevToolsButton from "./components/DevToolsButton";
import TestComponent from "./components/TestTailwind";

import { MenuProvider } from 'react-native-popup-menu';

import { RootStackParamList } from './types';
import { useEffect, useState } from 'react';
import { initDB } from './utils/database';
import { importPdfFromUri } from './utils/fileUtils';

const Stack = createNativeStackNavigator<RootStackParamList>();

import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

export default function App() {
    // The __DEV__ constant is true when in development mode
    const showDevTools = __DEV__;

    const [dbReady, setDbReady] = useState(false);
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

    useEffect(() => {
      const start = async () => {
        try {
          await initDB();
          setDbReady(true);
        } catch (error) {
          console.error("Database startup failed:", error);
        }
      };

      start();
    }, []);

    useEffect(() => {
      const handleSharedPdf = async () => {
        if (!dbReady || !hasShareIntent) return;

        const file = shareIntent?.files?.[0];

        if (!file || file.mimeType !== "application/pdf") return;

        const imported = await importPdfFromUri(
          file.path,
          file.fileName ?? "Imported PDF.pdf"
        );

        resetShareIntent();

        if (navigationRef.isReady()) {
          navigationRef.navigate("Library", {
            pendingImport: {
              uri: imported.uri,
              originalFilename: imported.originalFilename,
            },
          });
          // Later: navigate to metadata import screen
        }
      };

      handleSharedPdf();
    }, [dbReady, hasShareIntent, shareIntent]);

    useEffect(() => {
      const handleUrl = async (url: string) => {
        console.log("Incoming URL:", url);

        if (!url.toLowerCase().includes(".pdf")) return;

        const imported = await importPdfFromUri(
          url,
          decodeURIComponent(url.split("/").pop() ?? "Imported PDF.pdf")
        );

        if (navigationRef.isReady()) {
          navigationRef.navigate("Library", {
            pendingImport: {
              uri: imported.uri,
              originalFilename: imported.originalFilename,
            },
          });
          // Later: navigate to metadata import screen
        }
      };

      Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });

      const subscription = Linking.addEventListener("url", ({ url }) => {
        handleUrl(url);
      });

      return () => subscription.remove();
    }, []);

    if (!dbReady) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", width: "100%" }}>
          <ActivityIndicator />
        </View>
      );
    }

    console.log(showDevTools)

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: 'black', width: '100%' }}>

          {/* <View className="flex-1 bg-black"> */}
            <MenuProvider>
              <NavigationContainer ref={navigationRef}>
                <Stack.Navigator initialRouteName="Dashboard">
                  <Stack.Screen name="Dashboard" component={DashboardScreen} />
                  <Stack.Screen name="Library" component={LibraryScreen} />
                  <Stack.Screen
                    name="Reader"
                    component={ReaderScreen}
                    initialParams={{ uri: '' }}
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen name="Setlists" component={SetlistsScreen} />
                  <Stack.Screen name="SetlistDetail" component={SetlistDetailScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </MenuProvider>

            {__DEV__ && <DevToolsButton />}
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );  
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });



