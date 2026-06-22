import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { runOnJS } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  Pressable,
  ScrollView,
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
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  getBookmarksForScore,
} from '../utils/database';
import { Ionicons } from '@expo/vector-icons';
import {
  Bookmark,
  MetadataFormData,
  ReaderContext,
  RootStackParamList,
  ScoreMetadata,
} from '../types';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import MetadataForm from './MetadataForm';

interface BufferedPDFViewerProps {
  uri: string;
  musicId: number;

  score: ScoreMetadata;

  context?: ReaderContext;

  onMetadataUpdated?: (formData: MetadataFormData) => void;

  onPreviousScore?: () => void;
  onNextScore?: () => void;
  onPreviousScoreFromPageTurn?: () => void;
  onNextScoreFromPageTurn?: () => void;

  initialPage?: number;
}

const ACCENT_COLOR = '#2563EB';

const THUMB_COLUMNS = 4;
const THUMB_ITEM_WIDTH = 120;
const THUMB_ROW_HEIGHT = 180;

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

  function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: '#666', fontSize: 15 }}>
        {label}
      </Text>

      <Text style={{ fontWeight: '600', fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
        marginTop: 12,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#777',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>

      {children}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
      }}
      onPress={onPress}
    >
      <Ionicons name={icon} size={19} color={ACCENT_COLOR} />
      <Text style={{ fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const BufferedPDFViewer = ({ uri, musicId, score, context, initialPage, onMetadataUpdated, onNextScore, onPreviousScore, onNextScoreFromPageTurn, onPreviousScoreFromPageTurn }: BufferedPDFViewerProps) => {
  const pagerRef = useRef<PagerView>(null);
  const renderingPages = useRef<Set<number>>(new Set());
  const pageImagesRef = useRef<Record<number, string>>({});
  const renderingThumbnails = useRef<Set<number>>(new Set());
  const thumbnailBatchCancelled = useRef(false);
  const thumbnailListRef = useRef<FlatList<number>>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [thumbnailImages, setThumbnailImages] =
    useState<Record<number, string>>({});
  const thumbnailImagesRef =
    useRef<Record<number, string>>({});
  const [jumpOverlayVisible, setJumpOverlayVisible] = useState(false);
  const [jumpPage, setJumpPage] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>("single");
  const [chromeVisible, setChromeVisible] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const chromeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [readerReady, setReaderReady] = useState(false);
  const [initialPagerIndex, setInitialPagerIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarksOverlayVisible, setBookmarksOverlayVisible] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] =
    useState('');

  const [labelOverlayVisible, setLabelOverlayVisible] =
    useState(false);
  const [scoreInfoVisible, setScoreInfoVisible] = useState(false);
  const [metadataFormVisible, setMetadataFormVisible] = useState(false);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const effectiveDisplayMode: DisplayMode =
    isLandscape ? displayMode : 'single';

  const [coverOffset, setCoverOffset] = useState(false);

  const pageStep =
    effectiveDisplayMode === 'twoPage' ? 2 : 1;

  type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

  const navigation = useNavigation<NavigationProp>();

  const pagerPageCount =
  effectiveDisplayMode === 'twoPage'
    ? coverOffset
      ? 1 + Math.ceil((totalPages - 1) / 2)
      : Math.ceil(totalPages / 2)
    : totalPages;

  const thumbnailPages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  const initialThumbnailIndex =
  Math.floor((currentPage - 1) / THUMB_COLUMNS) * THUMB_COLUMNS;

  console.log("BufferedPDFViewer onNextScore exists:", !!onNextScore);
  console.log("BufferedPDFViewer context:", context);
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

  const renderThumbnail = useCallback(
    async (page: number) => {
      if (page < 1 || page > totalPages) return;
      if (thumbnailImagesRef.current[page]) return;
      if (renderingThumbnails.current.has(page)) return;

      renderingThumbnails.current.add(page);

      try {
        const result = await AirScorePdfRenderer.renderPage({
          pdfPath: uri,
          page,
          width: 180,
          height: 252,
        });

        thumbnailImagesRef.current = {
          ...thumbnailImagesRef.current,
          [page]: result.uri,
        };

        setThumbnailImages(thumbnailImagesRef.current);
      } catch (error) {
        console.error(`Failed to render thumbnail ${page}`, error);
      } finally {
        renderingThumbnails.current.delete(page);
      }
    },
    [uri, totalPages]
  );

//   useEffect(() => {
//   if (!jumpOverlayVisible) return;

//   thumbnailBatchCancelled.current = false;

//   const renderProgressively = async () => {
//     const pages: number[] = [];

//     // Prioritize current area first.
//     const startNearCurrent = Math.max(1, currentPage - 6);
//     const endNearCurrent = Math.min(totalPages, currentPage + 12);

//     for (let p = startNearCurrent; p <= endNearCurrent; p++) {
//       pages.push(p);
//     }

//     // Then render the rest from the beginning.
//     for (let p = 1; p <= totalPages; p++) {
//       if (!pages.includes(p)) {
//         pages.push(p);
//       }
//     }

//     const batchSize = 6;

//     for (let i = 0; i < pages.length; i += batchSize) {
//       if (thumbnailBatchCancelled.current) return;

//       const batch = pages.slice(i, i + batchSize);

//       await Promise.all(batch.map((p) => renderThumbnail(p)));

//       // Let UI breathe between batches.
//       await new Promise((resolve) => setTimeout(resolve, 50));
//     }
//   };

//   renderProgressively();

//   return () => {
//     thumbnailBatchCancelled.current = true;
//   };
// }, [jumpOverlayVisible, totalPages, currentPage, renderThumbnail]);

// console.log("Context, ", context)

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
    const checkBookmark = async () => {
      if (!musicId) return;

      const exists = await isBookmarked(musicId, currentPage);
      setBookmarked(exists);
    };

    checkBookmark();
  }, [musicId, currentPage]);

  const loadBookmarks = useCallback(async () => {
    if (!musicId) return;

    const results =
      await getBookmarksForScore(musicId);

    setBookmarks(results);
  }, [musicId]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

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

  const showChromeTemporarily = useCallback(() => {
    setChromeVisible(true);

    if (chromeHideTimer.current) {
      clearTimeout(chromeHideTimer.current);
    }

    chromeHideTimer.current = setTimeout(() => {
      if (!overflowMenuOpen) {
        setChromeVisible(false);
      }

      chromeHideTimer.current = null;
    }, 5000);
  }, [overflowMenuOpen]);

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

      let safePage = 1;

      if (initialPage) {
        safePage = Math.min(initialPage, detectedTotal);
      } else {
        const saved = await AsyncStorage.getItem(`pdf:lastPage:${uri}`);
        const savedPage = saved ? Number(saved) : 1;

        safePage =
          Number.isFinite(savedPage) && savedPage > 0
            ? Math.min(savedPage, detectedTotal)
            : 1;
      }

      setCurrentPage(safePage);
      setInitialPagerIndex(getPagerIndexForPage(safePage));
      setReaderReady(true);

      showChromeTemporarily();

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

      showChromeTemporarily();
      renderPage(nextPage);
      renderBufferAround(nextPage);
    },
    [totalPages, uri, renderPage, renderBufferAround, coverOffset, effectiveDisplayMode]
  );

  const toggleBookmark = useCallback(async () => {
    if (!musicId) return;

    if (bookmarked) {
      await removeBookmark(musicId, currentPage);
      setBookmarked(false);
    } else {
      await addBookmark(musicId, currentPage);
      setBookmarked(true);
    }

    await loadBookmarks();
  }, [
    musicId,
    currentPage,
    bookmarked,
    loadBookmarks,
  ]);

  const hideChrome = useCallback(() => {
    if (chromeHideTimer.current) {
      clearTimeout(chromeHideTimer.current);
      chromeHideTimer.current = null;
    }

    setChromeVisible(false);
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
  .maxDistance(6)
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

  const renderVisibleThumbnailWindow = useCallback(
    (page: number) => {
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 6);

      for (let p = start; p <= end; p++) {
        renderThumbnail(p);
      }
    },
    [totalPages, renderThumbnail]
  );

  const handleThumbnailViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: number }> }) => {
      viewableItems.forEach(({ item }) => {
        renderVisibleThumbnailWindow(item);
      });
    },
    [renderVisibleThumbnailWindow]
  );

  // console.log("thumbnailPages:", thumbnailPages.length, "totalPages:", totalPages);

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
              <Ionicons name="chevron-back" size={28} color={ACCENT_COLOR} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: 'center', flex: 1 }}
              activeOpacity={0.75}
              onPress={() => {
                setScoreInfoVisible(true);
                setChromeVisible(true);
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 22, color: ACCENT_COLOR }}>
                {score.title ?? "Untitled"}
              </Text>

              <Text style={{ fontSize: 16, color: '#666', marginTop: 2 }}>
                {score.document_type === "Single Work" ? (
                  <Text style={{ fontWeight: 'bold' }}>{score.composer} </Text>
                ) : (
                  <Text style={{ fontWeight: 'bold' }}>{score.editor} </Text>
                )}
                {context?.setlistName && (
                  <Text>· {context.setlistName} · {context.currentIndex} of {context.totalItems}</Text>
                )}
                · Page {currentPage} of {totalPages}
              </Text>
            </TouchableOpacity>

            <Menu
              onOpen={() => {
                setOverflowMenuOpen(true);
                setChromeVisible(true);

                if (chromeHideTimer.current) {
                  clearTimeout(chromeHideTimer.current);
                  chromeHideTimer.current = null;
                }
              }}
              onClose={() => {
                setOverflowMenuOpen(false);
                showChromeTemporarily();
              }}
            >
              <MenuTrigger>
                <Ionicons name="ellipsis-vertical" size={28} color={ACCENT_COLOR} />
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
            // onPress={() => goToPage(currentPage - pageStep)}
            onPress={onPreviousScore}
          >
            <Ionicons name="arrow-back" size={28} color={ACCENT_COLOR} />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => {
              setJumpPage(currentPage.toString());
              setJumpOverlayVisible(true);
            }}
          >
            <Ionicons name="grid-outline" size={28} color={ACCENT_COLOR} />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Jump</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => console.log('Annotate')}
          >
            <Ionicons name="create-outline" size={28} color={ACCENT_COLOR} />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Annotate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => {
              loadBookmarks();
              setBookmarksOverlayVisible(true);
            }}
          >
            <Ionicons
              name="bookmarks-outline"
              size={28}
              color={ACCENT_COLOR}
            />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Bookmarks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            // onPress={() => goToPage(currentPage + pageStep)}
            onPress={onNextScore}
          >
            <Ionicons name="arrow-forward" size={28} color={ACCENT_COLOR} />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {scoreInfoVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2200,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: 460,
              maxWidth: '90%',
              backgroundColor: 'white',
              borderRadius: 18,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '700', color: ACCENT_COLOR }}>
                Score Information
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setScoreInfoVisible(false);
                  showChromeTemporarily();
                }}
              >
                <Ionicons name="close" size={28} color={ACCENT_COLOR} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
              <View
                style={{
                  width: 90,
                  height: 120,
                  borderWidth: 1,
                  borderColor: '#ddd',
                  backgroundColor: '#f8f8f8',
                }}
              >
                {thumbnailImages[1] || pageImages[1] ? (
                  <Image
                    source={{ uri: thumbnailImages[1] ?? pageImages[1] }}
                    style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                  />
                ) : null}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '700' }}>
                  {score.title ?? 'Untitled'}
                </Text>

                {score.document_type === "Single Work" ? (
                  <Text style={{ fontWeight: 'bold' }}>{score.composer} </Text>
                ) : (
                  <Text style={{ fontWeight: 'bold' }}>{score.editor} </Text>
                )}

                <Text style={{ fontSize: 14, color: '#777', marginTop: 4 }}>
                  {totalPages} pages
                </Text>

                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 10,
                    backgroundColor: '#EEF2FF',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: ACCENT_COLOR, fontWeight: '600' }}>
                    {score.document_type}
                  </Text>
                </View>
              </View>
            </View>

            <InfoSection title="Setlists">
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                }}
                onPress={() => {
                  if (context?.setlistId && context?.setlistName) {
                    navigation.navigate('SetlistDetail', {
                      setlistId: context?.setlistId!,
                      setlistName: context?.setlistName!})
                    }
                  }
                }
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="list-outline" size={20} color={ACCENT_COLOR} />
                  <Text style={{ fontSize: 15 }}>
                    {context?.setlistName || 'No setlist'}
                  </Text>
                </View>

                <Text style={{ color: '#666' }}> {context?.setlistId ? `${context?.currentIndex} of ${context?.totalItems}` : ''} ›</Text>
              </TouchableOpacity>
            </InfoSection>

            <InfoSection title="Labels">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {score.labels && score.labels.length > 0 ? (
                    score.labels?.map((label) => (
                      <View
                        key={label}
                        style={{
                          backgroundColor: '#F3F4F6',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: '#555', fontSize: 13 }}>{label}</Text>
                      </View>
                  ))
                ) : (
                  <Text style={{ color: '#555', fontSize: 13 }}>No labels assigned.</Text>
                )}
              </View>
            </InfoSection>

            <InfoSection title="Notes">
              <Text style={{ color: '#555', lineHeight: 20 }}>
                No notes yet.
              </Text>
            </InfoSection>

            <InfoSection title="Actions">
              <ActionRow
                icon="create-outline"
                label="Edit Metadata"
                onPress={() => {
                  setScoreInfoVisible(false);
                  setMetadataFormVisible(true);
                }}
              />
              <ActionRow icon="folder-outline" label="Move to Setlist" />
              <ActionRow icon="star-outline" label="Add to Favorites" />
              <ActionRow icon="share-outline" label="Export Score" />
            </InfoSection>
          </View>
        </View>
      )}

      <MetadataForm
        visible={metadataFormVisible}
        musicId={musicId}
        pdfUri={uri}
        mode="edit"
        onCancel={() => {
          setMetadataFormVisible(false);
          showChromeTemporarily();
        }}
        onSave={(formData) => {
          setMetadataFormVisible(false);

          if (formData) {
            // update local reader state or call parent refresh
            onMetadataUpdated?.(formData);
          }

          showChromeTemporarily();
        }}
      />

      {jumpOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2200,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '74%',
              maxWidth: 820,
              height: '78%',
              backgroundColor: 'white',
              borderRadius: 18,
              padding: 18,
            }}
          >
            <View 
              style={{ flexDirection: 'row', 
              justifyContent: 'space-between', 
              // alignSelf: 'flex-end', 
              alignItems: 'center', // marginTop: 12, 
              marginBottom: 16, }} 
            > 
              <Text style={{ fontSize: 22, fontWeight: '700', color: ACCENT_COLOR }}>
                Jump to Page
              </Text>
              
              <TouchableOpacity onPress={() => { 
                setJumpOverlayVisible(false) 
                showChromeTemporarily(); }}
              > 
                
                <Ionicons name="close" size={28} color={ACCENT_COLOR} /> 
                
              </TouchableOpacity> 
              
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                // justifyContent: 'space-between',
                alignSelf: 'flex-end', 
                marginBottom: 20,
              }}
            >

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 16, color: '#666' }}>Page</Text>

                <TextInput
                  value={jumpPage}
                  onChangeText={setJumpPage}
                  keyboardType="number-pad"
                  placeholder={`1-${totalPages}`}
                  placeholderTextColor="#999"
                  style={{
                    width: 70,
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 18,
                    color: '#111',
                  }}
                />

                <Text style={{ color: '#666', fontSize: 16 }}>
                  / {totalPages}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    const page = Number(jumpPage);
                    if (!Number.isFinite(page)) return;

                    goToPage(page);
                    setJumpOverlayVisible(false);
                    showChromeTemporarily();
                  }}
                  style={{
                    backgroundColor: ACCENT_COLOR,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                    Go
                  </Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                  onPress={() => {
                    setJumpOverlayVisible(false);
                    showChromeTemporarily();
                  }}
                  style={{ paddingLeft: 8 }}
                >
                  <Ionicons name="close" size={28} color={ACCENT_COLOR} />
                </TouchableOpacity> */}
              </View>
            </View>

            <FlatList
              data={thumbnailPages}
              keyExtractor={(page) => page.toString()}
              numColumns={THUMB_COLUMNS}
              onLayout={() => {
                const rowIndex = Math.floor((currentPage - 1) / THUMB_COLUMNS);

                requestAnimationFrame(() => {
                  thumbnailListRef.current?.scrollToOffset({
                    offset: rowIndex * THUMB_ROW_HEIGHT,
                    animated: false,
                  });
                });
              }}
              ref={thumbnailListRef}
              onViewableItemsChanged={handleThumbnailViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 10,
              }}
              contentContainerStyle={{
                alignItems: 'center',
                paddingBottom: 20,
              }}
              columnWrapperStyle={{
                justifyContent: 'center',
                gap: 18,
              }}
              renderItem={({ item: pageNumber }) => {
                const pageUri =
                  thumbnailImages[pageNumber] ?? pageImages[pageNumber];

                const bookmarkForPage = bookmarks.find(
                  (bookmark) => bookmark.page_number === pageNumber
                );

                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      goToPage(pageNumber);
                      setJumpOverlayVisible(false);
                      showChromeTemporarily();
                    }}
                    style={{
                      width: THUMB_ITEM_WIDTH,
                      alignItems: 'center',
                      marginBottom: 18,
                    }}
                  >
                    <View
                      style={{
                        width: 100,
                        height: 140,
                        borderWidth: currentPage === pageNumber ? 3 : 1,
                        borderColor:
                          currentPage === pageNumber ? ACCENT_COLOR : '#ddd',
                        backgroundColor: '#f5f5f5',
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
                        <>
                          <ActivityIndicator />
                          <Text style={{ color: '#999', marginTop: 4, fontSize: 11 }}>
                            Loading
                          </Text>
                        </>
                      )}

                      {bookmarkForPage && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'white',
                            borderRadius: 10,
                            padding: 2,
                          }}
                        >
                          <Ionicons name="bookmark" size={16} color={ACCENT_COLOR} />
                        </View>
                      )}
                    </View>

                    <Text style={{ marginTop: 4, fontSize: 12 }}>
                      {pageNumber}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          
        </View>
      )}

      {bookmarksOverlayVisible && (
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
              width: 420,
              maxHeight: '70%',
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
              Bookmarks
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (bookmarked) {
                  toggleBookmark();
                } else {
                  setBookmarkLabel('');
                  setLabelOverlayVisible(true);
                }
              }}
              style={{
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, color: '#2563EB', fontWeight: '600' }}>
                {bookmarked
                  ? `Remove bookmark from page ${currentPage}`
                  : `Bookmark page ${currentPage}`}
              </Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 360 }}>
              {bookmarks.length === 0 ? (
                <Text style={{ color: '#666', textAlign: 'center', padding: 16 }}>
                  No bookmarks yet
                </Text>
              ) : (
                bookmarks.map((bookmark) => (
                  <TouchableOpacity
                    key={bookmark.id}
                    onPress={() => {
                      goToPage(bookmark.page_number);
                      setBookmarksOverlayVisible(false);
                      showChromeTemporarily();
                    }}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                  >
                    <View>
                      {bookmark.label ? (
                        <Text style={{ fontSize: 16, fontWeight: '600' }}>
                          {bookmark.label}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: '600'  }}>
                          No label
                        </Text>
                      )}

                      <Text style={{ color: '#666', marginTop: 2  }}>
                        Page {bookmark.page_number}
                      </Text>
                    </View>

                    <Ionicons name="bookmark" size={22} color="#2563EB" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <TouchableOpacity
                onPress={() => setBookmarksOverlayVisible(false)}
                style={{
                  padding: 10,
                  paddingHorizontal: 18,
                  backgroundColor: '#2563EB',
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {labelOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2100,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 400,
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                marginBottom: 12,
              }}
            >
              Add Bookmark
            </Text>

            <Text
              style={{
                color: '#666',
                marginBottom: 16,
              }}
            >
              Page {currentPage}
            </Text>

            <TextInput
              value={bookmarkLabel}
              onChangeText={setBookmarkLabel}
              placeholder="Label (optional)"
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setLabelOverlayVisible(false)
                }
                style={{
                  padding: 10,
                  paddingHorizontal: 18,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!musicId) return;

                  await addBookmark(
                    musicId,
                    currentPage,
                    bookmarkLabel.trim()
                  );

                  await loadBookmarks();

                  setBookmarked(true);
                  setLabelOverlayVisible(false);

                  showChromeTemporarily();
                }}
                style={{
                  backgroundColor: '#2563EB',
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '700',
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {!jumpOverlayVisible && !bookmarksOverlayVisible && !labelOverlayVisible && !scoreInfoVisible && (
        <GestureDetector gesture={centerTapGesture}>
          <View
            collapsable={false}
            style={{
              position: 'absolute',
              left: '25%',
              right: '25%',
              top: '25%',
              bottom: '25%',
              zIndex: 900,
              // backgroundColor: 'rgba(255, 0, 0, 0.12)',
            }}
          />
        </GestureDetector>
      )}

      {!jumpOverlayVisible && !bookmarksOverlayVisible && !labelOverlayVisible && !scoreInfoVisible && (
        <>
          {/* left Pressable */}

           <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '7%',
              zIndex: 999,
              elevation: 999,
              // backgroundColor: 'rgba(255, 0, 0, 0.12)',
            }}
            onPress={() => {
              const previousPage = currentPage - pageStep;

              if (previousPage < 1) {
                onPreviousScoreFromPageTurn?.();
                return;
              }

              goToPage(previousPage);
              showChromeTemporarily();
            }}
          />

          {/* right Pressable */}
          <Pressable
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '7%',
              zIndex: 999,
              elevation: 999,
              // backgroundColor: 'rgba(255, 0, 0, 0.12)',
            }}
            onPress={() => {
              console.log("Right tap zone pressed", {
                currentPage,
                pageStep,
                totalPages,
                hasNextScore: !!onNextScore,
              });

              const nextPage = currentPage + pageStep;

              if (nextPage > totalPages) {
                console.log("Calling next score");
                onNextScoreFromPageTurn?.();
                return;
              }

              goToPage(nextPage);
              showChromeTemporarily();
            }}
          />
        </>
      )}
    </View>
  );
};

export default BufferedPDFViewer;