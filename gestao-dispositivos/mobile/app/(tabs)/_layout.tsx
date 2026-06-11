import { Tabs } from 'expo-router';
import React from 'react';

// biblioteca de ícones
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons'; 

// Mantemos o efeito de vibração original do seu template
import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6', // O nosso Azul de destaque
        tabBarInactiveTintColor: '#9ca3af', // Cinza elegante para ícones não selecionados
        tabBarStyle: {
          backgroundColor: '#23253a', // Fundo escuro combinando com o Dashboard
          borderTopColor: '#2e3046', // Cor da linhazinha que separa a barra do app
        },
        headerShown: false,
        tabBarButton: HapticTab, // Mantém a vibração tátil ao clicar
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="colaboradores" // O nome do ficheiro que você acabou de renomear!
        options={{
          title: 'Equipe',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="cadastro"
        options={{
          title: 'Cadastro',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="movimentacoes"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <FontAwesome5 name="exchange-alt" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}