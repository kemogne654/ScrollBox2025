import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "../../Services/ApiService";
import { GoogleAuthWebView } from "./GoogleAuthWebView";

const { width, height } = Dimensions.get("window");

export default function AuthModal() {
  const navigation = useNavigation();
  const [isLoginView, setIsLoginView] = useState(true);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  // Refs for input fields
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // State for Login and Sign Up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleCloseModal = () => {
    navigation.goBack();
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    resetForm();
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setIsTermsAccepted(false);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!email || !password) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      const response = await ApiService.userLogin({ email, password });
      const { token } = response;

      if (token) {
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("email", email);
        navigation.navigate("Home");
      } else {
        throw new Error("Token missing in API response");
      }
    } catch (error) {
      console.error("Login Error:", error);
      Alert.alert(
        "Login Error",
        error.message || "Failed to log in. Please check your credentials."
      );
    }
  };

  const handleSignUp = async () => {
    Keyboard.dismiss();

    if (!isTermsAccepted) {
      Alert.alert("Terms & Conditions", "Please accept the terms to proceed.");
      return;
    }

    if (!name || !email || !password) {
      Alert.alert("Missing Information", "All fields are required.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
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
      const user = { name, email, password };
      const response = await ApiService.createUser(user);

      if (
        response?.message === "User created successfully!" ||
        response?.status === 201
      ) {
        Alert.alert("Success", "Account created successfully. Please log in.");
        toggleView();
      } else {
        throw new Error(response.message || "Signup failed.");
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      Alert.alert(
        "Signup Error",
        error.message || "Failed to create account. Please try again."
      );
    }
  };

  const handleGoogleSignIn = () => {
    setShowGoogleAuth(true);
  };

  const handleGoogleAuthSuccess = async () => {
    setShowGoogleAuth(false);
    navigation.navigate("Home");
  };

  const renderLoginView = () => (
    <>
      <TextInput
        ref={emailInputRef}
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#fff"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => passwordInputRef.current.focus()}
      />
      <TextInput
        ref={passwordInputRef}
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#fff"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />
      <TouchableOpacity style={styles.actionButton} onPress={handleLogin}>
        <Text style={styles.actionButtonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={toggleView}>
        <Text style={styles.toggleViewText}>Sign Up</Text>
      </TouchableOpacity>
    </>
  );

  const renderSignUpView = () => (
    <>
      <TextInput
        ref={nameInputRef}
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="#fff"
        value={name}
        onChangeText={setName}
        returnKeyType="next"
        onSubmitEditing={() => emailInputRef.current.focus()}
      />
      <TextInput
        ref={emailInputRef}
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#fff"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => passwordInputRef.current.focus()}
      />
      <TextInput
        ref={passwordInputRef}
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#fff"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        returnKeyType="done"
        onSubmitEditing={handleSignUp}
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
      <TouchableOpacity style={styles.actionButton} onPress={handleSignUp}>
        <Text style={styles.actionButtonText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={toggleView}>
        <Text style={styles.toggleViewText}>Log In</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
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
            style={styles.keyboardAvoidingView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
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
                  <Text style={styles.userName}>
                    {isLoginView ? "Log In" : "Sign Up"}
                  </Text>
                </View>

                {isLoginView ? renderLoginView() : renderSignUpView()}

                <View style={styles.socialButtonsContainer}>
                  <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleSignIn}
                  >
                    <FontAwesome name="google" size={20} color="#DB4437" />
                    <Text style={styles.googleButtonText}>
                      {isLoginView
                        ? "Sign in with Google"
                        : "Sign up with Google"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <GoogleAuthWebView
        visible={showGoogleAuth}
        onClose={() => setShowGoogleAuth(false)}
        onSuccess={handleGoogleAuthSuccess}
      />
    </>
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
  keyboardAvoidingView: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "#222",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    position: "relative",
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
    flex: 1,
  },
  actionButton: {
    backgroundColor: "#FFA500",
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 50,
    marginBottom: 20,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  toggleViewText: {
    color: "#FFA500",
    fontSize: 18,
    textDecorationLine: "underline",
    textAlign: "center",
    marginBottom: 30,
  },
  socialButtonsContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 50,
    marginBottom: 20,
    width: "80%",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleButtonText: {
    color: "#757575",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
