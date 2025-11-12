import React, { useContext } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LogScreen from './src/screens/LogScreen';
import AddFoodScreen from './src/screens/AddFoodScreen';
import WeightScreen from './src/screens/WeightScreen';
import CameraScreen from './src/screens/CameraScreen';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import AiCoachScreen from './src/screens/AiCoachScreen'; // new tab for AI Coach

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainAppTabs() {
  const { logout } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: 'BetterEats',
        headerTitleStyle: { fontWeight: '700', fontSize: 20, color: '#333' },
        headerTitleAlign: 'center',
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        ),
         headerRightContainerStyle: { paddingRight: 15 },
        tabBarActiveTintColor: '#3f51b5',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', paddingBottom: 5 },
        tabBarStyle: {
            paddingBottom: Platform.OS === 'ios' ? 0 : 5, 
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#ddd',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          size = size * 0.9; // Apply consistent size

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Log') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Weight') {
            iconName = focused ? 'barbell' : 'barbell-outline';
          } else if (route.name === 'AICoach') { // Add case for new screen
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Log" component={LogScreen} options={{ title: 'Meal Log' }}/>
      <Tab.Screen name="Weight" component={WeightScreen} options={{ title: 'Weight Log' }}/>
      
      {/* Added the new Tab Screen for AI Coach */}
      <Tab.Screen 
        name="AICoach" 
        component={AiCoachScreen} 
        options={{ title: 'AI Coach' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="MainApp" component={MainAppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AddFood" component={AddFoodScreen} options={{ presentation: 'modal', headerTitle: 'Add Custom Food', headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#333'}, headerTitleAlign: 'center', }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ headerTitle: 'Scan Meal', headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#333'}, headerTitleAlign: 'center' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// styles for logout Button
const styles = StyleSheet.create({
  logoutButton: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: '#c62828', borderRadius: 8, justifyContent: 'center', alignItems: 'center', },
  logoutButtonText: { color: '#c62828', fontSize: 16, fontWeight: '600', },
});