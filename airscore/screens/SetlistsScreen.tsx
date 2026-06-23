import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createSetlist, getSetlistSummaries } from '../utils/database';
import { Ionicons } from '@expo/vector-icons';

const ACCENT_COLOR = '#2563EB';

const SetlistsScreen = () => {
  const navigation = useNavigation<any>();
  const [setlists, setSetlists] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSetlistName, setNewSetlistName] = useState("");
    const [newSetlistDescription, setNewSetlistDescription] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({
        header: () => (
        <View
            style={{
            height: 92,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            justifyContent: 'flex-end',
            paddingHorizontal: 20,
            paddingBottom: 12,
            }}
        >
            <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
            >
              <View
                  style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                  }}
              >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginRight: 12 }}
                    >
                    <Ionicons
                        name="chevron-back"
                        size={28}
                        color={ACCENT_COLOR}
                    />
                    </TouchableOpacity>
                <Text
                    style={{
                    fontSize: 28,
                    // fontWeight: '700',
                    color: '#111827',
                    }}
                >
                    Setlists
                </Text>
              </View>

            <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={{
                    // width: 42,
                    // height: 42,
                    // borderRadius: 7,
                    // backgroundColor: '#2563EB',
                    // alignItems: 'center',
                    // justifyContent: 'center',
                }}
            >
                <Ionicons name="add" size={28} color="#2563EB" />
            </TouchableOpacity>
            </View>
        </View>
        ),
    });
    }, [navigation]);

  const loadSetlists = async () => {
  const results = await getSetlistSummaries();
    setSetlists(results);
    };

    useEffect(() => {
    loadSetlists();
    }, []);

  const handleCreateSetlist = async () => {
    const name = newSetlistName.trim();

    if (!name) {
        Alert.alert("Name required", "Please enter a setlist name.");
        return;
    }

    try {
        await createSetlist(name, newSetlistDescription);
        setNewSetlistName("");
        setNewSetlistDescription("");
        setShowCreateModal(false);
        await loadSetlists();
    } catch (error) {
        Alert.alert("Could not create setlist", "A setlist with that name may already exist.");
    }
    };

  return (
    <View style={{ flex: 1, backgroundColor: 'white', padding: 16 }}>
      <FlatList
        data={setlists}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('SetlistDetail', {
                setlistId: item.id,
                setlistName: item.name,
                setlistDescription: item.description
              })
            }
            style={{
              backgroundColor: 'white',
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700' }}>
              {item.name}
            </Text>
            <Text style={{ color: '#666', marginTop: 4 }}>
              {item.item_count} scores
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View
            style={{
                alignItems: 'center',
                paddingTop: 48,
            }}
            >
            <Ionicons
                name="folder-open-outline"
                size={48}
                color="#9CA3AF"
            />

            <Text
                style={{
                marginTop: 12,
                fontSize: 18,
                fontWeight: '600',
                }}
            >
                No setlists yet
            </Text>

            <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={{
                marginTop: 16,
                backgroundColor: '#2563EB',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                }}
            >
                <Text style={{ color: 'white' }}>
                Add Setlist
                </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
        }}>
            <View style={{
            width: "70%",
            maxWidth: 520,
            backgroundColor: "white",
            borderRadius: 18,
            padding: 20,
            }}>
            <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
                New Setlist
            </Text>

            <TextInput
                value={newSetlistName}
                onChangeText={setNewSetlistName}
                placeholder="Setlist name"
                style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                marginBottom: 12,
                }}
            />

            <TextInput
                value={newSetlistDescription}
                onChangeText={setNewSetlistDescription}
                placeholder="Description optional"
                multiline
                style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                minHeight: 90,
                textAlignVertical: "top",
                }}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleCreateSetlist}>
                <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 16 }}>
                    Create
                </Text>
                </TouchableOpacity>
            </View>
            </View>
        </View>
        </Modal>
    </View>
  );
};

export default SetlistsScreen;
