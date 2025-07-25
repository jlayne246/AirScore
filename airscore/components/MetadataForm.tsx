import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { MusicMetadata, Label, MusicMetadataWithLabels } from '../types';
import {
  saveCompleteMetadata,
  getMusicWithMetadata,
  getAllLabels,
  createOrGetLabel,
  getAllGroups,
  setMusicGroups,
  getGroupsForMusic,
  addMusicToGroup
} from '../utils/database';

interface MetadataFormData {
  title: string;
  groups: string[];
  // No labels here since you're not saving them to DB
}

interface MetadataFormProps {
  musicId?: number;
  initialTitle?: string;
  initialData?: MusicMetadataWithLabels;
  onSave: (formData?: MetadataFormData) => void;
  onCancel: () => void;
  visible: boolean;
  mode: string;
}

const MetadataForm: React.FC<MetadataFormProps> = ({
  musicId,
  initialTitle,
  initialData,
  onSave,
  onCancel,
  visible,
  mode
}) => {
  // Form state
  const [formData, setFormData] = useState<Omit<MusicMetadata, 'id'>>({
    title: '',
    composer: '',
    genre: '',
    key_signature: '',
    rating: 0,
    difficulty: 0,
    time_signature: '',
    page_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Labels state
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [newLabelText, setNewLabelText] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Groups state
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [newGroupText, setNewGroupText] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Rating and difficulty arrays for picker-style selection
  const ratings = [1, 2, 3, 4, 5];
  const difficulties = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Common key signatures
  const keySignatures = [
    'C major', 'G major', 'D major', 'A major', 'E major', 'B major', 'F# major',
    'C# major', 'F major', 'Bb major', 'Eb major', 'Ab major', 'Db major',
    'Gb major', 'Cb major', 'A minor', 'E minor', 'B minor', 'F# minor',
    'C# minor', 'G# minor', 'D# minor', 'A# minor', 'D minor', 'G minor',
    'C minor', 'F minor', 'Bb minor', 'Eb minor', 'Ab minor'
  ];

  // Common time signatures
  const timeSignatures = ['4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '2/2', '3/8'];

  console.log(mode);

  // Load initial data and available labels
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, musicId]);

  // Handle initialTitle changes (for new items)
  useEffect(() => {
    if (visible && initialTitle && mode !== 'edit' && mode !== 'view') {
      setFormData(prev => ({
        ...prev,
        title: initialTitle
      }));
    }
  }, [visible, initialTitle, mode]);

  const loadData = async () => {
    try {
      // Load available labels and groups
      const labels = await getAllLabels();
      setAvailableLabels(labels);

      // Load available groups from database
      const groups = await getAllGroups();
      setAvailableGroups(groups);

      console.log(musicId, groups);

      // For edit/view modes, load existing metadata
      if ((mode === 'edit' || mode === 'view') && musicId) {
        console.log("Initial: ", initialData)
        if (!initialData) {
          const metadata = await getMusicWithMetadata(musicId);
          if (metadata) {
            const { labels, ...metadataOnly } = metadata;
            const itemGroups = await getGroupsForMusic(musicId); // Separate function
            console.log("IN METADATA: ", labels, metadataOnly, itemGroups);
            setFormData(metadataOnly);
            setSelectedLabels(labels);
            setSelectedGroups(itemGroups || []);
          }
        } else {
          const { labels, ...metadataOnly } = initialData;
          const itemGroups = await getGroupsForMusic(musicId); // Separate function
          setFormData(metadataOnly);
          setSelectedLabels(labels);
          setSelectedGroups(itemGroups || []);

          console.log("Data - ", labels, metadataOnly, itemGroups)
        }
      }
      // For new items, just set the title if provided
      else if (initialTitle) {
        setFormData(prev => ({
          ...prev,
          title: initialTitle
        }));
        // Set default group for new items
        setSelectedGroups([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load form data');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setIsLoading(true);
    try {
      // For existing items with musicId, save to database
      if (musicId) {
        await saveCompleteMetadata(musicId, formData, selectedLabels);

        await setMusicGroups(musicId, selectedGroups);

        Alert.alert('Success', 'Metadata saved successfully');
        console.log('Saving Metadata:', { musicId, formData, selectedLabels });
      }

      // Always call onSave with the form data (for both new and existing items)
      onSave({
        title: formData.title,
        groups: selectedGroups,
      });
    } catch (error) {
      console.error('Failed to save metadata:', error);
      Alert.alert('Error', 'Failed to save metadata');
      onSave(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLabel = async () => {
    if (!newLabelText.trim()) return;

    try {
      await createOrGetLabel(newLabelText.trim());

      // Add to selected labels if not already selected
      if (!selectedLabels.includes(newLabelText.trim())) {
        setSelectedLabels(prev => [...prev, newLabelText.trim()]);
      }

      // Refresh available labels
      const labels = await getAllLabels();
      setAvailableLabels(labels);

      setNewLabelText('');
      setShowLabelModal(false);
    } catch (error) {
      console.error('Failed to add label:', error);
      Alert.alert('Error', 'Failed to add label');
    }
  };

  const toggleLabel = (labelName: string) => {
    setSelectedLabels(prev =>
      prev.includes(labelName)
        ? prev.filter(l => l !== labelName)
        : [...prev, labelName]
    );
  };

  const handleAddGroup = () => {
    if (!newGroupText.trim()) return;

    const groupName = newGroupText.trim();

    // Add to available groups if not already there
    if (!availableGroups.includes(groupName)) {
      setAvailableGroups(prev => [...prev, groupName]);
    }

    // Add to selected groups if not already selected
    if (!selectedGroups.includes(groupName)) {
      setSelectedGroups(prev => [...prev, groupName]);
    }

    setNewGroupText('');
    setShowGroupModal(false);
  };

  const toggleGroup = (groupName: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const renderRatingSelector = () => (
    <View className="my-3">
      <Text className="text-base font-semibold text-gray-800 mb-2">Rating (1-5 stars)</Text>
      <View className="flex-row flex-wrap gap-2">
        {ratings.map(rating => (
          <TouchableOpacity
            key={rating}
            className={`bg-white border border-gray-300 rounded-lg py-2 px-3 ${formData.rating === rating ? 'bg-blue-500 border-blue-500' : ''
              }`}
            onPress={() => setFormData(prev => ({ ...prev, rating }))}
          >
            <Text className={`text-base ${formData.rating === rating ? 'text-white' : 'text-gray-800'
              }`}>
              {'★'.repeat(rating)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDifficultySelector = () => (
    <View className="my-3">
      <Text className="text-base font-semibold text-gray-800 mb-2">Difficulty (1-10)</Text>
      <View className="flex-row flex-wrap gap-2">
        {difficulties.map(difficulty => (
          <TouchableOpacity
            key={difficulty}
            className={`bg-white border border-gray-300 rounded-lg py-2 px-3 min-w-9 items-center ${formData.difficulty === difficulty ? 'bg-orange-500 border-orange-500' : ''
              }`}
            onPress={() => setFormData(prev => ({ ...prev, difficulty }))}
          >
            <Text className={`text-base font-semibold ${formData.difficulty === difficulty ? 'text-white' : 'text-gray-800'
              }`}>
              {difficulty}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuickSelectButtons = (options: string[], field: keyof typeof formData) => {
    const [showAllOptions, setShowAllOptions] = useState(false);

    const visibleOptions = showAllOptions ? options : options.slice(0, 5);
    const hiddenCount = options.length - visibleOptions.length;

    return (
      <View className="flex-row flex-wrap mt-2">
        {visibleOptions.map(option => (
          <TouchableOpacity
            key={option}
            className={`bg-white border border-gray-300 rounded-md py-1.5 px-2.5 mr-2 mb-2 ${formData[field] === option ? 'bg-green-500 border-green-500' : ''
              }`}
            onPress={() => setFormData(prev => ({ ...prev, [field]: option }))}
          >
            <Text
              className={`text-sm ${formData[field] === option ? 'text-white' : 'text-gray-800'
                }`}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}

        {!showAllOptions && hiddenCount > 0 && (
          <TouchableOpacity
            className="bg-gray-200 border border-gray-300 rounded-md py-1.5 px-2.5 mr-2 mb-2"
            onPress={() => setShowAllOptions(true)}
          >
            <Text className="text-sm text-gray-800">More...</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };


  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-gray-50">
        <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-200 pt-12">
          <TouchableOpacity onPress={onCancel} className="py-2 px-3">
            <Text className="text-blue-500 text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-800">
            {mode === 'edit' ? 'Edit Metadata' : mode === 'view' ? 'View Metadata' : 'Add Metadata'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            className={`py-2 px-4 rounded-lg ${isLoading ? 'bg-gray-400' : 'bg-blue-500'
              }`}
            disabled={isLoading}
          >
            <Text className="text-white text-base font-semibold">
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View className="my-3">
            <Text className="text-base font-semibold text-gray-800 mb-2">Title *</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter title"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Composer */}
          <View className="my-3">
            <Text className="text-base font-semibold text-gray-800 mb-2">Composer</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
              value={formData.composer}
              onChangeText={(text) => setFormData(prev => ({ ...prev, composer: text }))}
              placeholder="Enter composer name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Genre */}
          <View className="my-3">
            <Text className="text-base font-semibold text-gray-800 mb-2">Genre</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
              value={formData.genre}
              onChangeText={(text) => setFormData(prev => ({ ...prev, genre: text }))}
              placeholder="Enter genre"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Key Signature */}
          <View className="my-3">
            <Text className="text-base font-semibold text-gray-800 mb-2">Key Signature</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
              value={formData.key_signature}
              onChangeText={(text) => setFormData(prev => ({ ...prev, key_signature: text }))}
              placeholder="Enter key signature"
              placeholderTextColor="#9CA3AF"
            />
            {renderQuickSelectButtons(keySignatures, 'key_signature')}
          </View>

          {/* Time Signature */}
          <View className="my-3">
            <Text className="text-base font-semibold text-gray-800 mb-2">Time Signature</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
              value={formData.time_signature}
              onChangeText={(text) => setFormData(prev => ({ ...prev, time_signature: text }))}
              placeholder="Enter time signature"
              placeholderTextColor="#9CA3AF"
            />
            {renderQuickSelectButtons(timeSignatures, 'time_signature')}
          </View>

          {/* Page Count */}
          <View className="my-3">
            <Text className="text-base font-semibold text-gray-800 mb-2">Page Count</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
              value={formData.page_count?.toString() || ''}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                page_count: parseInt(text) || 0
              }))}
              placeholder="Enter page count"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Rating */}
          {renderRatingSelector()}

          {/* Difficulty */}
          {renderDifficultySelector()}

          {/* Groups */}
          <View className="my-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-base font-semibold text-gray-800">Groups</Text>

              <TouchableOpacity
                onPress={() => setShowGroupModal(true)}
                className="bg-blue-500 px-4 py-2 rounded-md"
                style={{ minHeight: 36, justifyContent: 'center' }}
              >
                <Text className="text-white text-sm font-semibold leading-none self-center" style={{ lineHeight: 18 }}>
                  + Add Group
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {availableGroups.map(group => (
                <TouchableOpacity
                  key={group}
                  className={`bg-white border border-gray-300 rounded-full py-1.5 px-3 ${selectedGroups.includes(group) ? 'bg-blue-500 border-blue-500' : ''
                    }`}
                  onPress={() => toggleGroup(group)}
                >
                  <Text className={`text-sm ${selectedGroups.includes(group) ? 'text-white' : 'text-gray-800'
                    }`}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedGroups.length === 0 && (
              <Text className="text-sm text-gray-500 mt-2 italic">
                No groups selected. Item will be placed in "Ungrouped".
              </Text>
            )}
          </View>

          {/* Labels */}
          <View className="my-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-base font-semibold text-gray-800">Labels</Text>

              <TouchableOpacity
                onPress={() => setShowLabelModal(true)}
                className="bg-green-500 px-4 py-2 rounded-md"
                style={{ minHeight: 36, justifyContent: 'center' }}
              >
                <Text className="text-white text-sm font-semibold leading-none self-center" style={{ lineHeight: 18 }}>
                  + Add Label
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {availableLabels.map(label => (
                <TouchableOpacity
                  key={label.id}
                  className={`bg-white border border-gray-300 rounded-full py-1.5 px-3 ${selectedLabels.includes(label.name) ? 'bg-purple-500 border-purple-500' : ''
                    }`}
                  onPress={() => toggleLabel(label.name)}
                >
                  <Text className={`text-sm ${selectedLabels.includes(label.name) ? 'text-white' : 'text-gray-800'
                    }`}>
                    {label.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Add Group Modal */}
        <Modal visible={showGroupModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-xl p-6 mx-5 w-full max-w-sm">
              <Text className="text-lg font-semibold text-gray-800 mb-4 text-center">Add New Group</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base mb-5"
                value={newGroupText}
                onChangeText={setNewGroupText}
                placeholder="Enter group name"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowGroupModal(false);
                    setNewGroupText('');
                  }}
                  className="flex-1 py-3 rounded-lg border border-gray-300 items-center"
                >
                  <Text className="text-base text-gray-800">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddGroup}
                  className="flex-1 bg-blue-500 py-3 rounded-lg items-center"
                >
                  <Text className="text-base text-white font-semibold">Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Label Modal */}
        <Modal visible={showLabelModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white rounded-xl p-6 mx-5 w-full max-w-sm">
              <Text className="text-lg font-semibold text-gray-800 mb-4 text-center">Add New Label</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base mb-5"
                value={newLabelText}
                onChangeText={setNewLabelText}
                placeholder="Enter label name"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowLabelModal(false);
                    setNewLabelText('');
                  }}
                  className="flex-1 py-3 rounded-lg border border-gray-300 items-center"
                >
                  <Text className="text-base text-gray-800">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddLabel}
                  className="flex-1 bg-green-500 py-3 rounded-lg items-center"
                >
                  <Text className="text-base text-white font-semibold">Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

export default MetadataForm;