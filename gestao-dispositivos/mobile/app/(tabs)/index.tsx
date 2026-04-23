import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';

interface Aparelho {
  id: number;
  modelo: string;
  imei: string;
  numero_serie: string;
  status: string;
}

export default function HomeScreen() {
  const [aparelhos, setAparelhos] = useState<Aparelho[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // 1. Buscar os dados (GET)
const buscarDados = async () => {
  try {
    // Puxa o IP do arquivo .env
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    
    // Usa a crase (`) em vez de aspas para juntar a variável com o caminho
    const response = await fetch(`${API_URL}/aparelhos`);
    const data = await response.json();
    setAparelhos(data);
  } catch (error) {
    console.error("Erro na API:", error);
  } finally {
    setCarregando(false);
    setAtualizando(false);
  }
};

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    buscarDados();
  }, []);

  useEffect(() => {
    buscarDados();
  }, []);

  // 2. Excluir Aparelho (DELETE)
  const confirmarExclusao = (id: number, modelo: string) => {
    Alert.alert(
      "Atenção!",
      `Tem certeza que deseja excluir o ${modelo}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sim, excluir", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`http://10.0.36.8:5000/aparelhos/${id}`, { method: 'DELETE' });
              if (response.ok) buscarDados(); // Recarrega a lista após apagar
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir.");
            }
          }
        }
      ]
    );
  };

  // 3. Mudar Status (PUT)
  const mudarStatus = (id: number, modelo: string) => {
    Alert.alert(
      `Atualizar Status: ${modelo}`,
      "Escolha o novo status:",
      [
        { text: "Disponível", onPress: () => atualizarNaApi(id, "Disponível") },
        { text: "Em Manutenção", onPress: () => atualizarNaApi(id, "Em Manutenção") },
        { text: "Emprestado", onPress: () => atualizarNaApi(id, "Emprestado") },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  const atualizarNaApi = async (id: number, novoStatus: string) => {
    try {
      await fetch(`http://10.0.36.8:5000/aparelhos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      buscarDados(); // Atualiza a tela com a nova cor/status
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  };

  if (carregando) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.centro} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>📱 Dispositivos</Text>
        <TouchableOpacity style={styles.botaoAtualizar} onPress={buscarDados}>
          <Text style={styles.textoBotaoAtualizar}>Atualizar</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={aparelhos}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.modelo}>{item.modelo}</Text>
              <Text style={styles.detalhe}>S/N: {item.numero_serie}</Text>
              <Text style={styles.detalhe}>IMEI: {item.imei}</Text>
              
              <TouchableOpacity onPress={() => mudarStatus(item.id, item.modelo)}>
                <View style={[styles.badge, { backgroundColor: item.status === 'Disponível' ? '#dcfce7' : item.status === 'Em Manutenção' ? '#fef08a' : '#fee2e2' }]}>
                  <Text style={{ color: item.status === 'Disponível' ? '#166534' : item.status === 'Em Manutenção' ? '#854d0e' : '#991b1b', fontWeight: 'bold' }}>
                    {item.status} ✏️
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.botaoExcluir} onPress={() => confirmarExclusao(item.id, item.modelo)}>
              <Text style={styles.textoExcluir}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum aparelho encontrado.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  centro: { flex: 1, justifyContent: 'center' },
  botaoAtualizar: { backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  textoBotaoAtualizar: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  info: { flex: 1 },
  modelo: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 4 },
  detalhe: { fontSize: 14, color: '#64748b' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 },
  botaoExcluir: { padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginLeft: 10 },
  textoExcluir: { fontSize: 20 },
  vazio: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});