import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AirScorePdfRenderer from '../native/AirScorePdfRenderer';

interface BufferedPDFViewerProps {
  uri: string;
}

type DisplayMode =
  | "single"
  | "twoPage";

const BUFFER_BEHIND = 2;
const BUFFER_AHEAD = 4;

const BufferedPDFViewer = ({ uri }: BufferedPDFViewerProps) => {
  const pagerRef = useRef<PagerView>(null);
  const renderingPages = useRef<Set<number>>(new Set());
  const pageImagesRef = useRef<Record<number, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [jumpPage, setJumpPage] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>("single");

  const renderPage = useCallback(
    async (page: number) => {
      if (page < 1 || page > totalPages) return;
      if (pageImagesRef.current[page]) return;
      if (renderingPages.current.has(page)) return;

      renderingPages.current.add(page);

      try {
        const start = performance.now();

        const result = await AirScorePdfRenderer.renderPage({
          pdfPath: uri,
          page,
          width: 1600,
          height: 2200,
        });

        console.log(
          `Rendered page ${page} in ${Math.round(performance.now() - start)}ms`
        );

        pageImagesRef.current = {
          ...pageImagesRef.current,
          [page]: result.uri,
        };

        setPageImages(pageImagesRef.current);
      } catch (error) {
        console.error(`Failed to render page ${page}`, error);
      } finally {
        renderingPages.current.delete(page);
      }
    },
    [uri, totalPages]
  );

  const renderBufferAround = useCallback(
    (page: number) => {
      const pages: number[] = [page];

      for (
        let p = page + 1;
        p <= Math.min(totalPages, page + BUFFER_AHEAD);
        p++
      ) {
        pages.push(p);
      }

      for (
        let p = page - 1;
        p >= Math.max(1, page - BUFFER_BEHIND);
        p--
      ) {
        pages.push(p);
      }

      pages.forEach(renderPage);
    },
    [renderPage, totalPages]
  );

  useEffect(() => {
    const loadDisplayMode = async () => {
      const saved = await AsyncStorage.getItem(
        "reader:displayMode"
      );

      if (
        saved === "single" ||
        saved === "twoPage"
      ) {
        setDisplayMode(saved);
      }
    };

    loadDisplayMode();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      "reader:displayMode",
      displayMode
    );
  }, [displayMode]);

  useEffect(() => {
    let cancelled = false;

    const initialiseDocument = async () => {
      console.log('Document changed, clearing page cache');

      pageImagesRef.current = {};
      setPageImages({});
      renderingPages.current.clear();

      const detectedTotal = await AirScorePdfRenderer.getPageCount(uri);

      if (cancelled) return;

      setTotalPages(detectedTotal);

      const saved = await AsyncStorage.getItem(`pdf:lastPage:${uri}`);
      const savedPage = saved ? Number(saved) : 1;

      const safePage =
        Number.isFinite(savedPage) && savedPage > 0
          ? Math.min(savedPage, detectedTotal)
          : 1;

      setCurrentPage(safePage);

      requestAnimationFrame(() => {
        pagerRef.current?.setPageWithoutAnimation(safePage - 1);
      });
    };

    initialiseDocument();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  useEffect(() => {
    renderBufferAround(currentPage);
  }, [currentPage, renderBufferAround]);

  const goToPage = useCallback(
    (page: number) => {
      const nextPage = Math.max(1, Math.min(page, totalPages));

      setCurrentPage(nextPage);
      pagerRef.current?.setPage(nextPage - 1);

      AsyncStorage.setItem(`pdf:lastPage:${uri}`, nextPage.toString());

      renderPage(nextPage);
      renderBufferAround(nextPage);
    },
    [totalPages, uri, renderPage, renderBufferAround]
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: 6,
        }}
      >
        <Text style={{ color: 'white' }}>
          Page {currentPage}/{totalPages}
        </Text>

        <Text style={{ color: 'white' }}>
          Cached: {Object.keys(pageImages).length}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          top: 50,
          right: 20,
          zIndex: 1000,
          flexDirection: 'row',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 8,
        }}
      >
        <TextInput
          value={jumpPage}
          onChangeText={setJumpPage}
          keyboardType="number-pad"
          placeholder="Page"
          placeholderTextColor="#999"
          style={{
            width: 80,
            color: 'white',
            borderWidth: 1,
            borderColor: '#666',
            marginRight: 8,
            paddingHorizontal: 8,
          }}
        />

        <Button
          title="Go"
          onPress={() => {
            const page = Number(jumpPage);
            if (Number.isFinite(page)) goToPage(page);
          }}
        />
      </View>

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        offscreenPageLimit={5}
        onPageSelected={(event) => {
          const selectedPage = event.nativeEvent.position + 1;

          setCurrentPage(selectedPage);
          AsyncStorage.setItem(`pdf:lastPage:${uri}`, selectedPage.toString());

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
                backgroundColor: 'white',
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
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <ActivityIndicator />

                  <Text style={{ color: 'black' }}>
                    Rendering page {pageNumber}…
                  </Text>
                </View>
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
          // backgroundColor: 'rgba(255, 0, 0, 0.12)',
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
          // backgroundColor: 'rgba(255, 0, 0, 0.12)',
        }}
        onPress={() => goToPage(currentPage + 1)}
      />
    </View>
  );
};

export default BufferedPDFViewer;