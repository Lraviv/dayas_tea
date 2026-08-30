/** Step 4 of the product flow: fill in the tea bag's details and save.
 * Doubles as the edit screen -- arriving with `teaId` loads the existing
 * tea instead of starting from a fresh photo. */

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as Crypto from "expo-crypto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import { FALLBACK_CATEGORY, type Tea, type TeaCategory } from "../types/tea";
import { createTea, deleteTea, getTea, listCategories, updateTea } from "../db";
import { deleteTeaPhoto, saveTeaPhoto } from "../data/photoStorage";
import { FormInput } from "../components/FormInput";
import { CategoryBadge } from "../components/CategoryBadge";
import { RatingStars } from "../components/RatingStars";

type Props = NativeStackScreenProps<RootStackParamList, "TeaForm">;

interface FormState {
  name: string;
  nameHe: string;
  brand: string;
  brandHe: string;
  series: string;
  seriesHe: string;
  category: TeaCategory;
  ingredients: string;
  ingredientsHe: string;
  description: string;
  descriptionHe: string;
  origin: string;
  notes: string;
  rating: number | null;
}

const BLANK_FORM: FormState = {
  name: "",
  nameHe: "",
  brand: "",
  brandHe: "",
  series: "",
  seriesHe: "",
  category: FALLBACK_CATEGORY,
  ingredients: "",
  ingredientsHe: "",
  description: "",
  descriptionHe: "",
  origin: "",
  notes: "",
  rating: null,
};

function teaToForm(tea: Tea): FormState {
  return {
    name: tea.name,
    nameHe: tea.nameHe ?? "",
    brand: tea.brand ?? "",
    brandHe: tea.brandHe ?? "",
    series: tea.series ?? "",
    seriesHe: tea.seriesHe ?? "",
    category: tea.category,
    ingredients: tea.ingredients ?? "",
    ingredientsHe: tea.ingredientsHe ?? "",
    description: tea.description ?? "",
    descriptionHe: tea.descriptionHe ?? "",
    origin: tea.origin ?? "",
    notes: tea.notes ?? "",
    rating: tea.rating,
  };
}

/** null-out anything the user left blank so it's stored as NULL, not "". */
function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function TeaFormScreen({ route, navigation }: Props) {
  const isEditMode = "teaId" in route.params && !!route.params.teaId;
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [existingTea, setExistingTea] = useState<Tea | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    listCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      const tea = await getTea(route.params.teaId!);
      if (tea) {
        setExistingTea(tea);
        setForm(teaToForm(tea));
      }
      setLoading(false);
    })();
  }, [isEditMode, route.params]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert("Name required", "Give this tea a name before saving.");
      return;
    }
    setSaving(true);
    try {
      if (isEditMode && existingTea) {
        await updateTea(existingTea.id, {
          name: form.name.trim(),
          nameHe: blankToNull(form.nameHe),
          brand: blankToNull(form.brand),
          brandHe: blankToNull(form.brandHe),
          series: blankToNull(form.series),
          seriesHe: blankToNull(form.seriesHe),
          category: form.category,
          ingredients: blankToNull(form.ingredients),
          ingredientsHe: blankToNull(form.ingredientsHe),
          description: blankToNull(form.description),
          descriptionHe: blankToNull(form.descriptionHe),
          origin: blankToNull(form.origin),
          notes: blankToNull(form.notes),
          rating: form.rating,
        });
      } else {
        const photoUri = route.params.photoUri!;
        const id = Crypto.randomUUID();
        const permanentUri = await saveTeaPhoto(photoUri, id);
        await createTea(
          {
            name: form.name.trim(),
            nameHe: blankToNull(form.nameHe),
            brand: blankToNull(form.brand),
            brandHe: blankToNull(form.brandHe),
            series: blankToNull(form.series),
            seriesHe: blankToNull(form.seriesHe),
            category: form.category,
            ingredients: blankToNull(form.ingredients),
            ingredientsHe: blankToNull(form.ingredientsHe),
            description: blankToNull(form.description),
            descriptionHe: blankToNull(form.descriptionHe),
            origin: blankToNull(form.origin),
            notes: blankToNull(form.notes),
            rating: form.rating,
            imageUri: permanentUri,
          },
          id
        );
      }
      navigation.popToTop();
    } catch (err) {
      Alert.alert("Couldn't save", String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!existingTea) return;
    Alert.alert("Delete this tea?", `"${existingTea.name}" will be removed from your collection.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTea(existingTea.id);
          await deleteTeaPhoto(existingTea.imageUri);
          navigation.popToTop();
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center} />;
  }

  const photoUri = existingTea?.imageUri ?? (route.params.photoUri as string | undefined);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" transition={150} />
        ) : null}

        <FormInput
          label="Name"
          placeholder="e.g. Bergamot Flavoured Green Tea"
          value={form.name}
          onChangeText={(v) => updateField("name", v)}
        />
        <FormInput
          label="Name (Hebrew)"
          placeholder="שם התה"
          rtl
          value={form.nameHe}
          onChangeText={(v) => updateField("nameHe", v)}
        />

        <FormInput
          label="Brand"
          placeholder="e.g. Wissotzky"
          value={form.brand}
          onChangeText={(v) => updateField("brand", v)}
        />
        <FormInput
          label="Brand (Hebrew)"
          rtl
          value={form.brandHe}
          onChangeText={(v) => updateField("brandHe", v)}
        />

        <FormInput
          label="Series"
          placeholder="e.g. Magic Garden"
          value={form.series}
          onChangeText={(v) => updateField("series", v)}
        />
        <FormInput
          label="Series (Hebrew)"
          rtl
          value={form.seriesHe}
          onChangeText={(v) => updateField("seriesHe", v)}
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {categories.map((category) => (
              <CategoryBadge
                key={category}
                category={category}
                selected={form.category === category}
                onPress={() => updateField("category", category)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Rating</Text>
          <RatingStars
            rating={form.rating}
            onChange={(r) => updateField("rating", r === form.rating ? null : r)}
            size={28}
          />
        </View>

        <FormInput
          label="Ingredients"
          multiline
          numberOfLines={2}
          value={form.ingredients}
          onChangeText={(v) => updateField("ingredients", v)}
        />
        <FormInput
          label="Ingredients (Hebrew)"
          rtl
          multiline
          numberOfLines={2}
          value={form.ingredientsHe}
          onChangeText={(v) => updateField("ingredientsHe", v)}
        />

        <FormInput
          label="Description"
          multiline
          numberOfLines={3}
          value={form.description}
          onChangeText={(v) => updateField("description", v)}
        />
        <FormInput
          label="Description (Hebrew)"
          rtl
          multiline
          numberOfLines={3}
          value={form.descriptionHe}
          onChangeText={(v) => updateField("descriptionHe", v)}
        />

        <FormInput
          label="Origin"
          placeholder="e.g. Sri Lanka"
          value={form.origin}
          onChangeText={(v) => updateField("origin", v)}
        />

        <FormInput
          label="Notes"
          placeholder="Your own tasting notes"
          multiline
          numberOfLines={3}
          value={form.notes}
          onChangeText={(v) => updateField("notes", v)}
        />

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>

        {isEditMode ? (
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Tea</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 14,
    marginBottom: 18,
    backgroundColor: "#F2EFE9",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5A5A60",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  saveButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#C62828",
    fontWeight: "600",
  },
});
