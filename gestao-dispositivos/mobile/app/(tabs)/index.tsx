import React, { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Alert, Modal, 
  TextInput, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';

// IP AQUI
const API_URL = 'http://172.20.10.2:5000'; 

interface Aparelho {
  id: number;
  marca: string;
  modelo: string;
  imei: string;
  numero_serie: string;
  status: string;
}

export default function HomeScreen() {
  const [aparelhos, setAparelhos] = useState<Aparelho[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // Estados para o Modal de Edição
  const [modalVisivel, setModalVisivel] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [editando, setEditando] = useState<Aparelho | null>(null);

  // 1. Buscar os dados (GET)
  const buscarDados = async () => {
    try {
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
              const response = await fetch(`${API_URL}/aparelhos/${id}`, { method: 'DELETE' });
              if (response.ok) buscarDados(); 
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir.");
            }
          }
        }
      ]
    );
  };

  // 3. Abrir Modal de Edição
  const abrirEdicao = (aparelho: Aparelho) => {
    setEditando({ ...aparelho }); // Faz uma cópia do aparelho clicado
    setModalVisivel(true);
  };

  // 4. Salvar a Edição (PUT)
  const salvarEdicao = async () => {
    if (!editando || !editando.modelo || !editando.numero_serie) {
      Alert.alert("Erro", "Modelo e Número de Série são obrigatórios.");
      return;
    }

    setSalvandoEdicao(true);
    try {
      const response = await fetch(`${API_URL}/aparelhos/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editando)
      });

      if (response.ok) {
        Alert.alert("Sucesso", "Aparelho atualizado com sucesso!");
        setModalVisivel(false);
        buscarDados(); // Recarrega a lista
      } else {
        const err = await response.json();
        Alert.alert("Erro", err.erro || "Falha ao atualizar.");
      }
    } catch (error) {
      Alert.alert("Erro de Conexão", "Não foi possível conectar ao servidor.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  if (carregando) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.centro} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Inventario</Text>
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
              {item.imei ? <Text style={styles.detalhe}>IMEI: {item.imei}</Text> : null}
              
              <View style={[styles.badge, { backgroundColor: item.status === 'Disponível' ? '#dcfce7' : item.status === 'Manutenção' ? '#fef08a' : '#fee2e2' }]}>
                <Text style={{ color: item.status === 'Disponível' ? '#166534' : item.status === 'Manutenção' ? '#854d0e' : '#991b1b', fontWeight: 'bold' }}>
                  {item.status}
                </Text>
              </View>
            </View>

            {/* Botões de Ação na Lateral do Card */}
            <View style={styles.acoesContainer}>
              <TouchableOpacity style={styles.botaoAcao} onPress={() => abrirEdicao(item)}>
                <Ionicons name="pencil" size={20} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoAcao, styles.botaoAcaoExcluir]} onPress={() => confirmarExclusao(item.id, item.modelo)}>
                <EvilIcons name="trash" size={24} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum aparelho encontrado.</Text>}
      />

      {/* MODAL DE EDIÇÃO */}
      <Modal visible={modalVisivel} animationType="slide" transparent={true}>
        <KeyboardAvoidingView style={styles.modalFundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Editar Aparelho</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Text style={styles.modalFechar}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {editando && (
                <>
                  <Text style={styles.label}>Modelo</Text>
                  <TextInput style={styles.input} value={editando.modelo} onChangeText={(t) => setEditando({...editando, modelo: t})} />

                  <Text style={styles.label}>Número de Série</Text>
                  <TextInput style={styles.input} value={editando.numero_serie} onChangeText={(t) => setEditando({...editando, numero_serie: t})} autoCapitalize="characters" />

                  <Text style={styles.label}>IMEI</Text>
                  <TextInput style={styles.input} value={editando.imei} onChangeText={(t) => setEditando({...editando, imei: t})} keyboardType="numeric" maxLength={15} />

                  <Text style={styles.label}>Status do Aparelho</Text>
                  <View style={styles.statusContainer}>
                    {['Disponível', 'Em Uso', 'Manutenção'].map((st) => (
                      <TouchableOpacity 
                        key={st} 
                        style={[styles.statusBotao, editando.status === st && styles.statusBotaoAtivo]}
                        onPress={() => setEditando({...editando, status: st})}
                      >
                        <Text style={[styles.statusTexto, editando.status === st && styles.statusTextoAtivo]}>{st}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.botaoSalvar} onPress={salvarEdicao} disabled={salvandoEdicao}>
              {salvandoEdicao ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBotaoSalvar}>Salvar Alterações</Text>}
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
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#fcfdff' },
  centro: { flex: 1, justifyContent: 'center' },

  botaoAtualizar: { backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  textoBotaoAtualizar: { color: '#fff', fontWeight: 'bold' },
  
  card: { backgroundColor: '#353750', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  info: { flex: 1 },
  modelo: { fontSize: 18, fontWeight: 'bold', color: '#eceff3', marginBottom: 4 },
  detalhe: { fontSize: 14, color: '#64748b' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8 },
  acoesContainer: { flexDirection: 'row', alignItems: 'center' },
  botaoAcao: { padding: 10, backgroundColor: '#f1f5f9', borderRadius: 8, marginLeft: 8 },
  botaoAcaoExcluir: { backgroundColor: '#fee2e2' },
  textoAcao: { fontSize: 18 },
  vazio: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
  
  // Estilos do Modal
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#2e3046', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  modalFechar: { fontSize: 24, color: '#94a3b8', padding: 5 },
  label: { fontSize: 14, fontWeight: '600', color: '#9ca3af', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#475569', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#23253a', color: '#ffffff' },
  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  statusBotao: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#475569', backgroundColor: '#23253a' },
  statusBotaoAtivo: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  statusTexto: { color: '#9ca3af', fontWeight: 'bold' },
  statusTextoAtivo: { color: '#fff' },
  botaoSalvar: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  textoBotaoSalvar: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});