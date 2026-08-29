import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { NewspaperScreen } from '../screens/home/NewspaperScreen';
import { AssistantScreen } from '../screens/home/AssistantScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="Newspaper"
        component={NewspaperScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Assistant"
        component={AssistantScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
