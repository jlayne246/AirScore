import { Switch, View, Text } from "react-native";
import { ACCENT_COLOR } from "../../types";

type Props = {

    title: string;

    subtitle?: string;

    value: boolean;

    onValueChange(value: boolean): void;
};

export default function SettingsToggleRow({
    title,
    subtitle,
    value,
    onValueChange,
}: Props) {

    return (

        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
            }}
        >

            <View style={{ flex: 1 }}>

                <Text
                    style={{
                        fontSize: 16,
                        fontWeight: "600",
                    }}
                >
                    {title}
                </Text>

                {subtitle && (

                    <Text
                        style={{
                            color: "#666",
                            marginTop: 2,
                        }}
                    >
                        {subtitle}
                    </Text>

                )}

            </View>

            <Switch
                value={value}
                onValueChange={onValueChange}
                thumbColor={ACCENT_COLOR}
                trackColor={{
                    false: "#D1D5DB",
                    true: "#93C5FD",
                }}
            />

        </View>

    );
}