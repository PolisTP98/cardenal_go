import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../components/Theme';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DriverDashboardScreen from '../../screens/DriverDashboardScreen';
import PublishTripScreen from '../../screens/PublishTripScreen';
import MyTripsScreen from '../../screens/MyTripsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { isDriver } = useAuth();
  const insets = useSafeAreaInsets();

  const DashboardComponent = DriverDashboardScreen;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#EEE',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          height: 65 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={DashboardComponent}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Publicar"
        component={PublishTripScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paper-plane" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Si el usuario es solo pasajero, interceptar e impedir abrir PublishTrip
            if (!isDriver) {
              e.preventDefault();
              navigation.navigate('DriverRegistration');
            }
          },
        })}
      />
      <Tab.Screen
        name="Mis Viajes"
        component={MyTripsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Si el usuario es solo pasajero, interceptar e impedir abrir Mis Viajes
            if (!isDriver) {
              e.preventDefault();
              navigation.navigate('DriverRegistration');
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}
