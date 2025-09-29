import React from 'react';
import{View,Text,StyleSheet,TextInput,TouchableOpacity} from 'react-native'
import{SafeAreaView} from 'react-native-safe-area-context'
import{StatusBar} from 'expo-status-bar'

export default function HomeScreen(){
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style = "dark"/>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Track your meals, goals, and progress</Text>

            <TextInput
            placeholder = "Search for foods/meals"
            placeholderTextColor = "#"
            style={styles.search}
            ></TextInput>

            <View style={styles.row}>
                <Button title="Log Meal" onPress={() => {}}></Button>
                <Button title= "Log Weight" onPress={() => {}} ></Button>
            </View>

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
    container: {flex:1, backgroundColor: "#ffffff", padding:5},
    title: {fontSize: 40, fontWeight: "400"},
    subtitle: {color:"#929aa8", marginTop:20 ,marginBottom:10},
    search:{borderWidth:3, borderColor: "#000000", backgroundColor:"#f9fafb",
    borderRadius:12, paddingHorizontal:8, paddingVertical:10},
    row:{flexDirection:"row", gap:8, marginTop:20, marginBottom:10},
    Button: {flex:1, backgroundColor:"#0eafe9", paddingVertical: 20, borderRadius: 10, alignItems: "center",
    justifyContent: "center"},
    buttonText:{color:"#ffffff", fontSize: 15, fontWeight:"400"}
  });