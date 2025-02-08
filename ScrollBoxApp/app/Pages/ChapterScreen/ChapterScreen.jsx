import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ImageBackground,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";
import styles from "./chapterstyle";
import CommentSection from "../Comment/Comment";
import ApiService from "../../Services/ApiService";
import ChapterReader from "../ChapterReader/ChapterReader";
import MessageModal from "../MessageModal/MessageModal";
import i18n from "../locales/i18n";
const { height } = Dimensions.get("window");
import { useTranslation } from "react-i18next";

const DEFAULT_IMAGES = {
  thumbnail: require("./../../../assets/scrollboxImg/06.png"),
  liked: require("../../../assets/scrollboxImg/like.png"),
  viewed: require("../../../assets/scrollboxImg/view.png"),
  large: require("./../../../assets/scrollboxImg/Img02.png"),
  basket: require("./../../../assets/scrollboxImg/15.png"),
  dropdown: require("./../../../assets/scrollboxImg/08.png"),
  logo: require("./../../../assets/scrollboxImg/14.png"),
  settings: require("./../../../assets/scrollboxImg/09.png"),
  background: require("./../../../assets/scrollboxImg/02.png"),
  comments: require("./../../../assets/scrollboxImg/11.png"),
  likes: require("./../../../assets/scrollboxImg/13.png"),
  views: require("./../../../assets/scrollboxImg/12.png"),
  inCart: require("./../../../assets/scrollboxImg/10.png"),
  purchased: require("./../../../assets/scrollboxImg/15.png"),
  inCart: require("./../../../assets/scrollboxImg/10.png"),
  purchased: require("./../../../assets/scrollboxImg/15.png"),
};
const ChapterScreen = () => {
  const [selectedChapterForReading, setSelectedChapterForReading] =
    useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [chapterCommentCounts, setChapterCommentCounts] = useState({});
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const navigation = useNavigation();
  const [viewedChapters, setViewedChapters] = useState(new Set());
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [selectedTome, setSelectedTome] = useState("Tome 1");
  const [visibleCommentForChapter, setVisibleCommentForChapter] =
    useState(null);
  const [chapters, setChapters] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageSource, setSelectedImageSource] = useState(null);
  const [basket, setBasket] = useState([]);
  const [expandedText, setExpandedText] = useState({});
  const [purchasedChapters, setPurchasedChapters] = useState([]);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoadedLanguage, setLastLoadedLanguage] = useState({});
  const [likedChapters, setLikedChapters] = useState(new Set());
  const [tomes, setTomes] = useState([]); // <--- Add this line
  const [loadingTomes, setLoadingTomes] = useState(false); // Optional for loading state
  const [errorTomes, setErrorTomes] = useState(null);
  const [userId, setUserId] = useState(null);
  const [comics, setComics] = useState([]);
  const [user, setuser] = useState([]);
  const [selectedComic, setSelectedComic] = useState(null);
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [messageModalMessage, setMessageModalMessage] = useState("");
  const [messageModalType, setMessageModalType] = useState("info");
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userId = await ApiService.getCurrentUserAndStoreId();
        setUserId(userId); // Store user ID in state
      } catch (error) {
        console.error("Error fetching user ID:", error.message);
      }
    };

    fetchUserId();
  }, []);
  useEffect(() => {
    const fetchComics = async () => {
      try {
        const response = await fetch(
          "https://q1x8l0qpnb.execute-api.eu-west-3.amazonaws.com/production/api/comics"
        );
        const data = await response.json();
        setComics(data); // Store fetched comics

        // Log the fetched comics
        console.log(
          "(NOBRIDGE) LOG  Fetched Comics:",
          data.map((comic) => ({ id: comic._id, title: comic.title }))
        );

        // Auto-select the first comic and fetch tomes
        if (data.length > 0) {
          const selectedComicId = data[0]._id;
          setSelectedComic(selectedComicId);
          console.log("(NOBRIDGE) LOG  Selected Comic ID:", selectedComicId);

          // Fetch tome ID using selected comic ID
          fetchTomeId(selectedComicId);
        }
      } catch (error) {
        console.error("Error fetching comics:", error);
      }
    };

    const fetchTomeId = async (comicId) => {
      try {
        const response = await fetch(
          `https://q1x8l0qpnb.execute-api.eu-west-3.amazonaws.com/production/api/tome/${comicId}`
        );
        const tomeData = await response.json();

        if (tomeData.length > 0) {
          console.log("(NOBRIDGE) LOG  Fetched Tome ID:", tomeData[0]._id);
        } else {
          console.log("(NOBRIDGE) LOG  No Tome Found for Comic ID:", comicId);
        }
      } catch (error) {
        console.error("Error fetching tome ID:", error);
      }
    };

    fetchComics();
  }, []);
  const showMessage = (message, type = "info") => {
    setMessageModalMessage(message);
    setMessageModalType(type);
    setIsMessageModalVisible(true);
  };

  // Function to close MessageModal
  const closeMessageModal = () => {
    setIsMessageModalVisible(false);
  };
  useEffect(() => {
    if (user) {
      console.log("User Context:", user);
      console.log("User ID:", user?.userID || "No user ID available");
    } else {
      console.warn("User context is null or undefined.");
    }
  }, [user]);

  useEffect(() => {
    const fetchComics = async () => {
      try {
        const comics = await ApiService.getComics(selectedLanguage);
        setComics(comics);
        if (comics.length > 0) {
          setSelectedComic(comics[0]._id); // Automatically select the first comic
        }
      } catch (error) {
        console.error("Error fetching comics:", error.message);
      }
    };

    fetchComics();
  }, [selectedLanguage]);

  useEffect(() => {
    const fetchUserId = async () => {
      const storedUserId = await AsyncStorage.getItem("userId");
      setUserId(storedUserId);
    };

    fetchUserId();
  }, []);
  useEffect(() => {
    console.log("User ID:", userId);
    console.log(
      "Chapters with access:",
      chapters.filter(
        (ch) =>
          Array.isArray(ch.usersWithAccess) &&
          ch.usersWithAccess.includes(userId)
      )
    );
  }, [userId, chapters]);

  useEffect(() => {
    const updateChaptersForLanguage = async () => {
      try {
        // Clear previously cached chapters
        const cacheKey = `chapters_${selectedTome}_${selectedLanguage}`;
        await AsyncStorage.removeItem(cacheKey);

        // Fetch chapters in the new language
        const fetchedChapters = await ApiService.getChaptersByLanguage(
          selectedTome,
          selectedLanguage
        );

        // Save to state
        setChapters(fetchedChapters);
      } catch (error) {
        console.error("Error updating chapters for language:", error);
      }
    };

    if (selectedLanguage) {
      updateChaptersForLanguage();
    }
  }, [selectedLanguage]);

  // Create a function to safely get image source
  const getImageSource = (backendUrl, defaultImage) => {
    if (backendUrl && backendUrl.trim() !== "") {
      try {
        return { uri: backendUrl };
      } catch (error) {
        console.warn("Invalid backend image URL", backendUrl);
        return defaultImage;
      }
    }
    return defaultImage;
  };
  const navigateBack = () => {
    navigation.goBack();
  };
  const navigateToHomeScreen = () => {
    navigation.navigate("Home", {
      screen: "HomeScreen",
      params: { fromChapterScreen: true },
    });
  };
  const handleBackPress = () => {
    setExpandedIndex(null);
  };
  useEffect(() => {
    fetchTomes();
  }, []);
  useEffect(() => {
    loadBasket(); // Load the basket from the server
  }, []);
  useEffect(() => {
    if (selectedTome) {
      fetchChaptersByTome(selectedTome);
    }
  }, [selectedTome]);
  useEffect(() => {
    const updateChaptersForLanguage = async () => {
      try {
        const cacheKey = `chapters_${selectedTome}_${selectedLanguage}`;
        await AsyncStorage.removeItem(cacheKey); // Clear cached chapters
        fetchChapters(); // Fetch chapters in the newly selected language
      } catch (error) {
        console.error("Error updating chapters for language:", error);
      }
    };
    updateChaptersForLanguage();
  }, [selectedLanguage]);

  // test de prince
  useEffect(() => {
    if (chapters.length > 0) {
      chapters.forEach((chapter) => {
        console.log(
          `Chapter ${chapter.title}: isFree=${chapter.isFree}, isPurchased=${chapter.isPurchased}`
        );
      });
    }
  }, [chapters]);

  // fin de test de prince
  const handleCommentCountChange = (chapterId, newCount) => {
    setChapters((prevChapters) =>
      prevChapters.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, commentNumber: newCount }
          : chapter
      )
    );
  };
  const updateChapterCommentCount = (chapterId, newCount) => {
    setChapters((prevChapters) =>
      prevChapters.map((chapter) => {
        if (chapter.id === chapterId) {
          return {
            ...chapter,
            commentNumber: newCount,
          };
        }
        return chapter;
      })
    );
    setChapterCommentCounts((prev) => ({
      ...prev,
      [chapterId]: newCount,
    }));
  };
  const fetchTomes = async () => {
    if (!selectedComic) {
      console.warn("(NOBRIDGE) LOG  No selected comic, skipping tome fetch.");
      return;
    }

    try {
      setLoadingTomes(true);
      setErrorTomes("");

      const response = await ApiService.getTomes(selectedComic); // Fetch tomes based on the selected comic
      const tomesData = response || []; // Ensure it's an array

      console.log("(NOBRIDGE) LOG  Fetched Tomes:", tomesData);

      setTomes(tomesData);

      if (tomesData.length > 0) {
        const firstTome = tomesData[0];
        setSelectedTome(firstTome._id); // Select the first Tome
        console.log("(NOBRIDGE) LOG  Selected Tome ID:", firstTome._id);

        fetchChaptersByTome(firstTome._id); // Fetch Chapters for selected Tome
      } else {
        setSelectedTome(null);
        console.log("(NOBRIDGE) LOG  No Tomes Found.");
      }
    } catch (error) {
      console.error("Error fetching tomes:", error.message);
      setErrorTomes("Failed to load tomes. Please try again.");
    } finally {
      setLoadingTomes(false);
    }
  };

  // Call fetchTomes when `selectedComic` changes
  useEffect(() => {
    fetchTomes();
  }, [selectedComic]); // Triggers re-fetch when comic changes

  useEffect(() => {
    loadBasket();
  }, []);

  const fetchChaptersByTome = async (selectedTome) => {
    if (!selectedTome) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `https://q1x8l0qpnb.execute-api.eu-west-3.amazonaws.com/production/api/chapters/${selectedTome}`
      );

      const chapters = response.data || [];
      setChapters(chapters);

      if (chapters.length > 0) {
        setSelectedChapter(chapters[0]);
      } else {
        setError("No chapters found for the selected tome.");
      }
    } catch (error) {
      console.error("Error fetching chapters:", error.message);
      setError("Failed to load chapters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (language) => {
    try {
      setSelectedLanguage(language);
      await i18n.changeLanguage(language); // Update language for translations
    } catch (error) {
      console.error("Error changing language:", error);
    }
  };

  useEffect(() => {
    fetchChapters();
    loadBasket();
  }, [selectedTome]);
  useEffect(() => {
    const calculateTotalAmount = () => {
      const amount = basket.reduce(
        (sum, chapter) => sum + (chapter.price || 0),
        0
      );
      setTotalAmount(amount);
    };

    calculateTotalAmount();
  }, [basket]);
  const FloatingBasketButton = () => (
    <TouchableOpacity
      style={styles.floatingBasketButton}
      onPress={() => {
        if (cartItemsCount === 0) {
          navigation.navigate("UserProfile", { screen: "LoginPage" });
        } else {
          setIsPurchaseModalVisible(true);
        }
      }}
    >
      <View style={styles.basketButtonContent}>
        <Text style={styles.basketButtonText}>Buy</Text>
      </View>
      {cartItemsCount > 0 && (
        <View style={styles.basketNumberContainer}>
          <Text style={styles.basketNumber}>{cartItemsCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const loadBasket = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("No authentication token");
      }

      const cart = await ApiService.getCart(token);

      // Filter chapters not already accessible
      const filteredChapters = cart.chapters.filter((chapter) => {
        return !chapter.usersWithAccess?.includes(user?.userID);
      });

      // Use backend's totalPrice directly
      setBasket(filteredChapters || []);
      setCartItemsCount(filteredChapters.length || 0);
      setTotalAmount(cart.totalPrice || 0);
    } catch (error) {
      console.error("Cart loading error:", error.message);

      if (error.message.includes("Session expired")) {
        await AsyncStorage.removeItem("userToken");
        showMessage(t("cart.session_expired"), "error");
        navigation.navigate("Login");
      }
    }
  };
  const handleWebViewNavigationStateChange = async (newNavState) => {
    const { url } = newNavState;

    // Check for payment completion
    if (url.includes("/success")) {
      try {
        const token = await AsyncStorage.getItem("token");

        // Verify and fetch the latest transactions
        const transactions = await ApiService.getTransactions(token);

        // Find the most recent transaction
        const latestTransaction = transactions[0];

        if (latestTransaction) {
          // Update purchased chapters
          const purchasedChapterIds = transactions.flatMap(
            (txn) => txn.chapterIds
          );

          setPurchasedChapters((prevPurchased) => [
            ...prevPurchased,
            ...purchasedChapterIds,
          ]);

          // Clear the basket
          setBasket([]);
          await AsyncStorage.removeItem("basket");

          // Close WebView
          setPaymentLink(null);

          // Show success message
          showMessage(t("cart.purchase_success"), "success");
          setPaymentStatus("success");
        }
      } catch (error) {
        console.error("Error after successful payment:", error);
        showMessage(t("cart.verification_error"), "error");
      }
    } else if (url.includes("/cancel")) {
      // Payment cancelled
      setPaymentLink(null);
      setIsPurchaseModalVisible(true);
      showMessage(t("cart.payment_cancelled"), "error");
    }
  };
  const saveBasket = async (newBasket) => {
    try {
      await AsyncStorage.setItem("basket", JSON.stringify(newBasket));
    } catch (error) {
      console.error("Error saving basket:", error);
    }
  };
  const navigateToPurchase = () => {
    navigation.navigate("PurchaseModal", { basket });
  };
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const likedChaptersData = await AsyncStorage.getItem("likedChapters");
        const viewedChaptersData = await AsyncStorage.getItem("viewedChapters");

        setLikedChapters(new Set(JSON.parse(likedChaptersData) || []));
        setViewedChapters(new Set(JSON.parse(viewedChaptersData) || []));
      } catch (error) {
        console.error("Error loading persisted state:", error.message);
      }
    };

    loadPersistedState();
  }, []);

  const handleLike = async (chapterId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation.navigate("UserProfile", { screen: "LoginPage" });
        return;
      }

      const response = await fetch(
        `https://q1x8l0qpnb.execute-api.eu-west-3.amazonaws.com/production/api/chapter/like/${chapterId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok)
        throw new Error("Failed to toggle like on the chapter.");

      const resData = await response.json();
      const { hasLiked } = resData;

      // Update state
      setLikedChapters((prevLiked) => {
        const updatedLiked = new Set(prevLiked);
        if (hasLiked) {
          updatedLiked.add(chapterId);
        } else {
          updatedLiked.delete(chapterId);
        }

        // Persist state
        AsyncStorage.setItem(
          "likedChapters",
          JSON.stringify([...updatedLiked])
        );
        return updatedLiked;
      });

      // Update chapters
      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId
            ? { ...chapter, likes: resData.likes, hasLiked }
            : chapter
        )
      );
    } catch (error) {
      console.error("Error toggling like:", error.message);
      showMessage(t("cart.toggle_like_error"), "error");
    }
  };

  const handleViewChapter = async (chapterId) => {
    if (viewedChapters.has(chapterId)) return;

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation.navigate("UserProfile", { screen: "LoginPage" });
        return;
      }

      const response = await fetch(
        `https://q1x8l0qpnb.execute-api.eu-west-3.amazonaws.com/production/api/chapter/view/${chapterId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to mark chapter as viewed.");

      setViewedChapters((prevViewed) => {
        const updatedViewed = new Set(prevViewed);
        updatedViewed.add(chapterId);

        // Persist state
        AsyncStorage.setItem(
          "viewedChapters",
          JSON.stringify([...updatedViewed])
        );
        return updatedViewed;
      });

      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId
            ? { ...chapter, views: chapter.views + 1 }
            : chapter
        )
      );

      setSelectedChapterForReading(chapterId);
    } catch (error) {
      console.error("Error marking chapter as viewed:", error.message);
      showMessage(t("cart.mark_view_error"), "error");
    }
  };

  const removeFromBasket = async (chapterId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("User is not logged in");

      // Remove from backend cart
      const result = await ApiService.clearCartById(chapterId, token);

      // Update the basket state
      const updatedBasket = basket.filter(
        (chapter) => chapter.id !== chapterId
      );
      setBasket(updatedBasket);
      setCartItemsCount(updatedBasket.length);

      // Recalculate total amount
      const newTotalAmount = updatedBasket.reduce(
        (sum, chapter) => sum + (chapter.price?.value || chapter.price || 0),
        0
      );
      setTotalAmount(newTotalAmount);

      // Update the chapter state to reflect removal
      setChapters((prevChapters) =>
        prevChapters.map((ch) =>
          ch.id === chapterId ? { ...ch, isInBasket: false } : ch
        )
      );
    } catch (error) {
      console.error("Error removing from cart:", error.message);
      showMessage(
        t("cart.remove_error", {
          message: error.message || t("cart.remove_default_error"),
        }),
        "error"
      );
    }
  };

  const PurchaseModal = () => {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      const calculateAndUpdateTotal = () => {
        const newTotalAmount = basket.reduce(
          (sum, chapter) => sum + (chapter.price?.value || chapter.price || 0),
          0
        );
        setTotalAmount(newTotalAmount);
        setCartItemsCount(basket.length);
      };

      calculateAndUpdateTotal();
    }, [basket]);

    const renderBasketItem = ({ item }) => (
      <View style={styles.purchaseModalBasketItem}>
        <Image
          source={item.image || DEFAULT_IMAGES.thumbnail}
          style={styles.purchaseModalItemImage}
        />
        <View style={styles.purchaseModalItemDetails}>
          <Text style={styles.purchaseModalItemTitle} numberOfLines={1}>
            {item.title?.[selectedLanguage] || item.title}
          </Text>
          <View style={styles.purchaseModalPriceContainer}>
            <Text style={styles.purchaseModalItemPrice}>
              {item.price?.value || item.price} {item.price?.currency || "XAF"}
            </Text>
            <TouchableOpacity
              onPress={() => removeFromBasket(item.id)}
              style={styles.purchaseModalRemoveButton}
            >
              <Text style={styles.purchaseModalRemoveButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

    return (
      <Modal
        transparent={true}
        visible={isPurchaseModalVisible}
        animationType="slide"
      >
        <View style={styles.purchaseModalOverlay}>
          <View style={styles.purchaseModalContainer}>
            <TouchableOpacity
              style={styles.purchaseModalCloseButton}
              onPress={() => setIsPurchaseModalVisible(false)}
            >
              <Text style={styles.purchaseModalCloseButtonText}>×</Text>
            </TouchableOpacity>

            <Text style={styles.purchaseModalTitle}>Your Cart</Text>

            <FlatList
              data={basket}
              renderItem={renderBasketItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.purchaseModalEmptyBasketText}>
                  Your basket is empty
                </Text>
              }
              style={styles.purchaseModalBasketList}
            />

            <View style={styles.paymentMethodContainer}>
              <Text style={styles.paymentMethodTitle}>Payment Method</Text>

              <View style={styles.paymentMethodImageContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodImageOption,
                    selectedPaymentMethod === "paypal" &&
                      styles.selectedPaymentMethodImageOption,
                  ]}
                  onPress={() => setSelectedPaymentMethod("paypal")}
                >
                  <Image
                    source={require("../../../assets/scrollboxImg/PAYPAL.png")}
                    style={styles.paymentMethodImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodImageOption,
                    selectedPaymentMethod === "mtnmoney" &&
                      styles.selectedPaymentMethodImageOption,
                  ]}
                  onPress={() => setSelectedPaymentMethod("mtnmoney")}
                >
                  <Image
                    source={require("../../../assets/scrollboxImg/MTNMONEY.png")}
                    style={styles.paymentMethodImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodImageOption,
                    selectedPaymentMethod === "orangemoney" &&
                      styles.selectedPaymentMethodImageOption,
                  ]}
                  onPress={() => setSelectedPaymentMethod("orangemoney")}
                >
                  <Image
                    source={require("../../../assets/scrollboxImg/ORANGEMONEY.png")}
                    style={styles.paymentMethodImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.purchaseModalSummaryContainer}>
              <View style={styles.purchaseModalTotalRow}>
                <Text style={styles.purchaseModalTotalText}>Total</Text>
                <Text style={styles.purchaseModalGrandTotalAmount}>
                  {totalAmount} {basket[0]?.currency || "XAF"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.purchaseModalBuyButton,
                (!selectedPaymentMethod || isLoading) &&
                  styles.purchaseModalDisabledButton,
              ]}
              onPress={async () => {
                if (!selectedPaymentMethod) {
                  showMessage(t("cart.payment_method_required"), "error");
                  return;
                }

                setIsLoading(true);

                try {
                  const token = await AsyncStorage.getItem("userToken");
                  if (!token) {
                    showMessage(t("cart.login_required_proceed"), "error");
                    setIsLoading(false);
                    return;
                  }

                  const transactionData = {
                    chapterIds: basket.map((item) => item.id),
                    amount: totalAmount,
                    currency: basket[0]?.currency || "XAF",
                    paymentMethod: selectedPaymentMethod,
                  };

                  let apiResponse;

                  if (selectedPaymentMethod === "paypal") {
                    apiResponse = await ApiService.createPayPalTransaction(
                      transactionData,
                      token
                    );
                  } else if (
                    selectedPaymentMethod === "mtnmoney" ||
                    selectedPaymentMethod === "orangemoney"
                  ) {
                    apiResponse = await ApiService.createTransaction(
                      transactionData,
                      token
                    );
                  }

                  if (apiResponse?.success) {
                    const paymentUrl =
                      apiResponse.paymentUrl || apiResponse.link;
                    if (paymentUrl) {
                      setPaymentLink(paymentUrl);
                      setIsPurchaseModalVisible(false);
                    } else {
                      throw new Error("No payment link received.");
                    }
                  } else {
                    throw new Error(
                      apiResponse?.message || "Transaction failed."
                    );
                  }
                } catch (error) {
                  console.error("Payment Error:", error.message);
                  showMessage(
                    t("cart.payment_error", {
                      message: error.message || t("cart.payment_default_error"),
                    }),
                    "error"
                  );
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={!selectedPaymentMethod || isLoading}
            >
              <Text style={styles.purchaseModalBuyButtonText}>
                {isLoading ? "Processing..." : "Proceed to Checkout"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const openBasketModal = () => {
    setBasketModalVisible(true);
  };

  const closeBasketModal = () => {
    setBasketModalVisible(false);
  };
  // Process chapters to update liked and viewed states
  const processChapterStates = (fetchedChapters, userId) => {
    const liked = new Set();
    const viewed = new Set();

    fetchedChapters.forEach((chapter) => {
      if (chapter.likedBy?.includes(userId)) liked.add(chapter.id);
      if (chapter.viewedBy?.includes(userId)) viewed.add(chapter.id);
    });

    setLikedChapters(liked);
    setViewedChapters(viewed);
  };

  const fetchChapters = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("userToken");
      const language = i18n.language || "en";

      if (!selectedComic) {
        console.warn("No selected comic. Skipping chapter fetch.");
        return;
      }

      // Fetch Tome ID dynamically using selectedComic
      const tomeResponse = await ApiService.getTomesByComicId(
        selectedComic,
        language
      );

      if (!tomeResponse || tomeResponse.length === 0) {
        throw new Error("No tomes found for the selected comic.");
      }

      const tomeId = tomeResponse[0]._id; // Use the first Tome ID dynamically
      console.log("(NOBRIDGE) LOG  Fetched Tome ID:", tomeId);

      // Fetch chapters using the fetched Tome ID
      const chaptersData = await ApiService.getChaptersByLanguage(
        tomeId,
        language,
        token
      );

      const userId = await AsyncStorage.getItem("userId"); // Fetch userId from storage

      // Map chapters with required properties
      const mappedChapters = chaptersData.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        description: chapter.synopsis,
        image: getImageSource(chapter.iconUrl, DEFAULT_IMAGES.thumbnail),
        largeImage: getImageSource(chapter.preview, DEFAULT_IMAGES.large),
        price: chapter.price,
        currency: chapter.currency,
        likes: chapter.likes || 0,
        views: chapter.views || 0,
        commentNumber: chapter.commentNumber || 0,
        isAvailable: true,
        isFree: chapter.isFree,
        isInCart: chapter.isInCart || false,
        isPurchased:
          chapter.isFree || chapter.usersWithAccess?.includes(userId),
        hasLiked: chapter.likedBy?.includes(userId), // ✅ Check if user liked the chapter
        hasViewed: chapter.viewedBy?.includes(userId), // ✅ Check if user viewed the chapter
      }));

      setChapters(mappedChapters);
    } catch (error) {
      console.error("Error fetching chapters:", error.message);
      setError(error.message || "Failed to load chapters");
    } finally {
      setLoading(false);
    }
  };
  // Automatically refetch chapters when Tome or Language changes
  useEffect(() => {
    if (selectedTome && selectedComic) {
      fetchChapters();
    }
  }, [selectedTome, selectedComic, selectedLanguage]);

  const toggleContentVisibility = (index) => {
    const chapter = chapters[index];
    if (!chapter.isAvailable) {
      showMessage(t("cart.chapter_not_available"), "warning");
      return;
    }

    setExpandedIndex(expandedIndex === index ? null : index);
  };

  
  const toggleTextExpansion = (chapterId) => {
    const chapter = chapters.find((ch) => ch.id === chapterId);
    if (chapter && chapter.description.length > 100) {
      setExpandedText((prev) => ({
        ...prev,
        [chapterId]: !prev[chapterId],
      }));
    }
  };
  const handleAddToCart = async (chapterId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation.navigate("UserProfile", { screen: "LoginPage" });
        return false;
      }

      // Check if chapter is already in basket
      const isAlreadyInBasket = basket.some((item) => item.id === chapterId);
      if (isAlreadyInBasket) {
        // If already in basket, remove it instead
        await removeFromBasket(chapterId);
        return false;
      }

      // Optimistically update UI
      setChapters((prevChapters) =>
        prevChapters.map((ch) =>
          ch.id === chapterId ? { ...ch, isInBasket: true } : ch
        )
      );

      const result = await ApiService.addToCart(chapterId, token);

      if (result.success) {
        const newChapter = chapters.find((ch) => ch.id === chapterId);

        // Update basket
        const updatedBasket = [...basket, newChapter];
        setBasket(updatedBasket);

        // Update cart count and total amount
        setCartItemsCount(updatedBasket.length);
        const newTotalAmount = updatedBasket.reduce(
          (sum, chapter) => sum + (chapter.price?.value || chapter.price || 0),
          0
        );
        setTotalAmount(newTotalAmount);

        return true;
      } else {
        // Revert UI changes
        setChapters((prevChapters) =>
          prevChapters.map((ch) =>
            ch.id === chapterId ? { ...ch, isInBasket: false } : ch
          )
        );
        showMessage(t("cart.add_to_basket_error"), "error");
        return false;
      }
    } catch (error) {
      // Revert UI changes
      setChapters((prevChapters) =>
        prevChapters.map((ch) =>
          ch.id === chapterId ? { ...ch, isInBasket: false } : ch
        )
      );
      console.error("Error adding to cart:", error.message);
      showMessage(t("cart.add_to_basket_failed"), "error");
      return false;
    }
  };

  const renderChapterCard = (chapter, index) => {
    const isFirstChapter = index === 0;
    const isPurchased = chapter.isFree || chapter.isPurchased;
    const isInBasket =
      chapters.find((ch) => ch.id === chapter.id)?.isInBasket ||
      basket.some((item) => item.id === chapter.id);
    const userId = user?.userID; // Get the current user's ID
    const hasLiked = likedChapters.has(chapter.id); // Check if the chapter is liked
    const hasViewed = viewedChapters.has(chapter.id); // Check if the chapter is viewed
    const chapterImage = isPurchased
      ? DEFAULT_IMAGES.purchased
      : isInBasket
      ? DEFAULT_IMAGES.inCart
      : DEFAULT_IMAGES.logo;

    const getSafeImageSource = (imageUri, defaultImage) => {
      return imageUri && typeof imageUri === "object" && imageUri.uri
        ? imageUri
        : defaultImage;
    };

    const handleLikeClick = async () => {
      await handleLike(chapter.id); // Toggle like for this chapter
    };

    const handleViewClick = async () => {
      await handleViewChapter(chapter.id); // Mark chapter as viewed
    };

   const handleReadOrBuyClick = async () => {
     if (isPurchased || isFirstChapter) {
       // Check for token before allowing read
       const token = await AsyncStorage.getItem("userToken");
       if (!token) {
         navigation.navigate("UserProfile", { screen: "LoginPage" });
         return;
       }
       setSelectedChapterForReading(chapter.id);
     } else {
       const addedToCart = await handleAddToCart(chapter.id);
       if (addedToCart) {
         setIsPurchaseModalVisible(true);
       }
     }
   };

    const handleAddToBasket = async () => {
      if (!isPurchased && !isFirstChapter) {
        await handleAddToCart(chapter.id);
      }
    };

    return (
      <SafeAreaView key={chapter.id} style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => toggleContentVisibility(index)}
        >
          {expandedIndex === index ? (
            // Expanded View
            <View>
              <Image
                source={getSafeImageSource(
                  chapter.largeImage,
                  DEFAULT_IMAGES.large
                )}
                style={styles.topImage}
                defaultSource={DEFAULT_IMAGES.large}
                onError={() => {
                  console.warn(
                    `Large image load error for chapter ${chapter.id}`
                  );
                }}
              />
              <View style={styles.cardContent}>
                <Image
                  source={getSafeImageSource(
                    chapter.image,
                    DEFAULT_IMAGES.thumbnail
                  )}
                  style={styles.cardImage}
                  defaultSource={DEFAULT_IMAGES.thumbnail}
                  onError={() => {
                    console.warn(
                      `Thumbnail image load error for chapter ${chapter.id}`
                    );
                  }}
                />
                <View style={styles.textContainerRight}>
                  <Text style={styles.synopsisTitle}>{chapter.title}</Text>
                  <TouchableOpacity
                    onPress={() => toggleTextExpansion(chapter.id)}
                  >
                    <Text
                      style={[
                        styles.descriptionText,
                        !expandedText[chapter.id] && { maxHeight: 60 },
                      ]}
                      numberOfLines={expandedText[chapter.id] ? undefined : 3}
                    >
                      {chapter.description}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.statsContainer}>
                    {/* Hide price if chapter is free or purchased */}
                    {!isPurchased && !isFirstChapter && (
                      <Text style={styles.priceText}>
                        {chapter.price} {chapter.currency}
                      </Text>
                    )}
                  </View>
                  <View style={styles.iconsAndReadButtonContainer}>
                    <View style={styles.iconsRowOverlayContainer}>
                      <TouchableOpacity
                        onPress={() => setVisibleCommentForChapter(chapter.id)}
                        style={styles.iconContainer}
                      >
                        <Image
                          source={DEFAULT_IMAGES.comments}
                          style={styles.iconImage}
                        />
                        <Text style={styles.iconText}>
                          {chapter.commentNumber}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleLikeClick}
                        style={styles.iconContainer}
                      >
                        <Image
                          source={
                            chapter.hasLiked
                              ? DEFAULT_IMAGES.liked
                              : DEFAULT_IMAGES.likes
                          }
                          style={styles.iconImage}
                        />
                        <Text style={styles.iconText}>{chapter.likes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleViewClick}
                        style={styles.iconContainer}
                      >
                        <Image
                          source={
                            chapter.hasViewed
                              ? DEFAULT_IMAGES.viewed
                              : DEFAULT_IMAGES.views
                          }
                          style={styles.iconImage}
                        />
                        <Text style={styles.iconText}>{chapter.views}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.readButton,
                        isPurchased || isFirstChapter
                          ? styles.freeChapterButton
                          : styles.paidChapterButton,
                      ]}
                      onPress={handleReadOrBuyClick}
                    >
                      <Text style={styles.readButtonText}>
                        {isPurchased || isFirstChapter ? "Read" : "Buy"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // Collapsed View
            <View style={styles.cardContent}>
              <Image
                source={getSafeImageSource(
                  chapter.image,
                  DEFAULT_IMAGES.thumbnail
                )}
                style={styles.cardImage}
                defaultSource={DEFAULT_IMAGES.thumbnail}
                onError={() => {
                  console.warn(
                    `Collapsed image load error for chapter ${chapter.id}`
                  );
                }}
              />
              <View style={styles.iconsRow}>
                <TouchableOpacity
                  onPress={() => setVisibleCommentForChapter(chapter.id)}
                  style={styles.iconContainer}
                >
                  <Image
                    source={DEFAULT_IMAGES.comments}
                    style={styles.iconImage}
                  />
                  <Text style={styles.iconText}>{chapter.commentNumber}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLikeClick}
                  style={styles.iconContainer}
                >
                  <Image
                    source={
                      chapter.hasLiked
                        ? DEFAULT_IMAGES.liked
                        : DEFAULT_IMAGES.likes
                    }
                    style={styles.iconImage}
                  />
                  <Text style={styles.iconText}>{chapter.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleViewClick}
                  style={styles.iconContainer}
                >
                  <Image
                    source={
                      chapter.hasViewed
                        ? DEFAULT_IMAGES.viewed
                        : DEFAULT_IMAGES.views
                    }
                    style={styles.iconImage}
                  />
                  <Text style={styles.iconText}>{chapter.views}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.priceBasketContainer}>
                {/* Hide price if chapter is free or purchased */}
                {!isPurchased && !isFirstChapter && (
                  <Text style={styles.priceText}>
                    {chapter.price} {chapter.currency}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => {
                    if (isPurchased) {
                      toggleContentVisibility(index);
                    } else {
                      handleAddToBasket(chapter);
                    }
                  }}
                >
                  <Image source={chapterImage} style={styles.addToBasketIcon} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBarContainer}>
        <View style={styles.navBar}>
          <View style={styles.leftSection}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                if (tomes.length > 1) {
                  setDropdownVisible(!isDropdownVisible);
                }
              }}
            >
              <View style={styles.row}>
                <Image
                  source={DEFAULT_IMAGES.dropdown}
                  style={styles.downdrop}
                />
                <Text style={styles.navButtonText}>
                  {tomes.length > 0
                    ? `Tome ${
                        tomes.findIndex((tome) => tome._id === selectedTome) + 1
                      }`
                    : "Tome 1"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.navButton} onPress={navigateBack}>
            <Image
              source={DEFAULT_IMAGES.settings}
              style={styles.settingsIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown List for Tomes */}
      {isDropdownVisible && tomes.length > 1 && (
        <View style={styles.dropdownContainer}>
          <FlatList
            data={tomes}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedTome === item._id && styles.selectedDropdownItem,
                ]}
                onPress={() => {
                  setSelectedTome(item._id); // Set the selected Tome ID
                  fetchChaptersByTome(item._id); // Fetch chapters using the actual Tome ID
                  setDropdownVisible(false); // Hide dropdown after selection
                }}
              >
                <Text style={styles.dropdownItemText}>Tome {index + 1}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <ImageBackground
        source={DEFAULT_IMAGES.background}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error === "TIMEOUT"
                ? "Network error. Please check your internet connection."
                : "Unable to load chapters. Please try again later."}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchChapters}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.cardList}>
            {chapters.map((chapter, index) =>
              renderChapterCard(chapter, index)
            )}
          </ScrollView>
        )}
      </ImageBackground>

      {visibleCommentForChapter && (
        <CommentSection
          chapterId={visibleCommentForChapter}
          closeComments={() => setVisibleCommentForChapter(null)}
          onCommentCountChange={(newCount) =>
            handleCommentCountChange(visibleCommentForChapter, newCount)
          }
        />
      )}

      {/* Purchase Modal */}
      <PurchaseModal />
      {/* WebView for payment */}
      {paymentLink && (
        <Modal
          visible={!!paymentLink}
          animationType="slide"
          onRequestClose={() => setPaymentLink(null)}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={() => setPaymentLink(null)}
              style={{
                padding: 15,
                alignItems: "flex-end",
                backgroundColor: "#f0f0f0",
              }}
            >
              <Text style={{ color: "red", fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
            <WebView
              source={{ uri: paymentLink }}
              style={{ flex: 1 }}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
            />
          </SafeAreaView>
        </Modal>
      )}
      {!visibleCommentForChapter && <FloatingBasketButton />}
      {selectedChapterForReading && (
        <ChapterReader
          chapterId={selectedChapterForReading}
          onClose={() => setSelectedChapterForReading(null)}
          nextChapterId={"nextChapterIdHere"}
          previousChapterId={"previousChapterIdHere"}
          nextChapterPurchased={purchasedChapters.includes("nextChapterIdHere")}
        />
      )}
      <MessageModal
        visible={isMessageModalVisible}
        message={messageModalMessage}
        type={messageModalType}
        onClose={closeMessageModal}
      />
    </SafeAreaView>
  );
};
export default ChapterScreen;
