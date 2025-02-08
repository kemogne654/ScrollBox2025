import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Dimensions,
  StyleSheet,
  Platform,
  UIManager,
  LogBox,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ChapterReader from "../Pages/ChapterReader/ChapterReader";
// Import screens
import HomeScreen from "./index";
import SecondHomePage from "../Pages/SecondPage/SecondHomePage";
import ChapterScreen from "../Pages/ChapterScreen/ChapterScreen";
import ActorPage from "../Pages/ActorPage/ActorPage";
import GalleryPage from "../Pages/Gallery/GalleryPage";
import CommentSection from "../Pages/Comment/Comment";
import PurchaseModal from "../Pages/PurchaseModal/PurchaseModal";
import DicoPage from "../Pages/Deco/Deco";
import Map from "../Pages/map/Map";
// Enable layout animations on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

LogBox.ignoreLogs([
  "Require cycle:",
  "[react-native-gesture-handler] Seems like you're using an old API with gesture components",
  "ViewPropTypes will be removed",
  "ColorPropType will be removed",
]);

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Define custom transition configuration
const customTransition = {
  animation: "spring",
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

// Main navigation configuration
const AppNavigator = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      gestureDirection: "horizontal",
      animation: "slide_from_right",
      animationEnabled: true,
      // Add custom transition options
      transitionSpec: {
        open: customTransition,
        close: customTransition,
      },
      cardStyleInterpolator: ({ current, layouts }) => {
        return {
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
              {
                scale: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            }),
          },
          overlayStyle: {
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
          },
        };
      },
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="SecondHomePage" component={SecondHomePage} />
    <Stack.Screen name="ChapterReader" component={ChapterReader} />
    <Stack.Screen name="loginPage" component={AuthModal} />
    <Stack.Screen name="ChapterScreen" component={ChapterScreen} />
    <Stack.Screen name="ActorPage" component={ActorPage} />
    <Stack.Screen name="GalleryPage" component={GalleryPage} />
    <Stack.Screen name="Comments" component={CommentSection} />
    <Stack.Screen name="PurchaseModal" component={PurchaseModal} />
    <Stack.Screen name="Deco" component={DicoPage} />
    <Stack.Screen name="Map" component={Map} />
  </Stack.Navigator>
);

function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (e) {
        console.warn("Initialization error:", e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
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

export default App;
