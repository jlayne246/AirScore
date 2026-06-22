import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

import { MusicItemWithAllData } from '../types'; // Adjust the import path as necessary
import AirScorePdfRenderer from '../native/AirScorePdfRenderer';

type Props = {
  item: MusicItemWithAllData;
  onEditMetadata: (id: number, title: string, uri: string) => void;
  onDelete: (id: number | undefined) => void;
  onShare?: (id: number | undefined) => void;
  onOpen?: () => void;
};

const MusicItemCard: React.FC<Props> = ({
  item,
  onEditMetadata,
  onDelete,
  onShare,
  onOpen,
}) => {
  const [thumbnailUri, setThumbnailUri] = useState("");

  useEffect(() => {
    const loadDocumentData = async () => {
      if (!item.uri) return;

      try {
        const result = await AirScorePdfRenderer.renderPage({
          pdfPath: item.uri,
          page: 1,
          width: 220,
          height: 300,
        });

        setThumbnailUri(result.uri);
      } catch (error) {
        console.error("Failed to load PDF thumbnail:", error);
      }
    };

    loadDocumentData();
  }, [item.uri]);

  const title = item.metadata?.title ?? item.title ?? "Untitled";
  const documentType = item.metadata?.document_type ?? "Score";

  const creator =
    documentType === "Single Work"
      ? item.metadata?.composer || "Unknown composer"
      : item.metadata?.editor || item.metadata?.publisher || documentType;

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 14,
        // padding: 12,
        marginBottom: 12,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingVertical: 12,
      }}
      onPress={onOpen}
      activeOpacity={0.75}
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={{
            width: 82,
            height: 108,
            resizeMode: "contain",
            backgroundColor: "#f3f4f6",
            marginRight: 14,
          }}
        />
      ) : (
        <View
          style={{
            width: 70,
            height: 92,
            backgroundColor: "#f3f4f6",
            marginRight: 14,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="document-outline" size={26} color="#9ca3af" />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2937" }}>
          {title}
        </Text>

        <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
          {creator}
        </Text>

        <Text style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          {documentType} · {item.metadata?.genre || "Uncategorised"} ·{" "}
          {item.metadata?.page_count || 0} pages
        </Text>

        {item.metadata?.labels?.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
            {item.metadata.labels.slice(0, 3).map((label) => (
              <View
                key={label}
                style={{
                  backgroundColor: "#F3E8FF",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginRight: 6,
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: "#7E22CE", fontSize: 12 }}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Menu>
        <MenuTrigger>
          <Ionicons name="ellipsis-vertical" size={22} color="#777" />
        </MenuTrigger>

        <MenuOptions>
          <MenuOption
            text="Edit Details"
            onSelect={() =>
              item.id &&
              onEditMetadata(
                item.id,
                title,
                item.uri
              )
            }
          />

          <MenuOption
            text="Share"
            onSelect={() => onShare?.(item.id)}
          />

          <MenuOption
            text="Delete"
            onSelect={() => onDelete(item.id)}
          />
        </MenuOptions>
      </Menu>
    </TouchableOpacity>
  );
};

export default MusicItemCard;