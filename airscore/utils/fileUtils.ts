/**
 * Imports the Expo document picker module which provides access to the system's native UI for selecting documents from the user's device
 * @see {@link https://docs.expo.dev/versions/latest/sdk/document-picker/}
 */
import * as DocumentPicker from 'expo-document-picker';
/** 
 * Imports the Expo file system module which allows the app access to a device's local file system
 * @see {@link https://docs.expo.dev/versions/latest/sdk/filesystem/}
 * */ 
import * as FileSystem from 'expo-file-system';

/**
 * This function facilitates the uploading of the PDF to the system.
 * @using DocumentPicker, FileSystem
 * @returns local path of the uploaded PDF as a string; or returns null
 */
import * as Crypto from "expo-crypto";

export const UploadLocalPDF = async (): Promise<{
  uri: string;
  originalFilename: string;
} | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: false,
  });

  if (!result.assets?.length) return null;

  const file = result.assets[0];

  const id = Crypto.randomUUID();
  const dest = `${FileSystem.documentDirectory}scores/${id}.pdf`;

  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}scores`,
    { intermediates: true }
  );

  await FileSystem.copyAsync({
    from: file.uri,
    to: dest,
  });

  return {
    uri: dest,
    originalFilename: file.name,
  };
};