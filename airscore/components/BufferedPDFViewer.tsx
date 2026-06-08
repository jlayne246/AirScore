import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PdfThumbnail from 'react-native-pdf-thumbnail';

interface BufferedPDFViewerProps {
  uri: string;
}

const BUFFER_BEHIND = 1;
const BUFFER_AHEAD = 2;

// Temporary until you can detect total pages properly
const FALLBACK_TOTAL_PAGES = 6;

const BufferedPDFViewer = ({ uri }: BufferedPDFViewerProps) => {
  const pagerRef = useRef<PagerView>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(FALLBACK_TOTAL_PAGES);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const renderingPages = useRef<Set<number>>(new Set());

  const renderPage = useCallback(
    async (page: number) => {
      if (page < 1 || page > totalPages) return;
      if (pageImages[page]) return;
      if (renderingPages.current.has(page)) return;

      renderingPages.current.add(page);

      try {
        // react-native-pdf-thumbnail uses zero-based page indexes
        const result = await PdfThumbnail.generate(uri, page - 1);

        setPageImages((prev) => ({
          ...prev,
          [page]: result.uri,
        }));
      } catch (error) {
        console.error(`Failed to render page ${page}`, error);
      } finally {
        renderingPages.current.delete(page);
      }
    },
    [uri, totalPages, pageImages]
  );

  const renderBufferAround = useCallback(
    async (page: number) => {
      const start = Math.max(1, page - BUFFER_BEHIND);
      const end = Math.min(totalPages, page + BUFFER_AHEAD);

      for (let p = start; p <= end; p++) {
        renderPage(p);
      }
    },
    [renderPage, totalPages]
  );

  useEffect(() => {
    const loadLastPage = async () => {
      const saved = await AsyncStorage.getItem(`pdf:lastPage:${uri}`);
      const page = saved ? Number(saved) : 1;

      const safePage =
        Number.isFinite(page) && page > 0
          ? Math.min(page, totalPages)
          : 1;

      setCurrentPage(safePage);

      requestAnimationFrame(() => {
        pagerRef.current?.setPageWithoutAnimation(safePage - 1);
      });

      renderBufferAround(safePage);
    };

    loadLastPage();
  }, [uri, totalPages, renderBufferAround]);

  useEffect(() => {
    renderBufferAround(currentPage);
  }, [currentPage, renderBufferAround]);

  const goToPage = useCallback(
    async (page: number) => {
      const nextPage = Math.max(1, Math.min(page, totalPages));

      // Pre-render before turning, if possible.
      await renderPage(nextPage);

      setCurrentPage(nextPage);
      pagerRef.current?.setPage(nextPage - 1);

      await AsyncStorage.setItem(`pdf:lastPage:${uri}`, nextPage.toString());

      renderBufferAround(nextPage);
    },
    [totalPages, uri, renderPage, renderBufferAround]
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={currentPage - 1}
        onPageSelected={async (event) => {
          const selectedPage = event.nativeEvent.position + 1;

          setCurrentPage(selectedPage);
          await AsyncStorage.setItem(
            `pdf:lastPage:${uri}`,
            selectedPage.toString()
          );

          renderBufferAround(selectedPage);
        }}
      >
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          const pageUri = pageImages[pageNumber];

          return (
            <View
              key={pageNumber}
              style={{
                flex: 1,
                backgroundColor: 'black',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {pageUri ? (
                <Image
                  source={{ uri: pageUri }}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                />
              ) : (
                <ActivityIndicator />
              )}
            </View>
          );
        })}
      </PagerView>

      <Pressable
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '10%',
          zIndex: 999,
          elevation: 999,
          backgroundColor: 'rgba(255, 0, 0, 0.12)',
        }}
        onPress={() => goToPage(currentPage - 1)}
      />

      <Pressable
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '10%',
          zIndex: 999,
          elevation: 999,
          backgroundColor: 'rgba(255, 0, 0, 0.12)',
        }}
        onPress={() => goToPage(currentPage + 1)}
      />
    </View>
  );
};

export default BufferedPDFViewer;
