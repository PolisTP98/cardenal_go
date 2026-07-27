import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DriverDashboardScreen from '../../screens/DriverDashboardScreen';
import PublishTripScreen from '../../screens/PublishTripScreen';
import MyTripsScreen from '../../screens/MyTripsScreen';
import TripDetailScreen from '../../screens/TripDetailScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import ChatScreen from '../../screens/ChatScreen';
import ChatListScreen from '../../screens/ChatListScreen';
import FriendsScreen from '../../screens/FriendsScreen';

const Stack = createNativeStackNavigator();

export default function DriverStack() {
  return (
    <Stack.Navigator
      initialRouteName="DriverDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
      <Stack.Screen name="PublishTrip" component={PublishTripScreen} />
      <Stack.Screen name="MyTrips" component={MyTripsScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
    </Stack.Navigator>
  );
}
