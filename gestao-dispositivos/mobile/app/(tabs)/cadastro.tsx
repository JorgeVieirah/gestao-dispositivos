import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

// GARANTA QUE ESTE É O IP QUE FUNCIONOU NO NAVEGADOR DO CELULAR
const API_URL = 'http://172.20.10.2:5000';

export default function CadastroScreen() {
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [imei, setImei] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvarDispositivo = async () => {
    // 1. Validação básica
    if (!marca || !modelo || !numeroSerie) {
      Alert.alert("Campos Obrigatórios", "Por favor, preencha a Marca, Modelo e o Número de Série.");
      return;
    }

    setSalvando(true);

    // 2. Monta o pacote de dados igual ao que o Python espera
    const payload = {
      categoria: 'Celular', // Por enquanto estamos forçando Celular
      marca: marca.trim(),
      modelo: modelo.trim(),
      numero_serie: numeroSerie.trim(),
      imei: imei.trim(),
    };

    try {
      // 3. Envia para a API Python
      const response = await fetch(`${API_URL}/aparelhos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Sucesso!", "Dispositivo cadastrado no sistema.");
        // Limpa os campos após salvar
        setMarca('');
        setModelo('');
        setImei('');
        setNumeroSerie('');
      } else {
        Alert.alert("Erro ao Salvar", data.erro || "Verifique os dados e tente novamente.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro de Conexão", "Não foi possível conectar à API. Verifique o IP e se o servidor Python está rodando.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titulo}> Novo Dispositivo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Marca do Aparelho *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Samsung, Motorola, Apple..."
            value={marca}
            onChangeText={setMarca}
          />

          <Text style={styles.label}>Modelo do Aparelho *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Galaxy S23, Moto G52..."
            value={modelo}
            onChangeText={setModelo}
          />

          <Text style={styles.label}>IMEI (Apenas para celulares)</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite os 15 dígitos"
            keyboardType="numeric"
            value={imei}
            onChangeText={setImei}
            maxLength={15}
          />

          <Text style={styles.label}>Número de Série (S/N) *</Text>
          <TextInput
            style={styles.input}
            placeholder="S/N do fabricante"
            value={numeroSerie}
            onChangeText={setNumeroSerie}
            autoCapitalize="characters"
          />

          <TouchableOpacity 
            style={[styles.botaoSalvar, salvando && styles.botaoDesativado]} 
            onPress={salvarDispositivo}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.textoBotao}>Salvar no Sistema</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#23253a', paddingTop: 60 },
  header: { marginBottom: 20 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  card: { backgroundColor: '#353750', padding: 20, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#7b8696', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f8fafc', color: '#1e293b' },
  botaoSalvar: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  botaoDesativado: { backgroundColor: '#6ee7b7' },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});