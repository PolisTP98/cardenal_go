/* Zona 1: Importaciones de componentes y archivos */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import React, {useState} from 'react';
import PantallaPasajero from './PantallaPasajero';
import PantallaConductor from './PantallaConductor';

/* Zona 2: Main - Hogar de los componentes */
export default function MenuScreen() {
    const [screen, setScreen] = useState('menu');

    switch(screen){
        case 'pasajero': 
            return <PantallaPasajero/>
        case 'conductor':
            return <PantallaConductor/>
        case 'menu':
            default:
            return (
            <View style = {styles.container}>
            
                <Text> Menu </Text>

                <Button onPress={() => setScreen('pasajero')} title='Pasajero'/>

                <Button onPress={() => setScreen('conductor')} title='Conductor'/>
                <StatusBar style="auto" />

            </View>
        );
    }

}

/* Zona 3: Estilos y posicionamiento */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  }
});