import Pdf from 'react-native-pdf';

interface PDFViewerProps {
    uri: string;
}

const PDFViewer = ({ uri }: PDFViewerProps) => {
    console.log(uri)
    return (
        <Pdf
            trustAllCerts={false}
            source={{uri: uri, cache: true}}
            style={{flex: 1}}
            fitPolicy={2}
            horizontal
            enablePaging={true}
            onLoadComplete={(pages) => console.log(`Loaded ${pages} pages`)}
        />
    );
};

export default PDFViewer;