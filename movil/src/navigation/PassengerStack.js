import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PassengerDashboardScreen from '../../screens/PassengerDashboardScreen';
import SearchTripScreen from '../../screens/SearchTripScreen';
import TripResultsScreen from '../../screens/TripResultsScreen';
import TripDetailScreen from '../../screens/TripDetailScreen';
import MyRequestsScreen from '../../screens/MyRequestsScreen';
import ActiveTripScreen from '../../screens/ActiveTripScreen';
import RatingScreen from '../../screens/RatingScreen';
import ReportScreen from '../../screens/ReportScreen';
import DriverRegistrationScreen from '../../screens/DriverRegistrationScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import ChatScreen from '../../screens/ChatScreen';
import ChatListScreen from '../../screens/ChatListScreen';
import FriendsScreen from '../../screens/FriendsScreen';

const Stack = createNativeStackNavigator();

export default function PassengerStack() {
  return (
    <Stack.Navigator
      initialRouteName="PassengerDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="PassengerDashboard" component={PassengerDashboardScreen} />
      <Stack.Screen name="SearchTrip" component={SearchTripScreen} />
      <Stack.Screen name="TripResults" component={TripResultsScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
    </Stack.Navigator>
  );
}
