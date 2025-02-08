import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";

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
// Create a new stack navigator
const UserProfileStack = createNativeStackNavigator();

export const UserProfileNavigator = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isConnected) {
    return (
      <NetworkErrorModal
        visible={!isConnected}
        onRetry={() => NetInfo.fetch()}
      />
    );
  }

  return (
    <UserProfileStack.Navigator
      initialRouteName="LoginPage"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        animation: "slide_from_right",
        animationEnabled: true,
      }}
    >
      <UserProfileStack.Screen name="LoginPage" component={LoginPage} />
      <UserProfileStack.Screen name="SignUpPage" component={SignUpPage} />
      <UserProfileStack.Screen name="ActorPage" component={ActorPage} />
      <UserProfileStack.Screen name="GalleryPage" component={GalleryPage} />
      <UserProfileStack.Screen name="Deco" component={DicoPage} />
      <UserProfileStack.Screen name="Map" component={Map} />
      <UserProfileStack.Screen
        name="OTPVerificationPage"
        component={OTPVerificationPage}
      />

      <UserProfileStack.Screen
        name="ForgotPasswordEmail"
        component={ForgotPasswordEmail}
      />
    </UserProfileStack.Navigator>
  );
};

export default UserProfileNavigator;
