import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import VerifyCodeScreen from './screens/VerifyCodeScreen';
import NewPasswordScreen from './screens/NewPasswordScreen';
import PasswordSuccessScreen from './screens/PasswordSuccessScreen';

import SearchTripScreen from './screens/SearchTripScreen';
import TripResultsScreen from './screens/TripResultsScreen';
import PublishTripScreen from './screens/PublishTripScreen';
import ProfileScreen from './screens/ProfileScreen';
import DriverRegistrationScreen from './screens/DriverRegistrationScreen';
import TripHistoryScreen from './screens/TripHistoryScreen';

import ChatScreen from './screens/ChatScreen';
import ActiveTripScreen from './screens/ActiveTripScreen';
import RatingScreen from './screens/RatingScreen';
import ReportScreen from './screens/ReportScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="PublishTrip"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
          <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
          <Stack.Screen name="PasswordSuccess" component={PasswordSuccessScreen} />

          <Stack.Screen name="Home" component={SearchTripScreen} />
          <Stack.Screen name="TripResults" component={TripResultsScreen} />
          <Stack.Screen name="PublishTrip" component={PublishTripScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />

          <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
          <Stack.Screen name="TripHistory" component={TripHistoryScreen} />

          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
          <Stack.Screen name="Rating" component={RatingScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}