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
  ActivityIndicator,
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
  usePreventScreenCapture();

  const navigation = useNavigation();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState("");
  const [lastUserId, setLastUserId] = useState(null);
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
  const [failedImages, setFailedImages] = useState(new Set());
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [hasScreenCapturePermission, setHasScreenCapturePermission] =
    useState(false);

  useEffect(() => {
    if (pages.length > 0) {
      console.log(
        "Pages URIs:",
        pages.map((page) => page.uri)
      );
    }
  }, [pages]);

  useEffect(() => {
    const setupScreenCaptureProtection = async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        setHasScreenCapturePermission(status === "granted");

        if (status === "granted") {
          const subscription = MediaLibrary.addListener(async (event) => {
            if (event.type === "capture") {
              Alert.alert(
                "Screen Capture Detected",
                "Screen captures are not allowed for security reasons.",
                [{ text: "OK" }]
              );
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
  const validateCache = async (cacheKey, extractDir) => {
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (!cachedData) return false;

      const { pages, timestamp, cachedLanguage } = JSON.parse(cachedData);

      // Check if cache is expired or language mismatch
      if (
        Date.now() - timestamp >= CACHE_EXPIRY ||
        cachedLanguage !== language
      ) {
        return false;
      }

      // Verify all cached files exist
      for (const page of pages) {
        const filePath = page.uri.replace("file://", "");
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) {
          console.log(`Cache validation failed: Missing file ${filePath}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Cache validation error:", error);
      return false;
    }
  };
  useEffect(() => {
    const checkAuthAndLanguage = async () => {
      try {
        const currentToken = await AsyncStorage.getItem("token");
        if (!currentToken) {
          navigation.navigate("Login");
          return;
        }

        if (lastToken !== currentToken) {
          setLastToken(currentToken);
          await clearAllChapterCaches();
        }

        if (lastLanguage !== language) {
          setLastLanguage(language);
          await clearLanguageChapterCache(lastLanguage);
          await loadChapter();
        }
      } catch (error) {
        console.error("Auth/Language check error:", error);
        handleError(error);
      }
    };

    // Call the function that you just defined:
    checkAuthAndLanguage();
  }, [language, lastLanguage, lastToken]);

  useEffect(() => {
    let mounted = true;

    const setupReader = async () => {
      try {
        setLoading(true);
        setError(null);

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
  const handleImageError = (index, uri) => {
    console.error(`Failed to load image at index ${index}:`, uri);
    setFailedImages((prev) => new Set([...prev, index]));
    setImageLoadingStates((prev) => ({
      ...prev,
      [index]: "failed",
    }));
  };

  // Add new function for handling successful image loads
  const handleImageLoad = (index) => {
    setImageLoadingStates((prev) => ({
      ...prev,
      [index]: "loaded",
    }));
    console.log(`Successfully loaded image at index ${index}`);
  };
  const getUserSpecificPath = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) throw new Error("User ID not found");
    return `${FileSystem.documentDirectory}users/${userId}/`;
  };
  const verifyChapterAccess = async (chapterId, language) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const cbzPath = await getCBZPath(chapterId, language);
      const cacheKey = `chapter_access_${chapterId}_${language}_${userId}`;

      const accessData = await AsyncStorage.getItem(cacheKey);
      if (!accessData) return false;

      const { savedUserId, savedLanguage } = JSON.parse(accessData);
      return savedUserId === userId && savedLanguage === language;
    } catch (error) {
      console.error("Chapter access verification failed:", error);
      return false;
    }
  };
  const saveChapterAccess = async (chapterId, language) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const cacheKey = `chapter_access_${chapterId}_${language}_${userId}`;

      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          savedUserId: userId,
          savedLanguage: language,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Failed to save chapter access:", error);
    }
  };

  const getCBZPath = async (chapterId, language) => {
    const userPath = await getUserSpecificPath();
    return `${userPath}cbz_files/${chapterId}_${language}.cbz`;
  };

  const getExtractPath = async (chapterId, language) => {
    const userPath = await getUserSpecificPath();
    return `${userPath}extracted/${chapterId}_${language}/`;
  };

  const ensureUserDirectories = async () => {
    try {
      const userPath = await getUserSpecificPath();
      const cbzDir = `${userPath}cbz_files/`;
      const extractedDir = `${userPath}extracted/`;

      await FileSystem.makeDirectoryAsync(cbzDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(extractedDir, {
        intermediates: true,
      });
    } catch (error) {
      console.error("Error creating user directories:", error);
      throw error;
    }
  };

  const checkCBZExists = async (chapterId, language) => {
    try {
      const cbzPath = await getCBZPath(chapterId, language);
      const fileInfo = await FileSystem.getInfoAsync(cbzPath);
      return fileInfo.exists;
    } catch (error) {
      console.error("CBZ check error:", error);
      return false;
    }
  };
  // Add new ImagePlaceholder component
  const ImagePlaceholder = ({ index }) => (
    <View
      style={[
        styles.imagePlaceholder,
        {
          width: dimensions.width,
          height: dimensions.width * 1.4,
        },
      ]}
    >
      <Text style={styles.placeholderText}>
        Image {index + 1} failed to load
      </Text>
      <TouchableOpacity
        style={styles.retryImageButton}
        onPress={() => {
          setFailedImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
          });
          setImageLoadingStates((prev) => ({
            ...prev,
            [index]: "loading",
          }));
        }}
      >
        <Text style={styles.retryImageButtonText}>Retry Loading</Text>
      </TouchableOpacity>
    </View>
  );
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

  const getCacheKey = (chapterId, lang) => `chapter_${chapterId}_${lang}`;
  const isCacheValid = async (chapterId, language) => {
    try {
      const cacheKey = getCacheKey(chapterId, language);
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        console.log("No cache found");
        return false;
      }

      const { timestamp, userId: cachedUserId } = JSON.parse(cachedData);
      const currentUserId = await AsyncStorage.getItem("userId");

      // Check if cache is expired or user changed
      if (
        Date.now() - timestamp >= CACHE_EXPIRY ||
        cachedUserId !== currentUserId
      ) {
        console.log("Cache expired or user changed");
        return false;
      }

      // Verify files exist
      const cbzPath = await getCBZPath(chapterId, language);
      const extractDir = await getExtractPath(chapterId, language);

      const cbzInfo = await FileSystem.getInfoAsync(cbzPath);
      const extractDirInfo = await FileSystem.getInfoAsync(extractDir);

      if (!cbzInfo.exists || !extractDirInfo.exists) {
        console.log("Cache files missing");
        return false;
      }

      console.log("Cache is valid");
      return true;
    } catch (error) {
      console.error("Cache validation error:", error);
      return false;
    }
  };

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
        throw new Error(
          "Invalid CBZ file: File is too small or does not exist."
        );
      }
      const headerData = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        position: 0,
        length: 4,
      });
      const headerBuffer = Buffer.from(headerData, "base64");
      const zipSignature = headerBuffer.toString("hex");
      if (!["504b0304", "504b0506", "504b0708"].includes(zipSignature)) {
        throw new Error("Invalid CBZ file: Not a valid ZIP format");
      }

      console.log("CBZ file is valid.");
      return true;
    } catch (error) {
      console.error("CBZ validation failed:", error);
      throw new Error(`CBZ validation failed: ${error.message}`);
    }
  };

  const extractImagesFromCBZ = async (cbzUri, extractDir) => {
    try {
      console.log("Starting CBZ extraction...");

      const zipData = await FileSystem.readAsStringAsync(cbzUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setLoadingProgress(50);

      const zip = new JSZip();
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

      console.log(
        `Found ${sortedFiles.length} valid images. Saving to disk...`
      );

      // Process each image independently using Promise.allSettled
      const extractionResults = await Promise.allSettled(
        sortedFiles.map(async ([filename, file], index) => {
          if (!file.dir) {
            try {
              const data = await file.async("uint8array");
              const base64Data = Buffer.from(data).toString("base64");
              const newFilename = `${extractDir}${String(index).padStart(
                3,
                "0"
              )}_${filename.split("/").pop()}`;

              await FileSystem.writeAsStringAsync(newFilename, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });

              console.log(`Saved image: ${newFilename}`);
              setLoadingProgress(
                Math.min(90, 50 + Math.floor((index / sortedFiles.length) * 40))
              );

              return { success: true, uri: `file://${newFilename}`, index };
            } catch (error) {
              console.error(`Failed to extract image ${index}:`, error);
              return { success: false, index, error: error.message };
            }
          }
        })
      );

      // Process results and maintain original array structure
      const pages = new Array(sortedFiles.length);
      const failedImages = new Set();

      extractionResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.success) {
          pages[result.value.index] = { uri: result.value.uri };
        } else if (result.status === "fulfilled") {
          pages[result.value.index] = { uri: "" };
          failedImages.add(result.value.index);
        }
      });

      // Set up automatic retry for failed images
      failedImages.forEach((index) => {
        const retryImage = async () => {
          try {
            const [filename, file] = sortedFiles[index];
            const data = await file.async("uint8array");
            const base64Data = Buffer.from(data).toString("base64");
            const newFilename = `${extractDir}${String(index).padStart(
              3,
              "0"
            )}_${filename.split("/").pop()}`;

            await FileSystem.writeAsStringAsync(newFilename, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            pages[index] = { uri: `file://${newFilename}` };
            failedImages.delete(index);

            // Update the pages state
            setPages([...pages]);
            setFailedImages(new Set(failedImages));

            console.log(`Successfully retried image ${index}`);
          } catch (error) {
            console.error(`Retry failed for image ${index}:`, error);
            setTimeout(retryImage, 5000); // Retry again after 5 seconds
          }
        };

        // Start the retry process
        setTimeout(retryImage, 5000);
      });

      console.log("Image extraction completed successfully.");
      return pages;
    } catch (error) {
      console.error("Image extraction failed:", error);
      throw new Error(`Image extraction failed: ${error.message}`);
    }
  };

  const fetchWithRetry = async (callback, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await callback();
      } catch (error) {
        if (error.response?.status === 401) {
          throw new Error("Unauthorized: Please log in again.");
        }
        console.warn(`Retrying... (${i + 1}/${retries})`, error.message);
        if (i === retries - 1) throw error;
      }
    }
  };

  const ensureDirectoryExists = async (dirPath) => {
    try {
      console.log(`Checking directory: ${dirPath}`);
      const dirInfo = await FileSystem.getInfoAsync(dirPath);

      if (!dirInfo.exists) {
        console.log(`Directory doesn't exist, creating: ${dirPath}`);
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

        const verifyInfo = await FileSystem.getInfoAsync(dirPath);
        if (!verifyInfo.exists) {
          throw new Error(`Failed to create directory: ${dirPath}`);
        }
        console.log(`Successfully created directory: ${dirPath}`);
      } else {
        console.log(`Directory already exists: ${dirPath}`);
      }

      const testFile = `${dirPath}/test.txt`;
      await FileSystem.writeAsStringAsync(testFile, "test");
      await FileSystem.deleteAsync(testFile, { idempotent: true });
      console.log(`Directory is writable: ${dirPath}`);
    } catch (error) {
      console.error(`Directory setup error: ${error.message}`);
      throw new Error(`Failed to setup directory: ${error.message}`);
    }
  };
  const checkExtractedImagesInAsyncStorage = async (chapterId, language) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      const cacheKey = `extracted_images_${chapterId}_${language}_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        console.log("No extracted images metadata found in AsyncStorage");
        return false;
      }

      const {
        pages,
        timestamp,
        userId: cachedUserId,
        language: cachedLanguage,
      } = JSON.parse(cachedData);

      // Check if the cached data matches the current user and language
      if (cachedUserId !== userId || cachedLanguage !== language) {
        console.log("User ID or language mismatch, invalidating cache");
        return false;
      }

      // Check if the cache is expired (e.g., 24 hours)
      if (Date.now() - timestamp >= CACHE_EXPIRY) {
        console.log("Cache expired, invalidating extracted images metadata");
        return false;
      }

      // Verify that the files still exist in the file system
      const filesExist = await Promise.all(
        pages.map(async (uri) => {
          const filePath = uri.replace("file://", "");
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          return fileInfo.exists;
        })
      );

      if (!filesExist.every(Boolean)) {
        console.log("Some extracted images are missing from the file system");
        return false;
      }

      console.log("Extracted images metadata is valid");
      return true;
    } catch (error) {
      console.error("Error checking extracted images metadata:", error);
      return false;
    }
  };
  const loadExtractedImagesFromAsyncStorage = async (chapterId, language) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      const cacheKey = `extracted_images_${chapterId}_${language}_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (!cachedData) {
        throw new Error("No extracted images metadata found");
      }

      const { pages } = JSON.parse(cachedData);
      return pages.map((uri) => ({ uri }));
    } catch (error) {
      console.error("Error loading extracted images from AsyncStorage:", error);
      return [];
    }
  };
  const loadChapter = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingStage("Initializing...");
      setFailedImages(new Set());
      setImageLoadingStates({});

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }
      setLastToken(token);

      await ensureUserDirectories();

      const cbzPath = await getCBZPath(chapterId, language);
      const extractDir = await getExtractPath(chapterId, language);

      // Check if extracted images metadata exists in AsyncStorage
      const extractedImagesValid = await checkExtractedImagesInAsyncStorage(
        chapterId,
        language
      );

      if (extractedImagesValid) {
        // Load existing images from AsyncStorage metadata
        setLoadingStage("Loading existing images...");
        setLoadingProgress(50);

        const extractedPages = await loadExtractedImagesFromAsyncStorage(
          chapterId,
          language
        );
        setPages(extractedPages);
        setLastLanguage(language);

        console.log("Loaded existing images from AsyncStorage:", {
          pageCount: extractedPages.length,
          language,
          chapterId,
        });

        setLoading(false);
        return;
      }

      // Proceed with download and extraction if metadata is invalid or missing
      setLoadingStage("Downloading chapter...");
      setLoadingProgress(20);

      const chapterData = await fetchWithRetry(async () => {
        const response = await ApiService.getChapterContent(
          chapterId,
          language,
          token
        );
        if (!response?.signedUrl) {
          throw new Error("Invalid chapter data received");
        }
        return response;
      }, 3);

      await fetchWithRetry(async () => {
        const result = await FileSystem.downloadAsync(
          chapterData.signedUrl,
          cbzPath,
          {
            sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
            cache: true,
          }
        );
        const fileInfo = await FileSystem.getInfoAsync(cbzPath);
        if (!fileInfo.exists || fileInfo.size === 0) {
          throw new Error("Download failed or file is empty");
        }
        return result;
      }, 3);

      // Validate and extract
      setLoadingStage("Validating chapter file...");
      setLoadingProgress(40);
      await validateCBZFile(cbzPath);

      // Clear and recreate extraction directory
      await FileSystem.deleteAsync(extractDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });

      setLoadingStage("Extracting images...");
      setLoadingProgress(50);
      const extractedPages = await extractImagesFromCBZ(cbzPath, extractDir);

      if (!extractedPages || extractedPages.length === 0) {
        throw new Error("No valid images found in chapter");
      }

      // Save extracted images metadata to AsyncStorage
      await saveExtractedImagesMetadata(chapterId, language, extractedPages);

      setLoadingStage("Finalizing...");
      setLoadingProgress(90);
      setPages(extractedPages);
      setLastLanguage(language);

      const verificationResults = await Promise.all(
        extractedPages.map(async (page) => {
          const filePath = page.uri.replace("file://", "");
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          return fileInfo.exists;
        })
      );

      if (!verificationResults.every(Boolean)) {
        throw new Error("Some extracted files failed validation");
      }

      setLoadingStage("Finalizing...");
      setLoadingProgress(90);
      setPages(extractedPages);
      setLastLanguage(language);

      console.log("Chapter load completed successfully:", {
        pageCount: extractedPages.length,
        language,
        chapterId,
      });
    } catch (error) {
      console.error("Chapter load failed:", error);
      handleError(new Error(`Failed to load chapter: ${error.message}`));

      // Cleanup on error
      try {
        const extractDir = await getExtractPath(chapterId, language);
        await FileSystem.deleteAsync(extractDir, { idempotent: true });
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    } finally {
      setLoading(false);
      setLoadingStage("");
      setLoadingProgress(0);
    }
  };

  // Helper function to check if extracted images exist
  const checkExtractedImagesExist = async (extractDir) => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(extractDir);
      if (!dirInfo.exists) return false;

      const files = await FileSystem.readDirectoryAsync(extractDir);
      return files.length > 0;
    } catch (error) {
      console.error("Error checking extracted images:", error);
      return false;
    }
  };

  // Helper function to get existing extracted images
  const getExistingExtractedImages = async (extractDir) => {
    try {
      const files = await FileSystem.readDirectoryAsync(extractDir);
      const sortedFiles = files.sort((a, b) => a.localeCompare(b));
      return sortedFiles.map((file) => ({
        uri: `file://${extractDir}${file}`,
      }));
    } catch (error) {
      console.error("Error getting existing images:", error);
      return [];
    }
  };

  const saveExtractedImagesMetadata = async (chapterId, language, pages) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      const cacheKey = `extracted_images_${chapterId}_${language}_${userId}`;
      const metadata = {
        pages: pages.map((page) => page.uri),
        timestamp: Date.now(),
        userId,
        language,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(metadata));
      console.log("Extracted images metadata saved to AsyncStorage");
    } catch (error) {
      console.error("Error saving extracted images metadata:", error);
    }
  };

  const clearUserCache = async () => {
    try {
      const userPath = await getUserSpecificPath();
      await FileSystem.deleteAsync(userPath, { idempotent: true });
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter((key) => key.startsWith("pages_"));
      await AsyncStorage.multiRemove(userKeys);
    } catch (error) {
      console.error("Error clearing user cache:", error);
    }
  };

  const handleLogout = async () => {
    await clearUserCache();
    // ... rest of logout logic
  };

  // Update language change effect

  useEffect(() => {
    const checkAuthAndLanguage = async () => {
      try {
        const currentToken = await AsyncStorage.getItem("token");
        if (!currentToken) {
          navigation.navigate("Login");
          return;
        }

        if (lastToken !== currentToken) {
          setLastToken(currentToken);
          await clearAllChapterCaches();
        }

        if (lastLanguage !== language) {
          setLastLanguage(language);
          await clearLanguageChapterCache(lastLanguage);
          await loadChapter();
        }
      } catch (error) {
        console.error("Auth/Language check error:", error);
        handleError(error);
      }
    };

    checkAuthAndLanguage();
  }, [language, lastLanguage, lastToken]);
  const handlePagePress = () => {
    setControlsVisible(!controlsVisible);
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("ChapterScreen");
    }
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
                  <View key={index} style={styles.pageContainer}>
                    {failedImages.has(index) ? (
                      <ImagePlaceholder index={index} />
                    ) : (
                      <Image
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
                        onError={() => handleImageError(index, page.uri)}
                        onLoad={() => handleImageLoad(index)}
                      />
                    )}
                    {imageLoadingStates[index] === "loading" && (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#EF7F1A" />
                      </View>
                    )}
                  </View>
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

              <View style={styles.bottomControls}></View>
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
  imagePlaceholder: {
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  retryImageButton: {
    backgroundColor: "#EF7F1A",
    padding: 10,
    borderRadius: 5,
  },
  retryImageButtonText: {
    color: "#ffffff",
    fontSize: 14,
  },
  pageContainer: {
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
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
