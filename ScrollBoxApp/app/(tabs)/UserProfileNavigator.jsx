import React, { useState, useEffect, useCallback } from "react";
import { BackHandler, Alert, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NetInfo from "@react-native-community/netinfo";
import { useFocusEffect } from "@react-navigation/native";

// Import screens
import LoginPage from "../Pages/LoginPage/LoginPage";
import SignUpPage from "../Pages/LoginPage/SignUpPage";
import ActorPage from "../Pages/ActorPage/ActorPage";
import GalleryPage from "../Pages/Gallery/GalleryPage";
import DicoPage from "../Pages/Deco/Deco";
import Map from "../Pages/map/Map";
import ForgotPasswordEmail from "../Pages/LoginPage/ForgotPasswordEmail";
import NetworkErrorModal from "../Pages/NetworkErrorModal/NetworkErrorModal";
import OTPVerificationPage from "../Pages/LoginPage/OTPVerificationPage";

const UserProfileStack = createNativeStackNavigator();

// Enhanced back button prevention with memory cleanup
const usePreventGoingBack = (navigation) => {
  useFocusEffect(
    useCallback(() => {
      let backHandler;

      const onBackPress = () => {
        if (navigation.canGoBack()) {
          Alert.alert(
            "Go Back",
            "Are you sure you want to go back?",
            [
              { text: "Cancel", style: "cancel", onPress: () => {} },
              {
                text: "Go Back",
                style: "destructive",
                onPress: () => {
                  try {
                    navigation.goBack();
                  } catch (error) {
                    // Fallback if navigation fails
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "LoginPage" }],
                    });
                  }
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          // At root screen
          Alert.alert(
            "Exit",
            "Are you sure you want to exit?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Exit", onPress: () => BackHandler.exitApp() },
            ],
            { cancelable: false }
          );
        }
        return true;
      };

      if (Platform.OS === "android") {
        backHandler = BackHandler.addEventListener(
          "hardwareBackPress",
          onBackPress
        );
      }

      return () => {
        if (backHandler) {
          backHandler.remove();
        }
      };
    }, [navigation])
  );
};

// Enhanced Screen wrapper with error boundary
const ScreenWrapper = ({ children, navigation }) => {
  usePreventGoingBack(navigation);

  // Add error boundary for production
  if (!__DEV__) {
    try {
      return children;
    } catch (error) {
      console.warn("Screen Error:", error);
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginPage" }],
      });
      return null;
    }
  }

  return children;
};

export const UserProfileNavigator = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Enhanced network monitoring
  useEffect(() => {
    let mounted = true;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (mounted) {
        setIsConnected(state.isConnected);
      }
    });

    // Initialize network state
    NetInfo.fetch().then((state) => {
      if (mounted) {
        setIsConnected(state.isConnected);
        setIsNavigationReady(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (!isNavigationReady) {
    return null;
  }

  if (!isConnected) {
    return (
      <NetworkErrorModal
        visible={!isConnected}
        onRetry={async () => {
          try {
            const netInfo = await NetInfo.fetch();
            setIsConnected(netInfo.isConnected);
          } catch (error) {
            console.warn("Network check failed:", error);
          }
        }}
      />
    );
  }

  return (
    <UserProfileStack.Navigator
      initialRouteName="LoginPage"
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: Platform.OS === "android" ? "none" : "slide_from_right",
        animationEnabled: Platform.OS === "ios",
        freezeOnBlur: true, // Optimize memory usage
        screenListeners: {
          beforeRemove: (e) => {
            e.preventDefault();
            Alert.alert(
              "Go Back",
              "Are you sure you want to go back?",
              [
                { text: "Cancel", style: "cancel", onPress: () => {} },
                {
                  text: "Yes",
                  onPress: () => {
                    try {
                      e.data.action;
                    } catch (error) {
                      // Fallback navigation if action fails
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "LoginPage" }],
                      });
                    }
                  },
                },
              ],
              { cancelable: false }
            );
          },
          state: (e) => {
            // Clean up any resources when screen state changes
            if (Platform.OS === "android") {
              global.gc && global.gc();
            }
          },
        },
      }}
    >
      {[
        { name: "LoginPage", component: LoginPage },
        { name: "SignUpPage", component: SignUpPage },
        { name: "ActorPage", component: ActorPage },
        { name: "GalleryPage", component: GalleryPage },
        { name: "Deco", component: DicoPage },
        { name: "Map", component: Map },
        { name: "OTPVerificationPage", component: OTPVerificationPage },
        { name: "ForgotPasswordEmail", component: ForgotPasswordEmail },
      ].map(({ name, component }) => (
        <UserProfileStack.Screen
          key={name}
          name={name}
          options={{
            gestureEnabled: false,
            freezeOnBlur: true,
          }}
        >
          {(props) => (
            <ScreenWrapper {...props}>
              {React.createElement(component, props)}
            </ScreenWrapper>
          )}
        </UserProfileStack.Screen>
      ))}
    </UserProfileStack.Navigator>
  );
};

export default UserProfileNavigator;
