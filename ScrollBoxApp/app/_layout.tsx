import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Platform,
  UIManager,
  LogBox,
  Alert,
  BackHandler,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useNavigationContainerRef } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import NetworkErrorModal from "./Pages/NetworkErrorModal/NetworkErrorModal";

// Import screens
import HomeScreen from "./index";
import SecondHomePage from "./Pages/SecondPage/SecondHomePage";
import ChapterReader from "./Pages/ChapterReader/ChapterReader";
import ChapterScreen from "./Pages/ChapterScreen/ChapterScreen";
import UserProfileNavigator from "../app/(tabs)/UserProfileNavigator";

// Enable layout animations on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Suppress specific logs
LogBox.ignoreLogs([
  "Require cycle:",
  "[react-native-gesture-handler]",
  "ViewPropTypes will be removed",
  "ColorPropType will be removed",
]);

// Prevent auto-hiding the splash screen
SplashScreen.preventAutoHideAsync();

// Navigation stack
const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      gestureDirection: "horizontal",
      animation: "slide_from_right",
      animationEnabled: true,
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="SecondHomePage" component={SecondHomePage} />
    <Stack.Screen name="ChapterReader" component={ChapterReader} />
    <Stack.Screen name="ChapterScreen" component={ChapterScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileNavigator} />
  </Stack.Navigator>
);

function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const prepareApp = async () => {
      try {
        // Perform any preloading tasks
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn("Initialization error:", e);
        Alert.alert(
          "Error",
          "An error occurred during initialization. Restarting the app.",
          [{ text: "Close", onPress: () => BackHandler.exitApp() }]
        );
      } finally {
        setAppIsReady(true);
      }
    };

    prepareApp();
  }, []);

  // Network connectivity check
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle deep links manually
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event.url || (await Linking.getInitialURL());

      if (url) {
        const { path, queryParams } = Linking.parse(url);
        if (path === "reset-password" && queryParams?.resetToken) {
          navigationRef.current?.navigate("ForgotPasswordPage", {
            resetToken: queryParams.resetToken,
          });
        }
      }
    };

    // Listen for deep links when app is running
    Linking.addEventListener("url", handleDeepLink);

    return () => {
      Linking.removeEventListener("url", handleDeepLink);
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn("Error hiding splash screen:", e);
      }
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  // Show network error modal if not connected
  if (!isConnected) {
    return (
      <NetworkErrorModal
        visible={!isConnected}
        onRetry={() => NetInfo.fetch()}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
        <AppNavigator />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default RootLayout;
