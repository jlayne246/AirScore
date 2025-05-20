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
export const UploadLocalPDF = async (): Promise<string | null> => {
    // This displays the system UI for choosing a document. It only allows PDF files, and it doesn't copy to the app's cache. This returns the information about the chosen document.
    const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: false
    });

    if (result.assets && result.assets.length > 0) {
        // Retrieves the file object from the chosen file
        const file = result.assets[0];
        /**
         * This line of code sets the destination path for the uploaded PDF
         * FileSystem.documentDirectory provides the URI/directory where the user documents for the apps will be stored. They may remain there unless deleted by the app.
         * file.name retrieves the file name from the selected document
         */
        const dest = `${FileSystem.documentDirectory}${file.name}`;

        // FileSystem.copyAsync creates a copy of the file. In this case, it copies the file from the original location (using file.uri) to the destination location set before
        await FileSystem.copyAsync({
            from: file.uri, to: dest
        });

        return dest; // local file path to the saved PDF
    }

    return null;
}