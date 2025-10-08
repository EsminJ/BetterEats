import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import CreateAccount from './src/screens/CreateAccount';
import LoginPage from './src/screens/LoginPage';

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

  const renderScreen = () => {
    if (screen === 'home' && user) {
      return <HomeScreen user={user} onSignOut={handleSignOut} />;
    }

    if (screen === 'create') {
      return <CreateAccount onBack={() => setScreen('login')} />;
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onCreateAccount={() => setScreen('create')}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
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
