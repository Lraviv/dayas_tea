/** App entry: brings up the local database (running the one-time catalog
 * seed on first launch), then renders the navigator inside the providers
 * gesture-handler, safe-area and react-navigation each need.
 *
 * (No UI-library provider here -- gluestack-ui was removed. Its
 * dependency tree pulled in a large, unrelated web design system
 * (@adobe/react-spectrum) that conflicted with React 18 and was breaking
 * `expo start`. Nothing in the app actually used its components yet, so
 * removing it was a clean, zero-cost fix -- the screens' custom
 * StyleSheet-based styling already stands on its own.) */

import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import { getDb } from "./src/db";
import { seedCatalogIfNeeded } from "./src/data/seedCatalog";
import { RootNavigator } from "./src/navigation/RootNavigator";

// Keep the native splash screen (see app.json's expo-splash-screen plugin
// config -- explicit light/dark background + logo, so it never falls back
// to a mismatched default) up through the async startup work below,
// instead of it hiding early and flashing to a blank spinner screen.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        await seedCatalogIfNeeded();
        setReady(true);
      } catch (err) {
        setError(String(err));
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Startup error: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: "#C62828", textAlign: "center" },
});
