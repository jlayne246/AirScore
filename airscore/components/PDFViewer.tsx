import Pdf from 'react-native-pdf-expo';

interface PDFViewerProps {
    uri: string;
}

const PDFViewer = ({ uri }: PDFViewerProps) => (
    <Pdf
        source={{uri}}
        style={{flex: 1}}
        fitPolicy={2}
        onLoadComplete={(pages) => console.log(`Loaded ${pages} pages`)}
    />
);

export default PDFViewer;