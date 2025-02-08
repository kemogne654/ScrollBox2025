import React from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";

export default function Loader({ visible = false }) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <LottieView
        source={require("../../ScrollBoxApp/assets/jsons/Loader.json")} 
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 10, 
  },
  animation: {
    width: 150, 
    height: 150,
  },
});
