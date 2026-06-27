// components/settings/SettingsSegmentedRow.tsx

import { Text, TouchableOpacity, View } from "react-native";

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  title: string;
  subtitle?: string;
  value: T;
  options: Option<T>[];
  onValueChange: (value: T) => void;
};

const SettingsSegmentedRow = <T extends string>({
  title,
  subtitle,
  value,
  options,
  onValueChange,
}: Props<T>) => {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>
        {title}
      </Text>

      {subtitle && (
        <Text style={{ color: "#666", marginTop: 2, marginBottom: 10 }}>
          {subtitle}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#E5E7EB",
          borderRadius: 10,
          padding: 3,
        }}
      >
        {options.map(option => {
          const selected = option.value === value;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onValueChange(option.value)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: selected ? "white" : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: selected ? "#2563EB" : "#6B7280",
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default SettingsSegmentedRow;