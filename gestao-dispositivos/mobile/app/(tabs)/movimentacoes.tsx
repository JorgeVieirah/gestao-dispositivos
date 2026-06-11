import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  TouchableOpacity, RefreshControl 
} from 'react-native';

const API_URL = 'http://172.20.10.2:5000'; 

interface Movimentacao {
  id: number;
  aparelho: string;
  colaborador: string;
  data_movimentacao: string;
  tipo_movimentacao: string;
}

export default function MovimentacoesScreen() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // Busca os dados da API
  const buscarMovimentacoes = async () => {
    try {
      const response = await fetch(`${API_URL}/movimentacoes`);
      const data = await response.json();
      setMovimentacoes(data);
    } catch (error) {
      console.error("Erro na API:", error);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  // Puxar para atualizar
  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    buscarMovimentacoes();
  }, []);

  useEffect(() => {
    buscarMovimentacoes();
  }, []);

  // Formata a data que vem do banco para o padrão brasileiro (DD/MM/AAAA HH:MM)
  const formatarData = (dataString: string) => {
    if (!dataString) return '-';
    const data = new Date(dataString);
    return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (carregando) {
    return <ActivityIndicator size="large" color="#0ea5e9" style={styles.centro} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Histórico de Movi...</Text>
        <TouchableOpacity style={styles.botaoAtualizar} onPress={buscarMovimentacoes}>
          <Text style={styles.textoBotaoAtualizar}>Atualizar</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={movimentacoes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} />}
        renderItem={({ item }) => {
          // 1. Rede de segurança: se vier vazio do banco, chamamos de 'Desconhecida'
          const tipo = item.tipo_movimentacao || 'Desconhecida';
          
          // 2. Com a variável segura, as cores e o texto funcionam perfeitamente
          const isDevolucao = tipo.toLowerCase().includes('devol');
          const badgeStyle = isDevolucao ? styles.badgeDevolucao : styles.badgeSaida;
          const textBadgeStyle = isDevolucao ? styles.textoDevolucao : styles.textoSaida;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.idMovimentacao}>#{String(item.id).padStart(3, '0')}</Text>
                <View style={[styles.badge, badgeStyle]}>
                  <Text style={textBadgeStyle}>
                    {tipo.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.info}>
                <Text style={styles.label}>Dispositivo:</Text>
                <Text style={styles.valor}>{item.aparelho || 'Desconhecido'}</Text>

                <Text style={styles.label}>Colaborador:</Text>
                <Text style={styles.valorColaborador}>{item.colaborador || 'Não informado'}</Text>

                <Text style={styles.data}>{formatarData(item.data_movimentacao)}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhuma movimentação registrada.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#23253a', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#f8f9fa' },
  centro: { flex: 1, justifyContent: 'center' },
  botaoAtualizar: { backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  textoBotaoAtualizar: { color: '#fff', fontWeight: 'bold' },
  
  card: { backgroundColor: '#353750', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#353750' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  idMovimentacao: { fontSize: 16, fontWeight: 'bold', color: '#a8b3c2' },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeSaida: { backgroundColor: '#cffafe' }, // Azul bem claro
  textoSaida: { color: '#0891b2', fontWeight: 'bold', fontSize: 12 },
  badgeDevolucao: { backgroundColor: '#fee2e2' }, // Vermelho bem claro
  textoDevolucao: { color: '#e11d48', fontWeight: 'bold', fontSize: 12 },
  
  info: { gap: 4 },
  label: { fontSize: 12, color: '#929fb1', textTransform: 'uppercase', marginTop: 4 },
  valor: { fontSize: 16, fontWeight: 'bold', color: '#9da8b8' },
  valorColaborador: { fontSize: 16, fontWeight: 'bold', color: '#0284c7' }, // Azul para destacar a pessoa
  
  data: { fontSize: 13, color: '#94a3b8', marginTop: 10, fontStyle: 'italic', textAlign: 'right' },
  vazio: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});