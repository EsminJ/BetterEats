import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import LoginPage from './src/screens/LoginPage';

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <View style={styles.container}>
      {user ? <HomeScreen user={user} onSignOut={() => setUser(null)} /> : <LoginPage onLogin={setUser} />}
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
