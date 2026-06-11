import React, { useEffect, useState, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { 
  View, Text, StyleSheet, ActivityIndicator, 
  ScrollView, RefreshControl 
} from 'react-native';

//IP API
const API_URL = 'http://172.20.10.2:5000'; 

interface Aparelho { status: string; }
interface Colaborador { id: number; }

export default function DashboardScreen() {
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  
  // Estados para os contadores
  const [total, setTotal] = useState(0);
  const [disponiveis, setDisponiveis] = useState(0);
  const [emUso, setEmUso] = useState(0);
  const [manutencao, setManutencao] = useState(0);
  const [equipe, setEquipe] = useState(0);

  const carregarDashboard = async () => {
    try {
      // Faz as duas buscas em paralelo para ser mais rápido
      const [resAparelhos, resColaboradores] = await Promise.all([
        fetch(`${API_URL}/aparelhos`),
        fetch(`${API_URL}/colaboradores`)
      ]);

      const aparelhos: Aparelho[] = await resAparelhos.json();
      const colaboradores: Colaborador[] = await resColaboradores.json();

      // Calcula as estatísticas
      setTotal(aparelhos.length);
      setDisponiveis(aparelhos.filter(a => a.status === 'Disponível').length);
      setEmUso(aparelhos.filter(a => a.status === 'Em Uso').length);
      setManutencao(aparelhos.filter(a => a.status === 'Manutenção').length);
      setEquipe(colaboradores.length);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    carregarDashboard();
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, []);

  if (carregando) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} tintColor="#fff" />
      }
    >
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Visão Geral</Text>
      </View>

      {/* KPI PRINCIPAL (Total) */}
      <View style={styles.kpiPrincipal}>
        <Text style={styles.kpiMes}>Inventário Atual</Text>
        <Text style={styles.kpiValorPrincipal}>{total} <Text style={styles.kpiUnidadeMain}>Ativos</Text></Text>
      </View>

      {/* GRID DE CARTÕES (Estilo Analytics) */}
      <View style={styles.grid}>
        
        {/* Cartão: Disponíveis */}
        <View style={styles.card}>
          <View style={[styles.linhaTopo, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.cardTitulo}>Disponíveis</Text>
          <View style={styles.cardValorLinha}>
            <Text style={styles.cardValor}>{disponiveis}</Text>
            <Text style={styles.cardUnidade}> UN</Text>
          </View>
          <Ionicons name="phone-portrait-outline" size={26} color="black" />
        </View>

        {/* Cartão: Em Uso */}
        <View style={styles.card}>
          <View style={[styles.linhaTopo, { backgroundColor: '#ec4899' }]} />
          <Text style={styles.cardTitulo}>Em Uso</Text>
          <View style={styles.cardValorLinha}>
            <Text style={styles.cardValor}>{emUso}</Text>
            <Text style={styles.cardUnidade}> UN</Text>
          </View>
          <Ionicons name="rocket" size={26} color="black" />
        </View>

        {/* Cartão: Manutenção */}
        <View style={styles.card}>
          <View style={[styles.linhaTopo, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.cardTitulo}>Manutenção</Text>
          <View style={styles.cardValorLinha}>
            <Text style={styles.cardValor}>{manutencao}</Text>
            <Text style={styles.cardUnidade}> UN</Text>
          </View>
          <Ionicons name="build" size={26} color="black" />
        </View>

        {/* Cartão: Equipe */}
        <View style={styles.card}>
          <View style={[styles.linhaTopo, { backgroundColor: '#10b981' }]} />
          <Text style={styles.cardTitulo}>Colaboradores</Text>
          <View style={styles.cardValorLinha}>
            <Text style={styles.cardValor}>{equipe}</Text>
            <Text style={styles.cardUnidade}> Pessoas</Text>
          </View>
          <Ionicons name="people-sharp" size={26} color="black" />
        </View>

      </View>
    </ScrollView>
  );
}

// ESTILOS BASEADOS NA REFERÊNCIA DO USUÁRIO
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#23253a', // Fundo azul
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  centro: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  kpiPrincipal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  kpiMes: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  kpiValorPrincipal: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  kpiUnidadeMain: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: 'normal',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '47%', // Deixa espaço para o gap entre os dois cards na mesma linha
    backgroundColor: '#2e3046', // Cor do cartão um tom mais claro que o fundo
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  linhaTopo: {
    width: 30,
    height: 3,
    borderRadius: 2,
    marginBottom: 15,
  },
  cardTitulo: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardValorLinha: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardValor: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  cardUnidade: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  cardIcone: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    fontSize: 20,
    opacity: 0.6, // Deixa o emoji com aparência de marca d'água discreta
  }
});