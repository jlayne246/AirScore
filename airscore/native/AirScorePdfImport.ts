import { NativeModules, Platform } from "react-native";

type ImportedPdf = {
  uri: string;
  originalFilename: string;
};

type AirScorePdfImporterModule = {
  importPdf(sourceUri: string): Promise<ImportedPdf>;
};

const getNativeImporter = (): AirScorePdfImporterModule => {
  const nativeModule =
    NativeModules.AirScorePdfImporter as AirScorePdfImporterModule | undefined;

  if (Platform.OS !== "android" || !nativeModule?.importPdf) {
    throw new Error(
      "AirScorePdfImporter is only available in the Android native build."
    );
  }

  return nativeModule;
};

export const importPdfNative = async (
  sourceUri: string
): Promise<ImportedPdf> => {
  return getNativeImporter().importPdf(sourceUri);
};