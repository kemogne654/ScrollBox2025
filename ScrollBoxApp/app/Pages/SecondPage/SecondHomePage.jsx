import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  TouchableOpacity,
  Text,
  Animated,
  Image,
} from "react-native";
import { Video, AVPlaybackStatus } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation, useIsFocused } from "@react-navigation/native";

const SecondHomePage = () => {
  const videoRef = useRef(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  const voirPersonnagesOpacity = useRef(new Animated.Value(0)).current;
  const voirMapOpacity = useRef(new Animated.Value(0)).current;
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    };

    lockOrientation();

    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const setupVideoPlayback = async () => {
      if (videoRef.current && isFocused && !hasPlayedOnce) {
        try {
          await videoRef.current.loadAsync(
            require("../../../assets/videos/Anim ScrolBox Kijins Large Beta.mp4"),
            {},
            false
          );

          videoRef.current.setOnPlaybackStatusUpdate(
            async (status: AVPlaybackStatus) => {
              if (status.isPlaying) {
                const currentTime = status.positionMillis / 1000;

                if (currentTime >= 55 && currentTime <= 62) {
                  Animated.timing(voirPersonnagesOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                  }).start();
                } else if (currentTime > 62) {
                  Animated.timing(voirPersonnagesOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                  }).start();
                }

                if (currentTime >= 75 && currentTime <= 86) {
                  Animated.timing(voirMapOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                  }).start();
                } else if (currentTime > 86) {
                  Animated.timing(voirMapOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                  }).start();
                }

                if (currentTime >= 94) {
                  setShowImage(true);
                }
              }

              if (status.didJustFinish) {
                await videoRef.current.stopAsync();
                setHasPlayedOnce(true);

                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Home");
                }
              }
            }
          );

          if (isMounted) {
            await videoRef.current.playAsync();
          }
        } catch (error) {
          console.error("Error setting up video:", error);
        }
      }
    };

    setupVideoPlayback();

    return () => {
      isMounted = false;
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, [isFocused, navigation, hasPlayedOnce]);

  useEffect(() => {
    if (!isFocused && videoRef.current) {
      videoRef.current.stopAsync();
    }
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Video
        ref={videoRef}
        style={StyleSheet.absoluteFillObject}
        useNativeControls={false}
        resizeMode="cover"
        isLooping={false}
        shouldPlay={false}
      />
      <Animated.View
        style={[styles.buttonContainer, { opacity: voirPersonnagesOpacity }]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("UserProfile", { screen: "ActorPage" });
            }
          }}
        >
          <Text style={styles.buttonText}>Voir les personnages</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[styles.buttonContainer, { opacity: voirMapOpacity }]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("UserProfile", { screen: "Map" });
            }
          }}
        >
          <Text style={styles.buttonText}>Voir la map</Text>
        </TouchableOpacity>
      </Animated.View>

      {showImage && (
        <View style={styles.imageContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate("ChapterScreen")}
          >
            <Image
              source={require("../../../assets/images/05.png")}
              style={styles.image}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  buttonContainer: {
    position: "absolute",
    alignSelf: "center",
    bottom: 100,
  },
  button: {
    borderColor: "orange",
    borderWidth: 2,
    borderRadius: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonText: {
    color: "orange",
    fontSize: 16,
    fontWeight: "bold",
  },
  imageContainer: {
    position: "absolute",
    alignSelf: "center",
    bottom: 50,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
});

export default SecondHomePage;
