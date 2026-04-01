/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 *
 * Features:
 * - Catches React rendering errors
 * - Shows user-friendly error message
 * - Retry button to attempt recovery
 * - Logs errors for debugging
 * - Accessible error display
 *
 * Rules:
 * - Use React.Component (not functional component)
 * - Log errors in __DEV__ mode
 * - Never show stack traces to users
 * - Provide clear recovery options
 */

import React, { Component, ReactNode } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import {
  Background,
  Text as TextColors,
  Interactive,
  Feedback,
} from "@/constants/colors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details in development
    if (__DEV__) {
      console.error("ErrorBoundary caught an error:", error);
      console.error("Component stack:", errorInfo.componentStack);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to error tracking service (Sentry, BugSnag, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: Background.primary,
            padding: 16,
            justifyContent: "center",
            alignItems: "center",
          }}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 16,
              gap: 24,
            }}
          >
            {/* Error Icon */}
            <Text
              style={{
                fontSize: 64,
                marginBottom: 8,
              }}
              accessibilityLabel="Error icon"
            >
              ⚠️
            </Text>

            {/* Error Title */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "600",
                color: TextColors.primary,
                textAlign: "center",
              }}
              accessibilityRole="header"
            >
              Something went wrong
            </Text>

            {/* Error Description */}
            <Text
              style={{
                fontSize: 16,
                color: TextColors.secondary,
                textAlign: "center",
                lineHeight: 24,
                maxWidth: 400,
              }}
              selectable
            >
              The app encountered an unexpected error. This has been logged and
              we&apos;ll look into it.
            </Text>

            {/* Error Details (only in DEV) */}
            {__DEV__ && this.state.error && (
              <View
                style={{
                  backgroundColor: Feedback.error.background,
                  borderWidth: 1,
                  borderColor: Feedback.error.border,
                  borderRadius: 8,
                  borderCurve: "continuous",
                  padding: 12,
                  width: "100%",
                  maxWidth: 500,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: Feedback.error.text,
                    marginBottom: 8,
                  }}
                >
                  🐛 Debug Info (DEV only)
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: Feedback.error.text,
                    fontFamily: "monospace",
                  }}
                  selectable
                >
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: Feedback.error.text,
                      fontFamily: "monospace",
                      marginTop: 8,
                    }}
                    selectable
                    numberOfLines={10}
                  >
                    {this.state.errorInfo.componentStack.trim()}
                  </Text>
                )}
              </View>
            )}

            {/* Retry Button */}
            <Pressable
              onPress={this.handleReset}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityHint="Attempts to reload the app and recover from the error"
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? Interactive.primary.pressed
                  : Interactive.primary.default,
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                borderCurve: "continuous",
                marginTop: 8,
              })}
            >
              <Text
                style={{
                  color: Interactive.primary.text,
                  fontSize: 17,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Try Again
              </Text>
            </Pressable>

            {/* Help Text */}
            <Text
              style={{
                fontSize: 14,
                color: TextColors.tertiary,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              If the problem persists, try restarting the app.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
