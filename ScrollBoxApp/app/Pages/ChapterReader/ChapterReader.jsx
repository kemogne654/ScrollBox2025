// ChapterReader.js
import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import ApiService from "@/app/Services/ApiService";
import { useNavigation } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { Buffer } from "buffer";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import * as MediaLibrary from "expo-media-library";
import { usePreventScreenCapture } from "expo-screen-capture";
import AnimatedDownloadModal from "./AnimatedDownloadModal";

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MIN_SCALE = 1;
const MAX_SCALE = 3;

const ChapterReader = ({
  chapterId,
  onClose,
  nextChapterId,
  previousChapterId,
  nextChapterPurchased,
  language,
}) => {
  // Initialize screen capture prevention
  usePreventScreenCapture();

  const navigation = useNavigation();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState("");
  const [error, setError] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastLanguage, setLastLanguage] = useState(language);
  const [lastToken, setLastToken] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasScreenCapturePermission, setHasScreenCapturePermission] =
    useState(false);

  useEffect(() => {
    const setupScreenCaptureProtection = async () => {
      try {
        // Request media library permissions for screen capture detection
        const { status } = await MediaLibrary.requestPermissionsAsync();
        setHasScreenCapturePermission(status === "granted");

        if (status === "granted") {
          // Add screen capture detection listener
          const subscription = MediaLibrary.addListener(async (event) => {
            if (event.type === "capture") {
              Alert.alert(
                "Screen Capture Detected",
                "Screen captures are not allowed for security reasons.",
                [{ text: "OK" }]
              );

              // Log the attempt (you could send this to your server)
              console.warn("Screen capture attempt detected");
            }
          });

          return () => {
            subscription.remove();
          };
        }
      } catch (error) {
        console.error("Screen capture protection setup error:", error);
      }
    };

    setupScreenCaptureProtection();
  }, []);

  useEffect(() => {
    const checkAuthAndLanguage = async () => {
      try {
        const currentToken = await AsyncStorage.getItem("token");

        // Handle token changes (login/logout)
        if (lastToken !== currentToken) {
          await clearAllChapterCaches();
          setLastToken(currentToken);

          if (!currentToken) {
            navigation.navigate("Login");
            return;
          }
        }

        // Handle language changes
        if (lastLanguage !== language) {
          await clearLanguageChapterCache(lastLanguage);
          setLastLanguage(language);
          await loadChapter();
        }
      } catch (error) {
        console.error("Auth/Language check error:", error);
        handleError(error);
      }
    };

    checkAuthAndLanguage();
  }, [language, lastLanguage, lastToken]);

  useEffect(() => {
    let mounted = true;

    const setupReader = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure we have a valid chapterId
        if (!chapterId) {
          throw new Error("No chapter ID provided");
        }

        const subscription = Dimensions.addEventListener(
          "change",
          ({ window }) => {
            if (mounted) {
              setDimensions(window);
            }
          }
        );

        await ScreenOrientation.unlockAsync();
        await loadChapter();

        return () => {
          mounted = false;
          subscription?.remove();
          ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT
          );
        };
      } catch (error) {
        console.error("Setup error:", error);
        if (mounted) {
          handleError(error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    setupReader();

    return () => {
      mounted = false;
    };
  }, [chapterId]);

  const handleError = (error) => {
    const errorMessage = error.message || "An error occurred";
    setError(errorMessage);

    if (errorMessage.includes("Authentication required")) {
      Alert.alert(
        "Session Expired",
        "Please log in again to continue reading.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } else {
      Alert.alert("Error", errorMessage, [
        {
          text: "Retry",
          onPress: () => retryOperation(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    }
  };

  const retryOperation = async () => {
    setIsRetrying(true);
    try {
      await loadChapter();
    } catch (error) {
      console.error("Retry error:", error);
      handleError(error);
    } finally {
      setIsRetrying(false);
    }
  };

  const clearAllChapterCaches = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chapterKeys = keys.filter((key) => key.startsWith("chapter_"));

      if (chapterKeys.length > 0) {
        await AsyncStorage.multiRemove(chapterKeys);
      }

      const cacheDir = FileSystem.cacheDirectory;
      const dirContent = await FileSystem.readDirectoryAsync(cacheDir);

      for (const item of dirContent) {
        if (item.startsWith("chapter_")) {
          await FileSystem.deleteAsync(`${cacheDir}${item}`, {
            idempotent: true,
          });
        }
      }
    } catch (error) {
      console.error("Cache clearing error:", error);
    }
  };

  const getCacheKey = (lang) => `chapter_${chapterId}_${lang}`;

  const clearLanguageChapterCache = async (lang) => {
    try {
      const cacheKey = getCacheKey(lang);
      await AsyncStorage.removeItem(cacheKey);
      const extractDir = `${FileSystem.cacheDirectory}chapter_${chapterId}_${lang}/`;
      await FileSystem.deleteAsync(extractDir, { idempotent: true });
    } catch (error) {
      console.error("Language cache clearing error:", error);
    }
  };

  const validateCBZFile = async (fileUri) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists || fileInfo.size < 100) {
        throw new Error("Invalid CBZ file: File too small or doesn't exist");
      }

      const headerData = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: 0,
        length: 4,
      });

      const headerBuffer = Buffer.from(headerData, "base64");
      if (headerBuffer.readUInt32LE(0) !== 0x04034b50) {
        throw new Error("Invalid CBZ file: Not a valid ZIP/CBZ format");
      }

      return true;
    } catch (error) {
      throw new Error(`CBZ validation failed: ${error.message}`);
    }
  };

  const extractImagesFromCBZ = async (cbzUri, extractDir) => {
    try {
      const zip = new JSZip();
      let zipData = "";

      const fileInfo = await FileSystem.getInfoAsync(cbzUri);
      const chunkSize = 512 * 1024; // 512KB chunks
      let offset = 0;
      let progress = 0;

      while (offset < fileInfo.size) {
        const length = Math.min(chunkSize, fileInfo.size - offset);
        const chunk = await FileSystem.readAsStringAsync(cbzUri, {
          encoding: FileSystem.EncodingType.Base64,
          position: offset,
          length: length,
        });
        zipData += chunk;
        offset += length;

        progress = Math.floor((offset / fileInfo.size) * 50);
        setLoadingProgress(50 + progress);
      }

      setLoadingStage("Extracting images...");

      await zip.loadAsync(zipData, { base64: true });

      const imageFiles = [];
      const validExtensions = /\.(jpg|jpeg|png|webp|gif)$/i;

      const sortedFiles = Object.entries(zip.files)
        .filter(
          ([filename]) =>
            !filename.startsWith("__MACOSX") &&
            !filename.startsWith(".") &&
            validExtensions.test(filename.toLowerCase())
        )
        .sort((a, b) => {
          const getNumber = (filename) => {
            const match = filename.match(/\d+/);
            return match ? parseInt(match[0]) : Infinity;
          };
          return getNumber(a[0]) - getNumber(b[0]);
        });

      if (sortedFiles.length === 0) {
        throw new Error("No valid images found in CBZ file");
      }

      for (let i = 0; i < sortedFiles.length; i++) {
        const [filename, file] = sortedFiles[i];
        if (!file.dir) {
          const data = await file.async("uint8array");
          const base64Data = Buffer.from(data).toString("base64");
          const newFilename = `${extractDir}${String(i).padStart(
            3,
            "0"
          )}_${filename.split("/").pop()}`;
          await FileSystem.writeAsStringAsync(newFilename, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          imageFiles.push(newFilename);

          setLoadingProgress(
            Math.min(90, 50 + Math.floor((i / sortedFiles.length) * 40))
          );
        }
      }

      return imageFiles.map((file) => ({ uri: `file://${file}` }));
    } catch (error) {
      throw new Error(`Image extraction failed: ${error.message}`);
    }
  };

  const loadChapter = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingStage("Initializing...");

      if (!chapterId) throw new Error("Chapter ID is required");

      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Authentication required");

      setLastToken(token);

      const cacheKey = getCacheKey(language);
      const extractDir = `${FileSystem.cacheDirectory}chapter_${chapterId}_${language}/`;

      // Check cache
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const {
          pages: cachedPages,
          timestamp,
          cachedLanguage,
        } = JSON.parse(cachedData);
        if (
          Date.now() - timestamp < CACHE_EXPIRY &&
          cachedLanguage === language
        ) {
          setPages(cachedPages);
          setLoading(false);
          return;
        }
        await clearLanguageChapterCache(language);
      }

      setLoadingStage("Fetching chapter...");
      setLoadingProgress(10);

      const chapterData = await ApiService.getChapterContent(
        chapterId,
        token,
        language
      );
      if (!chapterData?.signedUrl) {
        throw new Error("Failed to get chapter URL");
      }

      setLoadingStage("Downloading...");
      setLoadingProgress(20);

      await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
      const downloadedFile = await FileSystem.downloadAsync(
        chapterData.signedUrl,
        `${extractDir}chapter.cbz`
      );

      setLoadingStage("Validating CBZ...");
      setLoadingProgress(40);

      await validateCBZFile(downloadedFile.uri);

      setLoadingStage("Processing images...");
      setLoadingProgress(50);

      const extractedPages = await extractImagesFromCBZ(
        downloadedFile.uri,
        extractDir
      );

      // Cache the results
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          pages: extractedPages,
          timestamp: Date.now(),
          cachedLanguage: language,
        })
      );

      setPages(extractedPages);
      setLoadingProgress(100);
    } catch (error) {
      console.error("Chapter loading error:", error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePagePress = () => {
    setControlsVisible(!controlsVisible);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleScroll = (event) => {
    if (scale === 1) {
      const offsetY = event.nativeEvent.contentOffset.y;
      const pageHeight = dimensions.width * 1.4;
      const currentPage = Math.floor(offsetY / pageHeight);
      setCurrentPageIndex(currentPage);
    }
    setIsScrolling(true);
  };

  const onPinchGestureEvent = ({ nativeEvent }) => {
    const newScale = lastScale * nativeEvent.scale;
    setScale(Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE));
  };

  const onPinchHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state === State.END) {
      setLastScale(scale);
    }
  };

  const handleNextChapter = () => {
    if (nextChapterId) {
      if (nextChapterPurchased) {
        navigation.replace("ChapterScreen", { chapterId: nextChapterId });
      } else {
        Alert.alert("Chapter Locked", "Purchase required to continue reading", [
          {
            text: "Purchase",
            onPress: () =>
              navigation.navigate("PurchaseModal", {
                chapterId: nextChapterId,
              }),
          },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    }
  };

  const handlePreviousChapter = () => {
    if (previousChapterId) {
      navigation.replace("ChapterScreen", { chapterId: previousChapterId });
    }
  };

  // Security overlay component
  const SecurityOverlay = () => (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "black", opacity: 0.95 },
      ]}
      pointerEvents="none"
    />
  );

  if (loading || isRetrying) {
    return (
      <AnimatedDownloadModal progress={loadingProgress} stage={loadingStage} />
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar hidden />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryOperation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Modal visible={true} animationType="fade" statusBarTranslucent>
        <StatusBar hidden />
        <SafeAreaView style={styles.container}>
          <PinchGestureHandler
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchHandlerStateChange}
          >
            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              scrollEnabled={scale === 1}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={handlePagePress}
                style={styles.contentContainer}
              >
                {pages.map((page, index) => (
                  <Image
                    key={index}
                    source={{ uri: page.uri }}
                    style={[
                      styles.image,
                      {
                        width: dimensions.width,
                        height: dimensions.width * 1.4,
                        transform: [{ scale }],
                      },
                    ]}
                    resizeMode="contain"
                    fadeDuration={0}
                    onError={() => {
                      console.error(`Failed to load image at index ${index}`);
                      setError("Failed to load page images");
                    }}
                  />
                ))}
              </TouchableOpacity>
            </ScrollView>
          </PinchGestureHandler>

          {controlsVisible && (
            <>
              <View style={styles.topControls}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.pageIndicator}>
                  <Text style={styles.pageIndicatorText}>
                    {`${currentPageIndex + 1} / ${pages.length}`}
                  </Text>
                </View>
              </View>

              <View style={styles.bottomControls}>
                {previousChapterId && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.leftNav]}
                    onPress={handlePreviousChapter}
                  >
                    <Text style={styles.navButtonText}>← Previous</Text>
                  </TouchableOpacity>
                )}

                {nextChapterId && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.rightNav]}
                    onPress={handleNextChapter}
                  >
                    <Text style={styles.navButtonText}>
                      {nextChapterPurchased ? "Next →" : "Purchase →"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
      <SecurityOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    alignItems: "center",
  },
  image: {
    marginVertical: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#EF7F1A",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  topControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 44 : 24,
    right: 20,
    zIndex: 10,
  },
  bottomControls: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 34 : 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 10,
  },
  closeButton: {
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 20,
  },
  navButton: {
    backgroundColor: "#EF7F1A",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: "center",
  },
  leftNav: {
    marginRight: 10,
  },
  rightNav: {
    marginLeft: 10,
  },
  navButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  pageIndicator: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginTop: 10,
  },
  pageIndicatorText: {
    color: "#fff",
    fontSize: 12,
  },
});

export default ChapterReader;
