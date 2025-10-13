import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import CreateAccount from './src/screens/CreateAccount';
import LoginPage from './src/screens/LoginPage';
import CameraScreen from './src/screens/CameraScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login');

  const handleLogin = (username) => {
    setUser(username);
    setScreen('home');
  };

  const handleSignOut = () => {
    setUser(null);
    setScreen('login');
  };

  if (screen === 'home' && user) {
    return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            options={{ headerShown: false }}
          >
            {(props) => <HomeScreen user={user} onSignOut={handleSignOut} navigation={props.navigation} />}
          </Stack.Screen>
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen}
            options={{ 
              title: 'Food Scanner',
              headerStyle: { backgroundColor: '#0eafe9' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    );
  }

  if (screen === 'create') {
    return (
      <View style={styles.container}>
        <CreateAccount onBack={() => setScreen('login')} />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoginPage
        onLogin={handleLogin}
        onCreateAccount={() => setScreen('create')}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
