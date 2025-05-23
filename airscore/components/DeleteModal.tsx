import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface DeleteModalProps {
  itemId: number;
  onCancel: () => void;
  onDelete: (itemId: number) => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ itemId, onCancel, onDelete }) => {
  return (
    <View className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-black/40 justify-center items-center">
      <View className="bg-white p-4 rounded-lg shadow-md w-[90%] max-w-[320px]">
        <Text className="text-base text-gray-800 mb-4 text-center">
          Are you sure you want to delete?
        </Text>

        <View className="flex-row justify-end space-x-3">
          <TouchableOpacity
            className="bg-blue-500 py-1.5 px-3 rounded"
            onPress={onCancel}
          >
            <Text className="text-white text-xs font-semibold">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-500 py-1.5 px-3 rounded"
            onPress={() => onDelete(itemId)}
          >
            <Text className="text-white text-xs font-semibold">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};


export default DeleteModal;
