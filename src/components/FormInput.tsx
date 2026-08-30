/** Labeled text input used throughout the tea details form. Pass `rtl`
 * for Hebrew fields so both the label and typed text align right. */

import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { rtlTextStyle } from "../utils/rtl";

interface Props extends TextInputProps {
  label: string;
  rtl?: boolean;
}

export function FormInput({ label, rtl, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, rtl && rtlTextStyle]}>{label}</Text>
      <TextInput
        style={[styles.input, rtl && rtlTextStyle, style]}
        placeholderTextColor="#A0A0A5"
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5A5A60",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDDDE1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1C1C1E",
    backgroundColor: "#FFFFFF",
  },
});
