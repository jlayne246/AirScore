import { useEffect, useState } from "react";
import { ReaderSettings } from "../utils/settings/types";
import { getResolvedReaderSettings } from "../utils/settings/resolver";
import { ScrollView } from "react-native";
import SettingsSection from "../components/settings/SettingsSection";
import SettingsToggleRow from "../components/settings/SettingsToggleRow";
import { saveGlobalReaderSetting } from "../utils/settings/repository";

const SettingsScreen = () => {

    const [settings, setSettings] =
        useState<ReaderSettings>();

    // const updateSetting = async <
    //  K extends keyof ReaderSettings
    // >(
    //     key: K,
    //     value: ReaderSettings[K]
    // ) => {

    //     setSettings(prev => ({
    //         ...prev!,
    //         [key]: value,
    //     }));

    //     await saveGlobalReaderSetting(key, value);
    // };

    const updateGlobalSetting = async <
            K extends keyof ReaderSettings
        >(
            key: K,
            value: ReaderSettings[K]
        ) => {
        setSettings(prev => ({
            ...prev!,
            [key]: value,
        }));

        try {
            await saveGlobalReaderSetting(key, value);
        } catch (error) {
            // Optional: revert the value or show a toast
            console.error(error);
        }
    };

    useEffect(() => {

        const load = async () => {

            setSettings(
                await getResolvedReaderSettings()
            );

        };

        load();

    }, []);

    if (!settings)
        return null;

    return (

        <ScrollView>

            <SettingsSection
                title="Reader"
            >

                <SettingsToggleRow

                    title="Keep Screen Awake"

                    subtitle="Prevent screen from sleeping"

                    value={settings.keepScreenAwake}

                    onValueChange={value =>
                        updateGlobalSetting("tapZones", value)
                    }

                />

                <SettingsToggleRow

                    title="Tap Zones"

                    value={settings.tapZones}

                    onValueChange={value =>
                        updateGlobalSetting("tapZones", value)
                    }

                />

            </SettingsSection>

        </ScrollView>

    );

};

export default SettingsScreen;