import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../components/Theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthStack from './AuthStack';

// Screens compartidas
import PassengerDashboardScreen from '../../screens/PassengerDashboardScreen';
import DriverDashboardScreen from '../../screens/DriverDashboardScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import ChatScreen from '../../screens/ChatScreen';
import ChatListScreen from '../../screens/ChatListScreen';
import FriendsScreen from '../../screens/FriendsScreen';
import TripDetailScreen from '../../screens/TripDetailScreen';
import ReportScreen from '../../screens/ReportScreen';
// Pasajero
import SearchTripScreen from '../../screens/SearchTripScreen';
import TripResultsScreen from '../../screens/TripResultsScreen';
import MyRequestsScreen from '../../screens/MyRequestsScreen';
import ActiveTripScreen from '../../screens/ActiveTripScreen';
import RatingScreen from '../../screens/RatingScreen';
import DriverRegistrationScreen from '../../screens/DriverRegistrationScreen';
// Conductor
import PublishTripScreen from '../../screens/PublishTripScreen';
import MyTripsScreen from '../../screens/MyTripsScreen';

const Stack = createNativeStackNavigator();

function MainStack() {
  const { isDriver } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={isDriver ? 'DriverDashboard' : 'PassengerDashboard'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* ── Dashboards ── */}
      <Stack.Screen name="PassengerDashboard" component={PassengerDashboardScreen} />
      <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
      {/* ── Compartidas ── */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      {/* ── Pasajero ── */}
      <Stack.Screen name="SearchTrip" component={SearchTripScreen} />
      <Stack.Screen name="TripResults" component={TripResultsScreen} />
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
      <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
      {/* ── Conductor ── */}
      <Stack.Screen name="PublishTrip" component={PublishTripScreen} />
      <Stack.Screen name="MyTrips" component={MyTripsScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  return <MainStack />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
