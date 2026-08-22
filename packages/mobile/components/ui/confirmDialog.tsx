/**
 * ConfirmDialog Component
 * Cross-platform confirmation dialog (native + web)
 *
 * Replaces Alert.alert for confirmations, because react-native-web
 * implements Alert.alert as a no-op (no dialog shown, no callbacks fired).
 *
 * Rules:
 * - Use Modal so it renders correctly on web and native
 * - Keep the same user-facing text as the Alert.alert it replaces
 * - Use accessible colors from constants
 * - Use borderCurve: 'continuous'
 */

import { Modal, View, Text, Pressable } from "react-native";
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
} from "@/constants/colors";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: Background.surface,
            borderRadius: 12,
            borderCurve: "continuous",
            padding: 20,
            gap: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: TextColors.primary,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: TextColors.secondary,
              lineHeight: 21,
            }}
          >
            {message}
          </Text>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: Border.default,
                backgroundColor: pressed
                  ? Interactive.secondary.pressed
                  : Background.surface,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  color: TextColors.secondary,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                borderCurve: "continuous",
                backgroundColor: pressed
                  ? Interactive.primary.pressed
                  : Interactive.primary.default,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  color: Interactive.primary.text,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
