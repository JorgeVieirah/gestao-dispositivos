import React, { useEffect, useState, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Alert, Modal, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';

// MESMO IP QUE OS APARELHOS
const API_URL = 'http://172.20.10.2:5000'; 

interface Colaborador {
  id: number;
  nome: string;
  username: string;
}

export default function ColaboradoresScreen() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // Estados do Modal
  const [modalVisivel, setModalVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Estado para o formulário (serve tanto para criar quanto editar)
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');

  const buscarColaboradores = async () => {
    try {
      const response = await fetch(`${API_URL}/colaboradores`);
      const data = await response.json();
      setColaboradores(data);
    } catch (error) {
      console.error("Erro na API:", error);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    buscarColaboradores();
  }, []);

  useEffect(() => {
    buscarColaboradores();
  }, []);

  // Abrir Modal para NOVO colaborador
  const abrirNovo = () => {
    setEditandoId(null);
    setNome('');
    setUsername('');
    setModalVisivel(true);
  };

  // Abrir Modal para EDITAR colaborador
  const abrirEdicao = (colab: Colaborador) => {
    setEditandoId(colab.id);
    setNome(colab.nome);
    setUsername(colab.username || '');
    setModalVisivel(true);
  };

  const salvarColaborador = async () => {
    if (!nome.trim()) {
      Alert.alert("Erro", "O Nome é obrigatório.");
      return;
    }

    setSalvando(true);
    const payload = { nome: nome.trim(), username: username.trim() };
    const url = editandoId ? `${API_URL}/colaboradores/${editandoId}` : `${API_URL}/colaboradores`;
    const metodo = editandoId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setModalVisivel(false);
        buscarColaboradores();
      } else {
        const err = await response.json();
        Alert.alert("Erro", err.erro || "Falha ao salvar.");
      }
    } catch (error) {
      Alert.alert("Erro de Conexão", "Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = (id: number, nome: string) => {
    Alert.alert(
      "Excluir",
      `Deseja realmente apagar o colaborador ${nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/colaboradores/${id}`, { method: 'DELETE' });
              if (response.ok) buscarColaboradores();
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir.");
            }
          }
        }
      ]
    );
  };

  if (carregando) {
    return <ActivityIndicator size="large" color="#10b981" style={styles.centro} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Colaboradores</Text>
        <TouchableOpacity style={styles.botaoAdicionar} onPress={abrirNovo}>
          <Text style={styles.textoBotaoAdicionar}>+ Novo</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={colaboradores}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.detalhe}>{item.username ? `@${item.username}` : 'Sem usuário'}</Text>
            </View>

            <View style={styles.acoesContainer}>
              <TouchableOpacity style={styles.botaoAcao} onPress={() => abrirEdicao(item)}>
                <Ionicons name="pencil-sharp" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoAcao, styles.botaoAcaoExcluir]} onPress={() => confirmarExclusao(item.id, item.nome)}>
                <Ionicons name="trash-outline" size={24} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum colaborador encontrado.</Text>}
      />

      {/* MODAL DE COLABORADOR */}
      <Modal visible={modalVisivel} animationType="slide" transparent={true}>
        <KeyboardAvoidingView style={styles.modalFundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>{editandoId ? 'Editar' : 'Novo'} Colaborador</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Text style={styles.modalFechar}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: João Silva" />

              <Text style={styles.label}>Username / Matrícula</Text>
              <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Ex: joao.silva" autoCapitalize="none" />
            </ScrollView>

            <TouchableOpacity style={styles.botaoSalvar} onPress={salvarColaborador} disabled={salvando}>
              {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBotaoSalvar}>Salvar Colaborador</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#23253a', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#f4f7fc' },
  centro: { flex: 1, justifyContent: 'center' },
  botaoAdicionar: { backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  textoBotaoAdicionar: { color: '#fff', fontWeight: 'bold' },

  card: { backgroundColor: '#353750', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  info: { flex: 1 },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#d1d4d8', marginBottom: 4 },
  detalhe: { fontSize: 14, color: '#64748b' },
  acoesContainer: { flexDirection: 'row', alignItems: 'center' },
  botaoAcao: { padding: 10, backgroundColor: '#f1f5f9', borderRadius: 8, marginLeft: 8 },
  botaoAcaoExcluir: { backgroundColor: '#fee2e2' },
  textoAcao: { fontSize: 18 },
  vazio: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
  
  // Estilos do Modal
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#23253a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#f5f6f8' },
  modalFechar: { fontSize: 24, color: '#abb8ca', padding: 5 },
  label: { fontSize: 14, fontWeight: '600', color: '#717e91', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f8fafc', color: '#1e293b' },
  botaoSalvar: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  textoBotaoSalvar: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});