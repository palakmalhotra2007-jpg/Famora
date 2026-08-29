import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList, FamilySetupParamList } from './types';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { JoinFamilyScreen } from '../screens/auth/JoinFamilyScreen';
import { CreateFamilyScreen } from '../screens/auth/CreateFamilyScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const SetupStack = createNativeStackNavigator<FamilySetupParamList>();

export function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="JoinFamily" component={JoinFamilyScreen} />
    </AuthStack.Navigator>
  );
}

export function FamilySetupNavigator() {
  return (
    <SetupStack.Navigator screenOptions={{ headerShown: false }}>
      <SetupStack.Screen name="CreateFamily" component={CreateFamilyScreen} />
      <SetupStack.Screen name="JoinFamily" component={JoinFamilyScreen} />
    </SetupStack.Navigator>
  );
}
