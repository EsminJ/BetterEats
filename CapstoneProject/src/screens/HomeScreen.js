import React from 'react';
import{View,Text,StyleSheet,TextInput,TouchableOpacity} from 'react-native'
import{SafeAreaView} from 'react-native-safe-area-context'
import{StatusBar} from 'expo-status-bar'

export default function HomeScreen({ user, onSignOut, navigation }){
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style = "dark"/>
            <View style={styles.header}>
              <Text style={styles.subtitle}>Welcome back</Text>
              <Text style={styles.title}>{user || 'Guest'}</Text>
            </View>

            <TextInput
            placeholder = "Search for foods/meals"
            placeholderTextColor = "#"
            style={styles.search}
            ></TextInput>

            <View style={styles.row}>
                <Button title="Scan Food" onPress={() => navigation?.navigate('Camera')}></Button>
                <Button title="Log Meal" onPress={() => {}}></Button>
                <Button title="Log Weight" onPress={() => {}} ></Button>
            </View>

            {onSignOut ? (
              <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            ) : null}

        </SafeAreaView>
    );
}

function Button({title,onPress}){
    return(
        <TouchableOpacity style={styles.Button} onPress={onPress}>
            <Text style={styles.buttonText}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {flex:1, backgroundColor: "#ffffff", padding:5, paddingBottom:30},
    header:{marginTop:60, marginBottom:20, alignItems:"center"},
    title: {fontSize: 40, fontWeight: "700", textAlign:"center"},
    subtitle: {color:"#929aa8", fontSize: 18, textAlign:"center"},
    search:{borderWidth:3, borderColor: "#000000", backgroundColor:"#f9fafb",
    borderRadius:12, paddingHorizontal:8, paddingVertical:10},
    row:{flexDirection:"row", gap:8, marginTop:20, marginBottom:10},
    Button: {flex:1, backgroundColor:"#0eafe9", paddingVertical: 20, borderRadius: 10, alignItems: "center",
    justifyContent: "center"},
    buttonText:{color:"#ffffff", fontSize: 15, fontWeight:"400"},
    signOutButton:{marginTop:"auto", backgroundColor:"#c62828", paddingVertical:10, paddingHorizontal:20, borderRadius:8, alignSelf:"stretch"},
    signOutText:{color:"#ffffff", fontSize:15, fontWeight:"600", textAlign:"center"}
  });
