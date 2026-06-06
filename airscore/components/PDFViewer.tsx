import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  View,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import Pdf from 'react-native-pdf';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PDFViewerProps {
  uri: string;
}

const PDFViewer = ({ uri }: PDFViewerProps) => {
  const pdfRef = useRef<any>(null);
  const [initialPage, setInitialPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load last viewed page
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(`pdf:lastPage:${uri}`);
      if (saved) {
        setInitialPage(parseInt(saved));
        setCurrentPage(parseInt(saved)); // <-- Add this line
        console.log(`Resuming at page ${saved}`);
      }
    })();
  }, [uri]);

  // Save current page to cache
  const handlePageChanged = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
    AsyncStorage.setItem(`pdf:lastPage:${uri}`, page.toString());
  };

  // Handle taps on sides to turn page
  const handleTap = (event: GestureResponderEvent) => {
    const screenWidth = Dimensions.get('window').width;
    const tapX = event.nativeEvent.locationX;

    console.log(`Tapped at: ${tapX}`);

    if (tapX < screenWidth * 0.3 && currentPage > 1) {
      // Tap on left third of screen: go back
      console.log('Going back a page');
      setCurrentPage(currentPage - 1); // <-- Use state
      pdfRef.current.setPage(currentPage - 1);
    } else if (tapX > screenWidth * 0.7 && currentPage < totalPages) {
      // Tap on right third of screen: go forward
      console.log('Going forward a page');
      setCurrentPage(currentPage + 1); // <-- Use state
      pdfRef.current.setPage(currentPage + 1);
      console.log(currentPage);
    }
  };

  // ...existing code...
    return (
    <View style={{ flex: 1 }}>
        <Pdf
            ref={pdfRef}
            source={{ uri, cache: true }}
            style={{ flex: 1 }}
            // page={currentPage}
            trustAllCerts={false}
            fitPolicy={2}
            enablePaging={true}
            horizontal={true}
            onLoadComplete={(pages) => setTotalPages(pages)}
            onPageChanged={handlePageChanged}
            onError={(err) => console.error('PDF error:', err)}
        />
        {/* Left tap zone */}
        <Pressable
        style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '20%',
            zIndex: 10,
        }}
        onPress={(e) => {
            if (currentPage > 1) {
                console.log("Tapping to go back a page");
                pdfRef.current?.setPage(currentPage - 1);
                // setCurrentPage(currentPage - 1); // <-- Update state
            }
        }}
        />
        {/* Right tap zone */}
        <Pressable
        style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '20%',
            zIndex: 10,
        }}
        onPress={(e) => {
            if (currentPage < totalPages) {
                console.log("Tapping to go forward a page");
                pdfRef.current?.setPage(currentPage + 1);
                // setCurrentPage(currentPage + 1); // <-- Update state
            }
        }}
        />
    </View>
    );
    // ...existing code...
};

export default PDFViewer;
