import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Imports the navigation capabilitiies
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    // The __DEV__ constant is true when in development mode
    const showDevTools = __DEV__;

    const [dbReady, setDbReady] = useState(false);

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
              <NavigationContainer>
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



