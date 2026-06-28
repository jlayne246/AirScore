// native/AirScorePdfImport.ts

import { NativeModules, Platform } from "react-native";

type ImportedPdf = {
  uri: string;
  originalFilename: string;
};

const { AirScorePdfImporter } = NativeModules;

export const importPdfNative = async (
  sourceUri: string
): Promise<ImportedPdf> => {
  if (Platform.OS !== "android") {
    throw new Error("Native PDF import is only implemented on Android.");
  }

  if (!AirScorePdfImporter?.importPdf) {
    throw new Error("PdfImportModule is not available. Rebuild the Android app.");
  }

  return AirScorePdfImporter.importPdf(sourceUri);
};