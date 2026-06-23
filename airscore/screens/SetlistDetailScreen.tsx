import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { MusicItemWithAllData } from '../types';
import { getMusicIdsForSetlist, getMusicWithAllData } from '../utils/database';
import MusicItemCard from '../components/MusicItemCard';
import { Ionicons } from '@expo/vector-icons';

const ACCENT_COLOR = '#2563EB';

const SetlistDetailScreen = ({ route, navigation }: any) => {
  const { setlistId, setlistName, setlistDescription } = route.params;

  const [scores, setScores] = useState<MusicItemWithAllData[]>([]);
  const [addScoresVisible, setAddScoresVisible] = useState(false);

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

                <View style={{ flex: 1 }}>
                <Text
                    numberOfLines={1}
                    style={{
                    fontSize: 24,
                    color: '#111827',
                    }}
                >
                    {setlistName}
                </Text>

                {/* {!!setlistDescription && (
                    <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 14,
                        color: '#6B7280',
                        marginTop: 2,
                    }}
                    >
                    {setlistDescription}
                    </Text>
                )} */}
                </View>
            </View>

            <TouchableOpacity
                onPress={() => setAddScoresVisible(true)}
            >
                <Ionicons
                name="add"
                size={28}
                color="#2563EB"
                />
            </TouchableOpacity>
            </View>
        </View>
        ),
    });
    }, [
    navigation,
    setlistName,
    setlistDescription,
    ]);

  useEffect(() => {
    const load = async () => {
      const ids = await getMusicIdsForSetlist(setlistId);
      const allMusic = await getMusicWithAllData();

      const orderedScores = ids
        .map(id => allMusic.find(m => m.id === id))
        .filter((item): item is MusicItemWithAllData => !!item);

      setScores(orderedScores);
    };

    load();
  }, [setlistId]);

  const musicIds = scores
    .map(score => score.id)
    .filter((id): id is number => typeof id === 'number');

  const totalPages = scores.reduce((sum, score) => {
    return sum + (score.metadata?.page_count ?? 0);
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FlatList
        data={scores}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={{
          paddingBottom: 32,
        }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}>
            {/* <Text style={{ fontSize: 30, fontWeight: '800', color: '#111827' }}>
              {setlistName}
            </Text> */}

            {setlistDescription ? (
              <Text style={{ fontSize: 20, color: '#6B7280'}}>
                {setlistDescription}
              </Text>
            ) : (
                <Text style={{ fontSize: 20, color: '#6B7280'}}>
                    No description...
                </Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 12,
                gap: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13 }}>
                  {scores.length} scores
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 13 }}>
                  {totalPages} pages
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 13 }}>
                  Performance order
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 34,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 6,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#6B7280',
                  }}
                >
                  {index + 1}
                </Text>
              </View>

              <Ionicons name="reorder-two-outline" size={22} color="#9CA3AF" />
            </View>

            <View style={{ flex: 1 }}>
              <MusicItemCard
                item={item}
                onOpen={() =>
                  navigation.navigate('Reader', {
                    uri: item.uri,
                    musicId: item.id!,
                    startPage: 1,
                    context: {
                      setlistId,
                      setlistName,
                      currentIndex: index,
                      totalItems: scores.length,
                      musicIds,
                    },
                  })
                }
                onEditMetadata={() => {}}
                onDelete={() => {}}
                onShare={() => {}}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View
            style={{
                alignItems: 'center',
                paddingTop: 48,
            }}
            >
            <Ionicons
                name="musical-notes-outline"
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
                No scores yet
            </Text>

            <TouchableOpacity
                onPress={() => setAddScoresVisible(true)}
                style={{
                marginTop: 16,
                backgroundColor: '#2563EB',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                }}
            >
                <Text style={{ color: 'white' }}>
                Add Scores
                </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

export default SetlistDetailScreen;