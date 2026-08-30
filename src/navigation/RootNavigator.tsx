import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "./types";
import { LibraryScreen } from "../screens/LibraryScreen";
import { CameraScreen } from "../screens/CameraScreen";
import { TeaFormScreen } from "../screens/TeaFormScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { CategoriesScreen } from "../screens/CategoriesScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="TeaForm"
        component={TeaFormScreen}
        options={{ headerShown: true, title: "Tea Details", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ headerShown: true, title: "Statistics", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: "Settings", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ headerShown: true, title: "Manage Categories", headerBackTitle: "Back" }}
      />
    </Stack.Navigator>
  );
}
