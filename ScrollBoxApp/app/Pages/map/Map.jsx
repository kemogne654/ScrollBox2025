import React from "react";
import { StyleSheet, Text, View } from "react-native";

const Map = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>On progress .......</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
  },
  text: {
    fontSize: 24,
    color: "#333",
  },
});

export default Map;
