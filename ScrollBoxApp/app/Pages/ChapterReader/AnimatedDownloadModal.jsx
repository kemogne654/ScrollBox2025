import React from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

const AdvancedDownloadModal = ({ progress, stage }) => {
  const fractals = React.useRef(
    [...Array(50)].map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      scale: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  React.useEffect(() => {
    fractals.forEach((fractal, index) => {
      Animated.parallel([
        Animated.timing(fractal.scale, {
          toValue: 1,
          duration: 2000 + index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(fractal.rotate, {
          toValue: 1,
          duration: 3000 + index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(fractal.opacity, {
          toValue: 0.5,
          duration: 2500 + index * 75,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      {fractals.map((fractal, index) => (
        <Animated.View
          key={index}
          style={[
            styles.fractal,
            {
              left: fractal.x,
              top: fractal.y,
              transform: [
                {
                  scale: fractal.scale.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.random() * 2],
                  }),
                },
                {
                  rotate: fractal.rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: fractal.opacity,
            },
          ]}
        />
      ))}

      <View style={styles.content}>
        <Animated.Text style={styles.stageText}>{stage}</Animated.Text>

        <View style={styles.progressContainer}>
          <Animated.View
            style={[styles.progressBar, { width: `${progress}%` }]}
          />
        </View>

        <Text style={styles.progressText}>{`${Math.round(progress)}%`}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030308",
    overflow: "hidden",
  },
  fractal: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "rgba(239, 127, 26, 0.3)", // Changed to match #EF7F1A
    borderRadius: 5,
    shadowColor: "#EF7F1A", // Updated shadow color
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.7,
  },
  content: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  stageText: {
    color: "#EF7F1A", // Changed to match the app's primary color
    fontSize: 22,
    marginBottom: 20,
    letterSpacing: 2,
  },
  progressContainer: {
    width: "80%",
    height: 10,
    backgroundColor: "rgba(239, 127, 26, 0.1)", // Lighter shade of orange
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#EF7F1A",
    borderRadius: 5,
  },
  progressText: {
    color: "#EF7F1A",
    fontSize: 24,
    marginTop: 15,
    fontWeight: "bold",
  },
});

export default AdvancedDownloadModal;
