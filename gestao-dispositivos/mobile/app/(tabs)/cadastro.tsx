import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';

export default function CadastroScreen() {
  const [modelo, setModelo] = useState('');
  const [imei, setImei] = useState('');
  const [serie, setSerie] = useState('');

  // Salvar novo aparelho (POST)
  const salvarAparelho = async () => {
    if (!modelo || !imei || !serie) {
      Alert.alert("Erro", "Preencha todos os campos!");
      return;
    }

    try {
      const response = await fetch('http://10.0.36.8:5000/aparelhos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelo: modelo,
          imei: imei,
          numero_serie: serie,
          status: 'Disponível'
        })
      });

      if (response.ok) {
        Alert.alert("Sucesso", "Aparelho cadastrado no banco de dados!");
        // Limpa o formulário após salvar
        setModelo(''); setImei(''); setSerie('');
      } else {
        const errorData = await response.json();
        Alert.alert("Erro", errorData.erro || "Falha ao cadastrar.");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível conectar à API.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>➕ Novo Dispositivo</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Modelo do Aparelho</Text>
        <TextInput style={styles.input} value={modelo} onChangeText={setModelo} placeholder="Ex: Zebra TC21 ou Samsung S23" />

        <Text style={styles.label}>IMEI</Text>
        <TextInput style={styles.input} value={imei} onChangeText={setImei} keyboardType="numeric" placeholder="Digite os 15 dígitos" />

        <Text style={styles.label}>Número de Série</Text>
        <TextInput style={styles.input} value={serie} onChangeText={setSerie} placeholder="S/N do fabricante" />

        <TouchableOpacity style={styles.botao} onPress={salvarAparelho}>
          <Text style={styles.textoBotao}>Salvar no Sistema</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc', paddingTop: 60 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 30 },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3 },
  label: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  botao: { backgroundColor: '#10b981', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  textoBotao: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});