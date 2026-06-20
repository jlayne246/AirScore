import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { runOnJS } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Button,
  Image,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import PagerView from 'react-native-pager-view';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AirScorePdfRenderer from '../native/AirScorePdfRenderer';

interface BufferedPDFViewerProps {
  uri: string;
}

const ACCENT_COLOR = '#2563EB';

type DisplayMode =
  | "single"
  | "twoPage";

const getBuffer = (mode: DisplayMode) => {
  if (mode === "twoPage") {
    return {
      behind: 4,
      ahead: 6,
    };
  }

  return {
    behind: 2,
    ahead: 4,
  };
};

function RenderedPage({
    uri,
    pageNumber,
  }: {
    uri?: string;
    pageNumber: number;
  }) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: 'white',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: '100%',
              height: '100%',
              resizeMode: 'contain',
            }}
          />
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ActivityIndicator />
            <Text style={{ color: ACCENT_COLOR  }}>
              Rendering page {pageNumber}…
            </Text>
          </View>
        )}
      </View>
    );
  }

const BufferedPDFViewer = ({ uri }: BufferedPDFViewerProps) => {
  const pagerRef = useRef<PagerView>(null);
  const renderingPages = useRef<Set<number>>(new Set());
  const pageImagesRef = useRef<Record<number, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [jumpOverlayVisible, setJumpOverlayVisible] = useState(false);
  const [jumpPage, setJumpPage] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>("single");
  const [chromeVisible, setChromeVisible] = useState(false);
  const chromeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [readerReady, setReaderReady] = useState(false);
  const [initialPagerIndex, setInitialPagerIndex] = useState(0);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const effectiveDisplayMode: DisplayMode =
    isLandscape ? displayMode : 'single';

  const [coverOffset, setCoverOffset] = useState(false);

  const pageStep =
    effectiveDisplayMode === 'twoPage' ? 2 : 1;

  const navigation = useNavigation();

  const pagerPageCount =
  effectiveDisplayMode === 'twoPage'
    ? coverOffset
      ? 1 + Math.ceil((totalPages - 1) / 2)
      : Math.ceil(totalPages / 2)
    : totalPages;

  // const buffer = getBuffer(effectiveDisplayMode);

  const getPagerIndexForPage = useCallback(
    (page: number) => {
      if (effectiveDisplayMode === 'single') return page - 1;
      if (coverOffset) return page <= 1 ? 0 : Math.ceil((page - 1) / 2);
      return Math.floor((page - 1) / 2);
    },
    [effectiveDisplayMode, coverOffset]
  );

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
      const buffer = getBuffer(effectiveDisplayMode);

      const pages: number[] = [page];

      for (
        let p = page + 1;
        p <= Math.min(totalPages, page + buffer.ahead);
        p++
      ) {
        pages.push(p);
      }

      for (
        let p = page - 1;
        p >= Math.max(1, page - buffer.behind);
        p--
      ) {
        pages.push(p);
      }

      pages.forEach(renderPage);
    },
    [renderPage, totalPages, getBuffer]
  );

  // const singleTap = Gesture.Tap()
  // const doubleTap = Gesture.Tap().numberOfTaps(2)
  // const pinch = Gesture.Pinch()
  // const longPress = Gesture.LongPress()

  // const gesture = Gesture.Simultaneous(
  //   singleTap,
  //   doubleTap,
  //   pinch,
  //   longPress
  // );

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
      setReaderReady(false);
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
      setInitialPagerIndex(getPagerIndexForPage(safePage));
      setReaderReady(true);

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
      const getPagerIndexForPage = (page: number) => {
        if (effectiveDisplayMode === 'single') {
          return page - 1;
        }

        if (coverOffset) {
          return page <= 1 ? 0 : Math.ceil((page - 1) / 2);
        }

        return Math.floor((page - 1) / 2);
      };
      pagerRef.current?.setPage(getPagerIndexForPage(nextPage));

      AsyncStorage.setItem(`pdf:lastPage:${uri}`, nextPage.toString());

      renderPage(nextPage);
      renderBufferAround(nextPage);
    },
    [totalPages, uri, renderPage, renderBufferAround, coverOffset, effectiveDisplayMode]
  );

  const hideChrome = useCallback(() => {
    if (chromeHideTimer.current) {
      clearTimeout(chromeHideTimer.current);
      chromeHideTimer.current = null;
    }

    setChromeVisible(false);
  }, []);

  const showChromeTemporarily = useCallback(() => {
    setChromeVisible(true);

    if (chromeHideTimer.current) {
      clearTimeout(chromeHideTimer.current);
    }

    chromeHideTimer.current = setTimeout(() => {
      setChromeVisible(false);
      chromeHideTimer.current = null;
    }, 3500);
  }, []);

  const toggleChrome = useCallback(() => {
    setChromeVisible((visible) => {
      if (chromeHideTimer.current) {
        clearTimeout(chromeHideTimer.current);
        chromeHideTimer.current = null;
      }

      if (visible) {
        return false;
      }

      chromeHideTimer.current = setTimeout(() => {
        setChromeVisible(false);
        chromeHideTimer.current = null;
      }, 3500);

      return true;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (chromeHideTimer.current) {
        clearTimeout(chromeHideTimer.current);
      }
    };
  }, []);

  const centerTapGesture = Gesture.Tap()
  .maxDuration(220)
  .maxDistance(10)
  .onEnd((_event, success) => {
    if (success) {
      runOnJS(toggleChrome)();
    }
  });

  // const singleTap = Gesture.Tap()
  // .numberOfTaps(1)
  // .maxDuration(220)
  // .maxDistance(10)
  // .onEnd(() => {
  //   runOnJS(showChromeTemporarily)();
  // });

  // const doubleTap = Gesture.Tap()
  //   .numberOfTaps(2)
  //   .maxDuration(300)
  //   .maxDistance(20)
  //   .onEnd(() => {
  //     runOnJS(console.log)('Double tap: future zoom');
  //   });

  // const longPress = Gesture.LongPress()
  //   .minDuration(450)
  //   .onEnd(() => {
  //     runOnJS(console.log)('Long press: future annotation/context menu');
  //   });

  // const pinch = Gesture.Pinch()
  //   .onBegin(() => {
  //     runOnJS(console.log)('Pinch begin: future zoom');
  //   });

  // const gesture = Gesture.Exclusive(
  //   doubleTap,
  //   Gesture.Simultaneous(
  //     pinch,
  //     longPress,
  //     singleTap
  //   )
  // );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {chromeVisible && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            zIndex: 1300,
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderBottomWidth: 1,
            borderBottomColor: '#ddd',
            paddingHorizontal: 16,
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 28, color: ACCENT_COLOR }}>
                ‹
              </Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 22, color: ACCENT_COLOR }}>
                Amazing Grace
              </Text>

              <Text style={{ fontSize: 16, color: '#666', marginTop: 2 }}>
                Sunday Eucharist · 2 of 6 · Page {currentPage} of {totalPages}
              </Text>
            </View>

            <Menu>
              <MenuTrigger>
                <Text style={{ fontSize: 28, paddingHorizontal: 8, color: ACCENT_COLOR  }}>⋮</Text>
              </MenuTrigger>

              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    paddingVertical: 6,
                    width: 220,
                  },
                }}
              >
                <MenuOption
                  onSelect={() => {
                    setDisplayMode((mode) =>
                      mode === 'single' ? 'twoPage' : 'single'
                    );
                  }}
                >
                  <Text style={{ padding: 10, fontSize: 16, color: ACCENT_COLOR  }}>
                    View: {displayMode === 'twoPage' ? 'Two Page' : 'Single Page'}
                  </Text>
                </MenuOption>

                <MenuOption
                  onSelect={() => {
                    setCoverOffset((v) => !v);
                  }}
                >
                  <Text style={{ padding: 10, fontSize: 16, color: ACCENT_COLOR  }}>
                    Cover Offset: {coverOffset ? 'On' : 'Off'}
                  </Text>
                </MenuOption>
              </MenuOptions>
            </Menu>
          </View>
        </View>
      )}

      {/* <GestureDetector gesture={gesture}> */}
        {readerReady ? (
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={initialPagerIndex}
            offscreenPageLimit={5}
            onPageSelected={(event) => {
              const position = event.nativeEvent.position;

              const selectedPage =
                effectiveDisplayMode === 'twoPage'
                  ? coverOffset
                    ? position === 0
                      ? 1
                      : position * 2
                    : position * 2 + 1
                  : position + 1;

              setCurrentPage(selectedPage);
              AsyncStorage.setItem(`pdf:lastPage:${uri}`, selectedPage.toString());

              renderBufferAround(selectedPage);
            }}
          >
            {Array.from(
              {
                length:
                  pagerPageCount,
              },
              (_, index) => {
                if (effectiveDisplayMode === 'single') {
                  const pageNumber = index + 1;

                  return (
                    <View key={`single-${pageNumber}`} style={{ flex: 1 }}>
                      <RenderedPage
                        uri={pageImages[pageNumber]}
                        pageNumber={pageNumber}
                      />
                    </View>
                  );
                }

                if (coverOffset && index === 0) {
                  return (
                    <View
                      key="cover-spread"
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        backgroundColor: 'white',
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: 'white',
                        }}
                      />

                      <RenderedPage
                        uri={pageImages[1]}
                        pageNumber={1}
                      />
                    </View>
                  );
                }

                const leftPage = coverOffset
                  ? index * 2
                  : index * 2 + 1;

                const rightPage = leftPage + 1;

                return (
                  <View
                    key={`spread-${index}`}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      backgroundColor: 'white',
                    }}
                  >
                    <RenderedPage
                      uri={pageImages[leftPage]}
                      pageNumber={leftPage}
                    />

                    {rightPage <= totalPages ? (
                      <RenderedPage
                        uri={pageImages[rightPage]}
                        pageNumber={rightPage}
                      />
                    ) : (
                      <View style={{ flex: 1, backgroundColor: 'white' }} />
                    )}
                  </View>
                );
              }
            )}
          </PagerView>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <Text style={{ color: ACCENT_COLOR }}>
              Opening score…
            </Text>
          </View>
        )}
      {/* </GestureDetector> */}
      
      {chromeVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 84,
            zIndex: 1300,
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderTopWidth: 1,
            borderTopColor: '#ddd',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingHorizontal: 12,
          }}
        >
          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => goToPage(currentPage - pageStep)}
          >
            <Text style={{ fontSize: 28, color: ACCENT_COLOR }}>≪</Text>
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => {
              setJumpPage(currentPage.toString());
              setJumpOverlayVisible(true);
            }}
          >
            <Text style={{ fontSize: 28, color: ACCENT_COLOR }}>▦</Text>
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Jump</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => console.log('Annotate')}
          >
            <Text style={{ fontSize: 28, color: ACCENT_COLOR }}>✎</Text>
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Annotate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => console.log('Bookmark')}
          >
            <Text style={{ fontSize: 28, color: ACCENT_COLOR }}>♡</Text>
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Bookmark</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => goToPage(currentPage + pageStep)}
          >
            <Text style={{ fontSize: 28, color: ACCENT_COLOR }}>≫</Text>
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {jumpOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 360,
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12, color: ACCENT_COLOR  }}>
              Jump to Page
            </Text>

            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              Enter a page from 1 to {totalPages}
            </Text>

            <TextInput
              value={jumpPage}
              onChangeText={setJumpPage}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 20,
                marginBottom: 16,
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setJumpOverlayVisible(false)}
                style={{ padding: 10 }}
              >
                <Text style={{ fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const page = Number(jumpPage);

                  if (Number.isFinite(page)) {
                    goToPage(page);
                    setJumpOverlayVisible(false);
                    showChromeTemporarily();
                  }
                }}
                style={{
                  padding: 10,
                  paddingHorizontal: 18,
                  backgroundColor: 'dodgerblue',
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  Go
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <GestureDetector gesture={centerTapGesture}>
        <View
          collapsable={false}
          style={{
            position: 'absolute',
            left: '15%',
            right: '15%',
            top: 64,
            bottom: 84,
            zIndex: 900,
          }}
        />
      </GestureDetector>

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
        onPress={() => {
          goToPage(currentPage - pageStep);
          // showChromeTemporarily();
        }}
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
        onPress={() => {
          goToPage(currentPage + pageStep);
          // showChromeTemporarily();
        }}
      />
    </View>
  );
};

export default BufferedPDFViewer;