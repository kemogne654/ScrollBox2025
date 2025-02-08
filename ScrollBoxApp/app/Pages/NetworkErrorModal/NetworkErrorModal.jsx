import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { WifiOff, RefreshCw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

const NetworkErrorModal = ({
  visible,
  errorMessage = "Unable to connect to the server",
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const handleRetry = async () => {
    try {
      const netInfoState = await NetInfo.fetch();

      if (netInfoState.isConnected) {
        navigation.navigate("Home");
      } else {
        Alert.alert(
          t("network_error.retry_failed_title", "Connection Failed"),
          t(
            "network_error.retry_failed_message",
            "Please check your internet connection and try again."
          )
        );
      }
    } catch (error) {
      console.error("Retry check failed:", error);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleRetry}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.7)" />
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <WifiOff size={80} color="#007AFF" strokeWidth={1.5} />
          </View>

          <Text style={styles.titleText}>
            {t("network_error.title", "Connection Issue")}
          </Text>

          <Text style={styles.messageText}>
            {errorMessage ||
              t(
                "network_error.default_message",
                "Unable to establish a network connection. Please check your settings and try again."
              )}
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <RefreshCw size={20} color="white" style={styles.retryIcon} />
            <Text style={styles.retryButtonText}>
              {t("network_error.retry", "Reconnect")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    backgroundColor: "rgba(0,122,255,0.1)",
    borderRadius: 100,
    width: 150,
    height: 150,
    marginBottom: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.2)",
  },
  titleText: {
    color: "#007AFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  messageText: {
    color: "#333333",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  retryIcon: {
    marginRight: 10,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

export default NetworkErrorModal;
