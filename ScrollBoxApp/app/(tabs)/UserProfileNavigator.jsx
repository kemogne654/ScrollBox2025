import React, { useState, useEffect, useCallback } from "react";
import { BackHandler, Alert } from "react-native";
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

// Custom hook to prevent back button navigation
const usePreventGoingBack = (navigation) => {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          "Go Back",
          "Are you sure you want to go back?",
          [
            { text: "Cancel", style: "cancel", onPress: () => {} },
            {
              text: "Go Back",
              style: "destructive",
              onPress: () => navigation.goBack(),
            },
          ],
          { cancelable: false }
        );
        return true;
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () =>
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    }, [navigation])
  );
};

// Screen wrapper component to handle back navigation
const ScreenWrapper = ({ children, navigation }) => {
  usePreventGoingBack(navigation);
  return children;
};

export const UserProfileNavigator = () => {
  const [isConnected, setIsConnected] = useState(true);

  // Network connectivity monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (!isConnected) {
    return (
      <NetworkErrorModal
        visible={!isConnected}
        onRetry={async () => {
          const netInfo = await NetInfo.fetch();
          setIsConnected(netInfo.isConnected);
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
        animation: "slide_from_right",
        animationEnabled: true,
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
                      onPress: () => e.data.action,
                    },
                  ],
                  { cancelable: false }
                );
              },
            },
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
