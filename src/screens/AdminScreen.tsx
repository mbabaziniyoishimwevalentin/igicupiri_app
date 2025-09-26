import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { api } from '../api';

interface ReportItem { id:number; reason:string; status:string; created_at:string; title:string; paper_id:number }

export default function AdminScreen() {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(){
    try {
      setLoading(true);
      const res = await api.admin.listReports();
      setItems(res);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load reports');
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  async function publish(id: number) {
    try { await api.admin.setPaperStatus(id, 'published'); Alert.alert('Updated'); load(); } catch (e:any){ Alert.alert('Failed', e.message); }
  }
  async function remove(id: number) {
    try { await api.admin.setPaperStatus(id, 'removed'); Alert.alert('Updated'); load(); } catch (e:any){ Alert.alert('Failed', e.message); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={items}
        keyExtractor={it => String(it.id)}
        contentContainerStyle={{ padding: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={<Text style={styles.title}>Admin Reports {loading ? '(loading...)' : ''}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>#{item.id} • {item.status} • {new Date(item.created_at).toLocaleString()}</Text>
            <Text style={{ marginTop: 6 }}>{item.reason}</Text>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => publish(item.paper_id)} style={[styles.btn, { backgroundColor: '#10B981' }]}>
                <Text style={styles.btnText}>Publish</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item.paper_id)} style={[styles.btn, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.btnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  meta: { marginTop: 4, color: '#6B7280' },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});