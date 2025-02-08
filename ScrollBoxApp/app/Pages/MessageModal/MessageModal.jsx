import React from "react";
import { View, Text, TouchableOpacity, Modal, Dimensions } from "react-native";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  WifiOff,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";

const { width, height } = Dimensions.get("window");

const MessageModal = ({ visible, message, type, onClose }) => {
  const { t } = useTranslation();

  const modalStyles = {
    success: {
      backgroundColor: "#2B1409",
      iconColor: "#2ECC71",
      icon: <CheckCircle2 size={80} color="#2ECC71" />,
    },
    error: {
      backgroundColor: "#2B1409",
      iconColor: "#E74C3C",
      icon: <XCircle size={80} color="#E74C3C" />,
    },
    warning: {
      backgroundColor: "#2B1409",
      iconColor: "#F39C12",
      icon: <AlertTriangle size={80} color="#F39C12" />,
    },
    offline: {
      backgroundColor: "#2B1409",
      iconColor: "#95A5A6",
      icon: <WifiOff size={80} color="#95A5A6" />,
    },
  };

  const { backgroundColor, icon, iconColor } =
    modalStyles[type] || modalStyles.error;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.topBorder, { backgroundColor: iconColor }]} />
          <View style={styles.content}>
            <View style={styles.iconContainer}>{icon}</View>
            <Text style={styles.messageText}>{message}</Text>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: iconColor }]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>
                {t("message_modal.dismiss")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = {
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: width * 0.9,
    height: height * 0.4,
    borderRadius: 20,
    overflow: "hidden",
  },
  topBorder: {
    height: 10,
    width: "100%",
  },
  content: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  iconContainer: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "white",
    borderRadius: 50,
    padding: 10,
  },
  messageText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    marginBottom: 30,
    marginTop: 80,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
};

export default MessageModal;
