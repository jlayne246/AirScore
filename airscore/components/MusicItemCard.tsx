import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

import { MusicItemWithAllData } from '../types'; // Adjust the import path as necessary

type Props = {
    item: MusicItemWithAllData;
    onEditMetadata: (id: number, title: string) => void;
    onDelete: (id: number | undefined) => void;
    onShare?: (id: number | undefined) => void;
};

const MusicItemCard: React.FC<Props> = ({ item, onEditMetadata, onDelete, onShare }) => {
    return (
        <View className="bg-white rounded-lg p-4 mb-3 flex-row justify-between items-center shadow-sm shadow-black/10 elevation-3">
        <View className="flex-1">
            <Text className="text-base font-semibold text-gray-800 mb-1">
            {item.metadata?.title ?? '[No title]'}
            </Text>
            <Text className="text-sm text-gray-600">
            Groups: {item.groups.length > 0 ? item.groups.join(', ') : 'None'}
            </Text>
            {item.metadata?.labels && item.metadata.labels.length > 0 && (
            <Text className="text-sm text-gray-500 mt-1">
                Labels: {item.metadata.labels.join(', ')}
            </Text>
            )}
        </View>

        <View className="flex-row gap-2">
            <Menu>
            <MenuTrigger>
                <Entypo name="dots-three-vertical" size={20} color="gray" />
            </MenuTrigger>
            <MenuOptions
                customStyles={{
                optionsContainer: {
                    backgroundColor: 'white',
                    borderRadius: 8,
                    paddingVertical: 4,
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    marginTop: 20,
                    width: 150,
                },
                }}
            >
                <MenuOption
                onSelect={() =>
                    item.id && onEditMetadata(item.id, item.metadata?.title ?? item.title)
                }
                customStyles={{
                    optionWrapper: { padding: 10 },
                    optionText: { fontSize: 14, color: '#333' },
                }}
                text="Edit Details"
                />
                <MenuOption
                onSelect={() =>
                    onShare?.(item.id)
                }
                customStyles={{
                    optionWrapper: { padding: 10 },
                    optionText: { fontSize: 14, color: '#333' },
                }}
                text="Share"
                />
                <MenuOption
                onSelect={() => onDelete(item.id)}
                customStyles={{
                    optionWrapper: { padding: 10 },
                    optionText: { fontSize: 14, color: '#333' },
                }}
                text="Delete"
                />
            </MenuOptions>
            </Menu>
        </View>
        </View>
    );
};

export default MusicItemCard;
