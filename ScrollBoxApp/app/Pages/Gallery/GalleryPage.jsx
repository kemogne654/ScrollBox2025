import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Loader from "../../../components/Loader";

const { width, height } = Dimensions.get("window");

const GalleryPage = () => {
  const [showFullText, setShowFullText] = useState({});
  const [galleryData, setGalleryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigation = useNavigation();

  // Fetch gallery data
  useEffect(() => {
    const fetchGalleryData = async () => {
      try {
        const response = await fetch(
          "https://q1x8l0qpnb.execute-api.eu-west-3.amazonaws.com/production/api/galleries"
        );
        const data = await response.json();
        setGalleryData(data);
      } catch (error) {
        console.error("Error fetching gallery data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryData();
  }, []);

  const handleMoreText = (id) => {
    setShowFullText((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return <Loader visible={loading} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navTextContainer}>
          <Text style={styles.navTextTop}>Kijins</Text>
          <Text style={styles.navTextBottom}>Gallery</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Home");
            }
          }}
        >
          <Image
            source={require("./../../../assets/scrollboxImg/09.png")}
            style={styles.closeIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.cardsContainer}>
            {galleryData.map((item, index) => (
              <View key={item._id} style={styles.card}>
                <View style={styles.imageContainer}>
                  <TouchableOpacity
                    onPress={() => setSelectedImage(item.mediaContentUrl)}
                  >
                    <Image
                      source={{ uri: item.mediaContentUrl }}
                      style={styles.cardImage}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.cardDescription}>
                  <ScrollView style={styles.overlayTextContainer}>
                    <Text style={styles.overlayText}>
                      {showFullText[item._id]
                        ? item.textContent
                        : item.textContent.length > 100
                        ? `${item.textContent.substring(0, 100)}...`
                        : item.textContent}
                    </Text>
                  </ScrollView>
                  {item.textContent.length > 100 && (
                    <TouchableOpacity onPress={() => handleMoreText(item._id)}>
                      <Text style={styles.moreText}>
                        {showFullText[item._id] ? "LESS" : "MORE"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.dateTextSmall}>
                    {formatDate(item.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "black",
    opacity: 0.9,
    paddingTop: "8%",
    paddingBottom: 10,
    zIndex: 3,
  },
  navTextContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
    marginLeft: 20,
    marginBottom: 18,
  },
  navTextTop: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF7F1A",
    marginBottom: -10,
  },
  navTextBottom: {
    fontSize: 30,
    color: "white",
    fontWeight: "bold",
  },
  closeIcon: {
    width: 30,
    height: 30,
    marginRight: 25,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    marginTop: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "transparent",
  },
  cardsContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  card: {
    width: "100%",
    marginBottom: 15,
    borderRadius: 15,
    borderColor: "gray",
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  imageContainer: {
    width: "100%",
    padding: 10,
  },
  cardImage: {
    width: "100%",
    height: 380,
    resizeMode: "cover",
    borderRadius: 10,
  },
  cardDescription: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 5,
    position: "relative",
    minHeight: 60,
  },
  overlayTextContainer: {
    maxHeight: 100,
  },
  overlayText: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
    padding: 5,
  },
  moreText: {
    color: "#EF7F1A",
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 10,
    fontSize: 16,
  },
  dateTextSmall: {
    color: "gray",
    fontSize: 9,
    position: "absolute",
    right: 10,
    bottom: 5,
  },
});

export default GalleryPage;
