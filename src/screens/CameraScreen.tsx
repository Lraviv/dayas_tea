/** Step 2-3 of the product flow: tap the '+' on the library, take a
 * photo of a tea bag (or pick one from the photo library), then hand the
 * photo off to the details form. */

import { useRef, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Camera">;

export function CameraScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function handleCapture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        navigation.replace("TeaForm", { photoUri: photo.uri });
      }
    } finally {
      setCapturing(false);
    }
  }

  async function handlePickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      navigation.replace("TeaForm", { photoUri: result.assets[0].uri });
    }
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    // Once permission has been denied and the OS won't ask again,
    // requestPermission() silently does nothing on a second tap -- the
    // only way forward is the app's own settings page.
    const permanentlyDenied = !permission.canAskAgain;

    return (
      <View style={styles.center}>
        <MaterialIcons name="camera-alt" size={40} color="#8A8A8E" />
        <Text style={styles.permissionText}>
          {permanentlyDenied
            ? "Camera access is turned off for Daya's Tea. Turn it on in Settings to photograph your tea bags."
            : "Daya's Tea needs camera access to photograph your tea bags."}
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={permanentlyDenied ? () => Linking.openSettings() : requestPermission}
        >
          <Text style={styles.primaryButtonText}>
            {permanentlyDenied ? "Open Settings" : "Allow Camera Access"}
          </Text>
        </Pressable>
        <Pressable onPress={handlePickFromLibrary}>
          <Text style={styles.linkText}>Choose a photo instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

      <View style={[styles.controls, { bottom: 40 + insets.bottom }]}>
        <Pressable
          style={styles.secondaryCircle}
          onPress={handlePickFromLibrary}
          accessibilityLabel="Choose photo from library"
        >
          <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={styles.shutter}
          onPress={handleCapture}
          disabled={capturing}
          accessibilityLabel="Take photo"
        >
          <View style={styles.shutterInner} />
        </Pressable>

        <Pressable
          style={styles.secondaryCircle}
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          accessibilityLabel="Flip camera"
        >
          <MaterialIcons name="flip-camera-ios" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
  secondaryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  permissionText: {
    textAlign: "center",
    color: "#3A3A3C",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  linkText: {
    color: "#2E7D32",
    fontWeight: "500",
  },
});
