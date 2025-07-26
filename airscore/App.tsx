import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Imports the navigation capabilitiies
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SafeAreaProvider } from 'react-native-safe-area-context';

// Imports the different screens
import LibraryScreen from './screens/LibraryScreen';
import ReaderScreen from './screens/ReaderScreen';
import DashboardScreen from './screens/DashboardScreen';

import DevToolsButton from "./components/DevToolsButton";
import TestComponent from "./components/TestTailwind";

import { MenuProvider } from 'react-native-popup-menu';

import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    // The __DEV__ constant is true when in development mode
    const showDevTools = __DEV__;

    console.log(showDevTools)

    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: 'black' }}>

        {/* <View className="flex-1 bg-black"> */}
          <MenuProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Dashboard">
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Library" component={LibraryScreen} />
                <Stack.Screen name="Reader" component={ReaderScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </MenuProvider>

          {__DEV__ && <DevToolsButton />}
        </View>
      </SafeAreaProvider>
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



