import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
} from "react-native";
import { Video } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import ApiService from "../../Services/ApiService";

const { width, height } = Dimensions.get("window");

export default function SignUpPage() {
  const navigation = useNavigation();
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleSignUp = async () => {
    if (!isTermsAccepted) {
      Alert.alert("Terms & Conditions", "Please accept the terms to proceed.");
      return;
    }

    if (!name || !email || !password || !phoneNumber) {
      Alert.alert("Missing Information", "All fields are required.");
      return;
    }

    if (password.length <= 7) {
      Alert.alert(
        "Invalid Password",
        "Password must be more than 7 characters."
      );
      return;
    }

    try {
      const user = { name, email, password, phoneNumber };
      const response = await ApiService.createUser(user);
      Alert.alert("Success", "Your account has been created!");
      navigation.navigate("ScrollableHomeNavigator"); // Updated navigation
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to create an account. Please try again.");
    }
  };

  const handleLoginNavigation = () => {
    navigation.navigate("loginPage");
  };

  const handleCloseModal = () => {
    navigation.navigate("ScrollableHomeNavigator"); // Updated navigation
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={handleCloseModal}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.modalContainer}
        onPress={dismissKeyboard}
      >
        <Video
          source={require("../../../assets/videos/HomeAnim.mp4")}
          rate={1.0}
          volume={1.0}
          isMuted={true}
          resizeMode="cover"
          shouldPlay
          isLooping
          style={styles.backgroundVideo}
        />
        <View style={styles.backgroundOverlay} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.avoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? -64 : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollViewContent,
              keyboardVisible && styles.scrollViewContentWithKeyboard,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.modalContent,
                keyboardVisible && styles.modalContentWithKeyboard,
              ]}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
              >
                <AntDesign name="close" size={24} color="white" />
              </TouchableOpacity>

              <View style={styles.userInfoContainer}>
                <Image
                  source={require("../../../assets/scrollboxImg/07.png")}
                  style={styles.userIcon}
                />
                <Text style={styles.userName}>Sign Up</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#fff"
                value={name}
                onChangeText={setName}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#fff"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#fff"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#fff"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />

              <View style={styles.termsContainer}>
                <TouchableOpacity
                  onPress={() => setIsTermsAccepted(!isTermsAccepted)}
                  style={styles.checkbox}
                >
                  {isTermsAccepted && (
                    <AntDesign name="check" size={16} color="#FFA500" />
                  )}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  By continuing, you accept the Terms and Conditions.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.signUpButton,
                  !isTermsAccepted && styles.disabledButton,
                ]}
                disabled={!isTermsAccepted}
                onPress={handleSignUp}
              >
                <Text style={styles.signUpButtonText}>Sign Up</Text>
              </TouchableOpacity>

              <Text style={styles.haveAccountText}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={handleLoginNavigation}>
                <Text style={styles.loginText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  avoidingView: {
    flex: 1,
    width: "100%",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  scrollViewContentWithKeyboard: {
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "ios" ? 40 : 20,
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "#222",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  modalContentWithKeyboard: {
    paddingVertical: 10,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  userInfoContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  userIcon: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  userName: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
    color: "#fff",
    marginBottom: 20,
    padding: 10,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  termsText: {
    color: "#fff",
    fontSize: 12,
  },
  signUpButton: {
    backgroundColor: "#FFA500",
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 50,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#A9A9A9",
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  haveAccountText: {
    color: "#fff",
    marginBottom: 10,
  },
  loginText: {
    color: "#FFA500",
    fontSize: 18,
    textDecorationLine: "underline",
    textAlign: "center",
    marginBottom: 30,
  },
});
